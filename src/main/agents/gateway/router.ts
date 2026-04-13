import type { GatewayRequest, ContentType } from '../../../shared/types/gateway';
import { BaseAdapter } from './adapters/base-adapter';
import { ZhipuAdapter } from './adapters/zhipu-adapter';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { getConfig } from '../../config';
import type { AppConfig } from '../../../shared/types/config';
import { MODEL_SPECS, DEFAULT_MODEL_SPEC } from '../../../shared/constants/models';
import { createLogger } from '../../utils/logger';

const logger = createLogger('SmartRouter');

export interface RouteResult {
  adapter: BaseAdapter;
  model: string;
}

export class SmartRouter {
  private zhipuAdapter: ZhipuAdapter;
  private openaiAdapter: OpenAIAdapter;

  constructor() {
    const config = getConfig();
    this.zhipuAdapter = new ZhipuAdapter({
      apiKey: config.apiKey,
      apiEndpoint: config.apiEndpoint,
      textModel: config.textModel,
      visionModel: config.visionModel,
    });

    this.openaiAdapter = new OpenAIAdapter({
      apiKey: config.openaiApiKey || '',
      apiEndpoint: config.openaiApiEndpoint || 'https://api.openai.com/v1/chat/completions',
      textModel: config.openaiModel || 'gpt-4o-mini',
      visionModel: config.openaiModel || 'gpt-4o-mini',
    });
  }

  route(request: GatewayRequest): RouteResult {
    const config = getConfig();

    // Determine adapter based on provider
    const adapter = config.provider === 'openai' ? this.openaiAdapter : this.zhipuAdapter;

    // Determine model based on content type
    let model: string;
    if (request.contentType === 'image') {
      model = config.provider === 'openai'
        ? (config.openaiModel || 'gpt-4o')
        : config.visionModel;
      logger.info(`Routing image request to ${model}`);
    } else {
      model = config.provider === 'openai'
        ? (config.openaiModel || 'gpt-4o-mini')
        : config.textModel;
      logger.info(`Routing text request to ${model}`);
    }

    return { adapter, model };
  }

  getChunkTokens(): number {
    const config = getConfig();
    const model = config.textModel;
    const spec = MODEL_SPECS[model] ?? DEFAULT_MODEL_SPEC;
    // Use 60% of context window, but cap at 6000 tokens to match original
    // behavior and avoid rate-limit errors on strict API plans.
    return Math.min(Math.floor(spec.contextWindow * 0.6), 6000);
  }

  getMaxImagesPerCall(): number {
    const config = getConfig();
    const model = config.visionModel;
    const spec = MODEL_SPECS[model] ?? DEFAULT_MODEL_SPEC;
    return spec.maxImagesPerCall;
  }
}
