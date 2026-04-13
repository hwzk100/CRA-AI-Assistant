import axios from 'axios';
import { BaseAdapter } from './base-adapter';
import type { GatewayResponse, AdapterConfig } from '../../../../shared/types/gateway';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('OpenAIAdapter');

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class OpenAIAdapter extends BaseAdapter {
  readonly name = 'openai';
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    super();
    this.config = config;
  }

  async chat(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    logger.info(`Sending text request to ${this.config.textModel}`);

    const response = await axios.post<OpenAIResponse>(
      this.config.apiEndpoint,
      {
        model: this.config.textModel,
        messages,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 4096,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        timeout: 120000,
      }
    );

    const data = response.data;
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || this.config.textModel,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  async chatWithImage(
    prompt: string,
    imageBase64: string,
    imageMimeType: string,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse> {
    return this.chatWithImages(
      prompt,
      [{ base64: imageBase64, mimeType: imageMimeType }],
      systemPrompt,
      options
    );
  }

  async chatWithImages(
    prompt: string,
    images: Array<{ base64: string; mimeType: string }>,
    systemPrompt?: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<GatewayResponse> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    const contentParts: ContentPart[] = [
      ...images.map(img => ({
        type: 'image_url' as const,
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
      })),
      { type: 'text' as const, text: prompt },
    ];

    messages.push({ role: 'user', content: contentParts });

    logger.info(`Sending multi-image request (${images.length} images) to ${this.config.visionModel}`);

    const response = await axios.post<OpenAIResponse>(
      this.config.apiEndpoint,
      {
        model: this.config.visionModel,
        messages,
        temperature: options?.temperature ?? 0.1,
        max_tokens: options?.maxTokens ?? 4096,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        timeout: 180000,
      }
    );

    const data = response.data;
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || this.config.visionModel,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }
}
