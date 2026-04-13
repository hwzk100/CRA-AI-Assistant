import type { GatewayRequest, GatewayResponse } from '../../../shared/types/gateway';
import { SmartRouter } from './router';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GatewayAgent');

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const MIN_CALL_INTERVAL_MS = 1000; // Minimum gap between consecutive API calls

let router: SmartRouter | null = null;
let lastCallTime = 0;

function getRouter(): SmartRouter {
  if (!router) {
    router = new SmartRouter();
  }
  return router;
}

export function resetRouter(): void {
  router = null;
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

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { status?: number } };
    return axiosErr.response?.status === 429;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('429');
}

export async function invokeGateway(request: GatewayRequest): Promise<GatewayResponse> {
  const activeRouter = getRouter();
  const { adapter, model } = activeRouter.route(request);

  // Enforce minimum interval between consecutive calls to avoid rate limits
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (lastCallTime > 0 && elapsed < MIN_CALL_INTERVAL_MS) {
    await sleep(MIN_CALL_INTERVAL_MS - elapsed);
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
      logger.info('Gateway response received', {
        model: response.model,
        tokens: response.usage.totalTokens,
        contentLength: response.content?.length || 0,
      });
      return response;
    } catch (error: unknown) {
      lastError = error;
      if (isRateLimitError(error) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(delay);
        continue;
      }
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error('Gateway invocation failed', { error: errMsg });
      throw new Error(`AI API call failed: ${errMsg}`);
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`AI API call failed after ${MAX_RETRIES} retries: ${errMsg}`);
}
