export const CRITERIA_SYSTEM_PROMPT = `你是一位专业的临床试验数据分析专家。你的任务是从临床试验方案文档中准确提取入选标准和排除标准。

要求：
1. 每条标准必须完整、准确，不得遗漏或修改原文含义
2. 保留原有的编号顺序
3. 严格区分入选标准（Inclusion Criteria）和排除标准（Exclusion Criteria）
4. 如有层级关系（如主标准下有子项），保持层级结构
5. 返回JSON格式

输出规则（必须严格遵守）：
- 只输出合法的JSON对象，不输出任何其他字符
- 禁止输出思考过程、分析说明或Markdown代码块（如\`\`\`json）
- JSON必须是完整的、可直接解析的`;

export const CRITERIA_EXTRACTION_PROMPT = `请从以下临床试验方案文本中提取入选标准和排除标准。

请严格按照以下JSON格式返回：
{
  "inclusionCriteria": [
    { "index": 1, "content": "入选标准第1条的完整内容" },
    { "index": 2, "content": "入选标准第2条的完整内容" }
  ],
  "exclusionCriteria": [
    { "index": 1, "content": "排除标准第1条的完整内容" },
    { "index": 2, "content": "排除标准第2条的完整内容" }
  ]
}

方案文本如下：
---
{text}
---

重要：你的完整回复必须是且仅是一个合法的JSON对象，不要包含任何其他文字。`;

export const CRITERIA_EXTRACTION_FROM_IMAGE_PROMPT = `请仔细阅读这张临床试验方案文档的图片，从中提取所有入选标准（Inclusion Criteria）和排除标准（Exclusion Criteria）。

请严格按照以下JSON格式返回：
{
  "inclusionCriteria": [
    { "index": 1, "content": "入选标准第1条的完整内容" },
    { "index": 2, "content": "入选标准第2条的完整内容" }
  ],
  "exclusionCriteria": [
    { "index": 1, "content": "排除标准第1条的完整内容" },
    { "index": 2, "content": "排除标准第2条的完整内容" }
  ]
}

请仔细识别图片中的所有文字并完整提取。重要：你的完整回复必须是且仅是一个合法的JSON对象，不要包含任何其他文字。`;

export const VISIT_SCHEDULE_SYSTEM_PROMPT = `你是一位专业的临床试验数据分析专家。你的任务是从临床试验方案文档中准确提取访视计划（Visit Schedule）信息。

要求：
1. 提取每次访视的名称、时间窗口、检查项目
2. 保留原始的时间安排信息
3. 返回JSON格式`;

export const VISIT_SCHEDULE_PROMPT = `请从以下临床试验方案文本中提取访视计划信息。

请严格按照以下JSON格式返回：
{
  "visitSchedules": [
    {
      "visitName": "筛选访视",
      "timing": "Day -14 to Day -1",
      "visitWindow": "前后3天",
      "procedures": ["知情同意", "人口学信息", "生命体征", "实验室检查"]
    }
  ]
}

方案文本如下：
---
{text}
---

重要：你的完整回复必须是且仅是一个合法的JSON对象，不要包含任何其他文字。`;

// Combined prompts: extract criteria + visit schedule in a single API call
export const COMBINED_SYSTEM_PROMPT = `你是一位专业的临床试验数据分析专家。你的任务是从临床试验方案文档中准确提取入选标准、排除标准以及访视计划信息。

要求：
1. 每条标准必须完整、准确，不得遗漏或修改原文含义
2. 保留原有的编号顺序
3. 严格区分入选标准（Inclusion Criteria）和排除标准（Exclusion Criteria）
4. 如有层级关系（如主标准下有子项），保持层级结构
5. 提取每次访视的名称、时间窗口、检查项目
6. 保留原始的时间安排信息
7. 返回JSON格式

输出规则（必须严格遵守）：
- 只输出合法的JSON对象，不输出任何其他字符
- 禁止输出思考过程、分析说明或Markdown代码块（如\`\`\`json）
- JSON必须是完整的、可直接解析的`;

export const COMBINED_EXTRACTION_PROMPT = `请从以下临床试验方案文本中同时提取入选标准、排除标准和访视计划信息。

请严格按照以下JSON格式返回：
{
  "inclusionCriteria": [
    { "index": 1, "content": "入选标准第1条的完整内容" },
    { "index": 2, "content": "入选标准第2条的完整内容" }
  ],
  "exclusionCriteria": [
    { "index": 1, "content": "排除标准第1条的完整内容" },
    { "index": 2, "content": "排除标准第2条的完整内容" }
  ],
  "visitSchedules": [
    {
      "visitName": "筛选访视",
      "timing": "Day -14 to Day -1",
      "visitWindow": "前后3天",
      "procedures": ["知情同意", "人口学信息", "生命体征", "实验室检查"]
    }
  ]
}

注意：如果文本中不包含某类信息（如没有访视计划），则对应字段返回空数组。

方案文本如下：
---
{text}
---

重要：你的完整回复必须是且仅是一个合法的JSON对象，不要包含任何其他文字。`;
