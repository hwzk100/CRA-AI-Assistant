import type { GatewayRequest, GatewayResponse } from '../../../shared/types/gateway';
import { SmartRouter } from './router';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GatewayAgent');

let router: SmartRouter | null = null;

function getRouter(): SmartRouter {
  if (!router) {
    router = new SmartRouter();
  }
  return router;
}

export function resetRouter(): void {
  router = null;
}

export async function invokeGateway(request: GatewayRequest): Promise<GatewayResponse> {
  const activeRouter = getRouter();
  const { adapter } = activeRouter.route(request);

  logger.info('Invoking gateway', {
    contentType: request.contentType,
    hasImage: !!request.imageBase64,
  });

  try {
    const response = await adapter.invoke(request);
    logger.info('Gateway response received', {
      model: response.model,
      tokens: response.usage.totalTokens,
    });
    return response;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error('Gateway invocation failed', { error: errMsg });
    throw new Error(`AI API call failed: ${errMsg}`);
  }
}
