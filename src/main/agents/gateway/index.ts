import type { GatewayRequest, GatewayResponse } from '../../../shared/types/gateway';
import { SmartRouter } from './router';
import { createLogger } from '../../utils/logger';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

const logger = createLogger('GatewayAgent');

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 10000;               // 超时/网络错误退避基数
const RATE_LIMIT_BASE_DELAY_MS = 3000;     // 429 退避基数
const RATE_LIMIT_MAX_DELAY_MS = 30000;     // 429 退避上限
const MIN_CALL_INTERVAL_MS = 1500; // Minimum gap between consecutive API calls
const RATE_LIMIT_RPM = 5; // Max calls per sliding window
const RATE_WINDOW_MS = 60_000; // 60-second sliding window

let router: SmartRouter | null = null;
let lastCallTime = 0;
let callTimestamps: number[] = []; // Sliding window tracker

function getRouter(): SmartRouter {
  if (!router) {
    router = new SmartRouter();
  }
  return router;
}

export function resetRouter(): void {
  router = null;
  callTimestamps = [];
  lastCallTime = 0;
}

export function getChunkTokens(): number {
  return getRouter().getChunkTokens();
}

export function getMaxImagesPerCall(): number {
  return getRouter().getMaxImagesPerCall();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stripMarkdownCodeBlocks(text: string): string {
  const match = text.match(/```(?:\w*)\s*\n?([\s\S]*?)\n?\s*```/);
  return match ? match[1].trim() : text.trim();
}


function formatPromptForLog(request: GatewayRequest): string {
  if (request.images?.length) {
    const summary = `[Image: ${request.images.length} images, mimeType=${request.images[0]?.mimeType || 'unknown'}]`;
    return summary + '\n' + (request.prompt || '');
  }
  if (request.imageBase64) {
    const summary = `[Image: 1 image, length=${request.imageBase64.length}]`;
    return summary + '\n' + (request.prompt || '');
  }
  return request.prompt || '';
}

function appendApiLog(entry: string): void {
  try {
    const userDataPath = app.getPath('userData');
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const logFile = path.join(userDataPath, `api-calls-${today}.log`);
    fs.appendFileSync(logFile, entry + '\n', 'utf-8');
    logger.info(`API log written to ${logFile}`);
  } catch (err) {
    logger.error('Failed to write API log:', err);
  }
}

function extractErrorResponse(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { status?: number; statusText?: string; data?: unknown; headers?: Record<string, string> } };
    if (axiosErr.response) {
      const { status, statusText, data, headers } = axiosErr.response;
      const parts = [`HTTP ${status} ${statusText || ''}`.trim()];
      if (data) parts.push(JSON.stringify(data, null, 2));
      const remaining = headers?.['x-ratelimit-remaining'];
      const resetAt = headers?.['x-ratelimit-reset'];
      if (remaining !== undefined || resetAt !== undefined) {
        parts.push(`[Rate Limit] remaining=${remaining ?? '?'} reset=${resetAt ?? '?'}`);
      }
      return parts.join('\n');
    }
  }
  return error instanceof Error ? error.message : String(error);
}

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { status?: number } };
    return axiosErr.response?.status === 429;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('429');
}

function isRetryableError(error: unknown): boolean {
  if (isRateLimitError(error)) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('timeout') || msg.includes('ECONNABORTED') || msg.includes('ECONNRESET');
}

function getRetryAfterMs(error: unknown): number | null {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { headers?: Record<string, string> } };
    const retryAfter = axiosErr.response?.headers?.['retry-after'];
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
  }
  return null;
}

export async function invokeGateway(request: GatewayRequest): Promise<GatewayResponse> {
  const activeRouter = getRouter();
  const { adapter, model } = activeRouter.route(request);

  // Enforce minimum interval between consecutive calls
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (lastCallTime > 0 && elapsed < MIN_CALL_INTERVAL_MS) {
    await sleep(MIN_CALL_INTERVAL_MS - elapsed);
  }

  // Sliding window rate limiter: wait if we've hit the RPM cap
  const windowStart = Date.now() - RATE_WINDOW_MS;
  callTimestamps = callTimestamps.filter(ts => ts > windowStart);
  if (callTimestamps.length >= RATE_LIMIT_RPM) {
    const oldestInWindow = callTimestamps[0];
    const waitMs = oldestInWindow + RATE_WINDOW_MS - Date.now() + 500; // +500ms buffer
    if (waitMs > 0) {
      logger.info(`Rate limiter: ${callTimestamps.length} calls in last 60s, waiting ${waitMs}ms`);
      await sleep(waitMs);
    }
    // Re-clean after waiting
    const newWindowStart = Date.now() - RATE_WINDOW_MS;
    callTimestamps = callTimestamps.filter(ts => ts > newWindowStart);
  }

  lastCallTime = Date.now();

  logger.info('Invoking gateway', {
    model,
    contentType: request.contentType,
    hasImages: !!(request.images?.length),
    hasImage: !!request.imageBase64,
    promptLength: request.prompt?.length || 0,
  });

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await adapter.invoke(request);
      const cleanedContent = stripMarkdownCodeBlocks(response.content);
      logger.info('Gateway response received', {
        model: response.model,
        tokens: response.usage.totalTokens,
        contentLength: cleanedContent?.length || 0,
      });

      // Write API call log
      const timestamp = new Date().toISOString();
      const logEntry = [
        `========== ${timestamp} ==========`,
        `[Request] Model: ${model} | Type: ${request.contentType || 'text'}`,
        `[System Prompt]`,
        request.systemPrompt || '',
        `[User Prompt]`,
        formatPromptForLog(request),
        `[Response] Tokens: ${response.usage?.promptTokens || '?'}/${response.usage?.completionTokens || '?'}/${response.usage?.totalTokens || '?'}`,
        cleanedContent || '',
        `[Raw Response]`,
        response.rawResponse ? JSON.stringify(response.rawResponse, null, 2) : '(none)',
        '',
      ].join('\n');
      appendApiLog(logEntry);

      callTimestamps.push(lastCallTime);
      return { ...response, content: cleanedContent };
    } catch (error: unknown) {
      lastError = error;
      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        const retryAfter = getRetryAfterMs(error);
        let delay: number;
        if (isRateLimitError(error)) {
          delay = retryAfter ?? Math.min(RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt), RATE_LIMIT_MAX_DELAY_MS);
        } else {
          delay = BASE_DELAY_MS * Math.pow(2, attempt);
        }
        const reason = isRateLimitError(error) ? 'Rate limited (429)' : 'Timeout/network error';
        logger.warn(`${reason}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        appendApiLog([
          `========== ${new Date().toISOString()} ==========`,
          `[RETRY] Model: ${model} | ${reason} | attempt ${attempt + 1}/${MAX_RETRIES} | waiting ${delay}ms`,
          `[Error Response]`,
          extractErrorResponse(error),
          `[System Prompt]`,
          request.systemPrompt || '',
          `[User Prompt]`,
          formatPromptForLog(request),
          '',
        ].join('\n'));
        await sleep(delay);
        continue;
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Gateway invocation failed', { error: errMsg });
      appendApiLog([
        `========== ${new Date().toISOString()} ==========`,
        `[ERROR] Model: ${model} | ${errMsg}`,
        `[Error Response]`,
        extractErrorResponse(error),
        `[System Prompt]`,
        request.systemPrompt || '',
        `[User Prompt]`,
        formatPromptForLog(request),
        '',
      ].join('\n'));
      if (isRetryableError(error)) {
        throw new Error(`AI API call failed after ${MAX_RETRIES} retries: ${errMsg}`);
      }
      throw new Error(`AI API call failed: ${errMsg}`);
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  appendApiLog([
    `========== ${new Date().toISOString()} ==========`,
    `[FAILED] Model: ${model} | All ${MAX_RETRIES} retries exhausted`,
    `[Error Response]`,
    extractErrorResponse(lastError),
    `[System Prompt]`,
    request.systemPrompt || '',
    `[User Prompt]`,
    formatPromptForLog(request),
    '',
  ].join('\n'));
  throw new Error(`AI API call failed after ${MAX_RETRIES} retries: ${errMsg}`);
}
