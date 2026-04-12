export interface AppConfig {
  apiEndpoint: string;
  apiKey: string;
  textModel: string;
  visionModel: string;

  // Optional OpenAI-compatible
  openaiApiEndpoint?: string;
  openaiApiKey?: string;
  openaiModel?: string;

  // Provider selection
  provider: 'zhipu' | 'openai';
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  model?: string;
  latency?: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  apiEndpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  apiKey: '',
  textModel: 'glm-5.1',
  visionModel: 'glm-4.6v-flash',
  provider: 'zhipu',
};
