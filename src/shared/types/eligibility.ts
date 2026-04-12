export interface EligibilityResult {
  criterionId: string;
  criterionContent: string;
  category: 'inclusion' | 'exclusion';
  status: 'pass' | 'fail' | 'unknown';
  evidence: string;
  confidence: number; // 0-1
  notes?: string;
}

export interface EligibilityReport {
  subjectId: string;
  results: EligibilityResult[];
  overallEligible: boolean;
  summary: string;
  verifiedAt: string;
}
