import type { GatewayRequest, GatewayResponse } from '../../../../shared/types/gateway';

export abstract class BaseAdapter {
  abstract readonly name: string;

  abstract chat(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse>;

  abstract chatWithImage(
    prompt: string,
    imageBase64: string,
    imageMimeType: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse>;

  abstract chatWithImages(
    prompt: string,
    images: Array<{ base64: string; mimeType: string }>,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse>;

  async invoke(request: GatewayRequest): Promise<GatewayResponse> {
    const opts = { temperature: request.temperature, maxTokens: request.maxTokens };

    if (request.images && request.images.length > 0) {
      return this.chatWithImages(
        request.prompt,
        request.images,
        request.systemPrompt,
        opts
      );
    }

    if (request.contentType === 'image' && request.imageBase64) {
      return this.chatWithImage(
        request.prompt,
        request.imageBase64,
        request.imageMimeType || 'image/png',
        request.systemPrompt,
        opts
      );
    }

    return this.chat(request.prompt, request.systemPrompt, opts);
  }
}
