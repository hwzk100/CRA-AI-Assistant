// Model ID constants
export const MODELS = {
  // Zhipu AI models
  GLM_5_1: 'glm-5.1',
  GLM_4_7_FLASH: 'glm-4.7-flash',
  GLM_4V_FLASH: 'glm-4.6v-flash',

  // OpenAI models (compatible)
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
} as const;

export const DEFAULT_ENDPOINTS = {
  ZHIPU: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  OPENAI: 'https://api.openai.com/v1/chat/completions',
} as const;

export interface ModelSpec {
  contextWindow: number;      // Total context window in tokens
  maxImagesPerCall: number;   // Max images per single API call
  maxOutputTokens: number;    // Max tokens for model output (reasoning + response)
}

export const MODEL_SPECS: Record<string, ModelSpec> = {
  'glm-5.1':        { contextWindow: 128000, maxImagesPerCall: 1, maxOutputTokens: 4096 },
  'glm-4.7-flash':  { contextWindow: 128000, maxImagesPerCall: 1, maxOutputTokens: 16384 },
  'glm-4.6v-flash': { contextWindow: 8192,   maxImagesPerCall: 1, maxOutputTokens: 4096 },
  'glm-4v-plus':    { contextWindow: 128000, maxImagesPerCall: 5, maxOutputTokens: 4096 },
  'gpt-4o':         { contextWindow: 128000, maxImagesPerCall: 10, maxOutputTokens: 4096 },
  'gpt-4o-mini':    { contextWindow: 128000, maxImagesPerCall: 10, maxOutputTokens: 4096 },
};

export const DEFAULT_MODEL_SPEC: ModelSpec = { contextWindow: 8192, maxImagesPerCall: 1, maxOutputTokens: 4096 };

export const DEFAULT_TEXT_MODEL = MODELS.GLM_4_7_FLASH;
export const DEFAULT_VISION_MODEL = MODELS.GLM_4V_FLASH;
