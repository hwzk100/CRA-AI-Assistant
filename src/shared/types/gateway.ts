export type ContentType = 'text' | 'image';

export interface GatewayRequest {
  prompt: string;
  systemPrompt?: string;
  contentType: ContentType;
  imageBase64?: string; // base64 encoded image
  imageMimeType?: string; // e.g., 'image/png'
  temperature?: number;
  maxTokens?: number;
}

export interface GatewayResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AdapterConfig {
  apiKey: string;
  apiEndpoint: string;
  textModel: string;
  visionModel: string;
}
