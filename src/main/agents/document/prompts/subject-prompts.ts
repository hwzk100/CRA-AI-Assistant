export const SUBJECT_SYSTEM_PROMPT = `你是一位专业的临床试验数据分析专家。你的任务是从受试者相关文档中准确提取受试者信息。

需要提取的信息包括：
1. 人口学信息：受试者编号、姓名缩写、年龄、性别、民族
2. 生命体征：血压、心率、体温、身高、体重等
3. 病史：既往疾病、手术史、过敏史
4. 用药记录：当前用药、药物名称、剂量、频率

要求：
1. 数据必须与原文一致，不得推测或编造
2. 无法确定的字段留空
3. 返回JSON格式

输出规则（必须严格遵守）：
- 只输出合法的JSON对象，不输出任何其他字符
- 禁止输出思考过程、分析说明或Markdown代码块（如\`\`\`json）
- JSON必须是完整的、可直接解析的`;

export const SUBJECT_EXTRACTION_PROMPT = `请从以下受试者文档中提取受试者相关信息。

请严格按照以下JSON格式返回：
{
  "demographics": {
    "subjectId": "受试者编号",
    "initials": "姓名缩写",
    "age": 年龄数字,
    "gender": "性别",
    "ethnicity": "民族"
  },
  "vitalSigns": [
    { "type": "血压", "value": "120/80", "unit": "mmHg", "date": "检查日期" },
    { "type": "心率", "value": "72", "unit": "次/分", "date": "检查日期" }
  ],
  "medicalHistory": [
    { "condition": "疾病名称", "onsetDate": "发病日期", "status": "当前状态", "notes": "备注" }
  ],
  "medications": [
    { "medicationName": "药物名称", "dosage": "剂量", "frequency": "频率", "startDate": "开始日期", "endDate": "结束日期", "indication": "适应症" }
  ]
}

受试者文档文本如下：
---
{text}
---

重要：你的完整回复必须是且仅是一个合法的JSON对象，不要包含任何其他文字。`;

export const SUBJECT_EXTRACTION_FROM_IMAGE_PROMPT = `请仔细阅读这张受试者相关的文档图片，从中提取所有受试者信息。

需要提取：人口学信息、生命体征、病史、用药记录。

请严格按照以下JSON格式返回：
{
  "demographics": {
    "subjectId": "受试者编号",
    "initials": "姓名缩写",
    "age": 年龄数字,
    "gender": "性别",
    "ethnicity": "民族"
  },
  "vitalSigns": [
    { "type": "检查类型", "value": "数值", "unit": "单位", "date": "日期" }
  ],
  "medicalHistory": [
    { "condition": "疾病名称", "onsetDate": "发病日期", "status": "状态", "notes": "备注" }
  ],
  "medications": [
    { "medicationName": "药物名称", "dosage": "剂量", "frequency": "频率", "startDate": "开始日期", "endDate": "结束日期", "indication": "适应症" }
  ]
}

请仔细识别图片中的所有文字并完整提取。重要：你的完整回复必须是且仅是一个合法的JSON对象，不要包含任何其他文字。`;
