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

  async invoke(request: GatewayRequest): Promise<GatewayResponse> {
    if (request.contentType === 'image' && request.imageBase64) {
      return this.chatWithImage(
        request.prompt,
        request.imageBase64,
        request.imageMimeType || 'image/png',
        request.systemPrompt,
        { temperature: request.temperature, maxTokens: request.maxTokens }
      );
    }
    return this.chat(request.prompt, request.systemPrompt, {
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
  }
}
