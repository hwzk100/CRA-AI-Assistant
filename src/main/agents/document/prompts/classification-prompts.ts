export type DocumentCategory = 'medical-record' | 'lab-report' | 'drug-inventory' | 'other';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  'medical-record': '病历',
  'lab-report': '化验单',
  'drug-inventory': '药物表',
  'other': '其他',
};

export const CLASSIFICATION_SYSTEM_PROMPT = `你是医疗文档分类专家。你只需要判断文档类别，不需要提取任何内容。`;

export const CLASSIFICATION_PROMPT = `请判断这张图片属于哪类医疗文档。

可选类别（只输出一个词）：
- 病历（包含主诉、诊断、病史、医嘱、体格检查、入院/出院记录等临床文书）
- 化验单（包含检验项目、数值、单位、参考范围、异常标志等检验报告）
- 药物表（包含药品名称、规格、批号、有效期、库存数量等药物管理表格）
- 其他（不属于以上三类的医疗文档）

仅输出一个词：病历/化验单/药物表/其他`;

/** Parse AI classification response into a DocumentCategory */
export function parseCategoryResponse(text: string): DocumentCategory {
  const t = text.trim();
  if (t.includes('病历')) return 'medical-record';
  if (t.includes('化验') || t.includes('检验')) return 'lab-report';
  if (t.includes('药物') || t.includes('药品') || t.includes('库存')) return 'drug-inventory';
  return 'other';
}
