export interface Criterion {
  id: string;
  category: 'inclusion' | 'exclusion';
  index: number;
  content: string;
  source?: string; // page/section reference
}

export interface VisitSchedule {
  id: string;
  visitName: string;
  visitWindow: string;
  procedures: string[];
  timing: string;
}

export interface ProtocolData {
  criteria: Criterion[];
  visitSchedules: VisitSchedule[];
  protocolTitle?: string;
  protocolId?: string;
  rawText?: string;
}
