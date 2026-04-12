// Model ID constants
export const MODELS = {
  // Zhipu AI models
  GLM_5_1: 'glm-5.1',
  GLM_4V_FLASH: 'glm-4.6v-flash',

  // OpenAI models (compatible)
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
} as const;

export const DEFAULT_ENDPOINTS = {
  ZHIPU: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  OPENAI: 'https://api.openai.com/v1/chat/completions',
} as const;

export const DEFAULT_TEXT_MODEL = MODELS.GLM_5_1;
export const DEFAULT_VISION_MODEL = MODELS.GLM_4V_FLASH;
