export interface SubjectDemographics {
  subjectId: string;
  initials: string;
  age: number;
  gender: string;
  ethnicity?: string;
}

export interface VitalSign {
  type: string;
  value: string;
  unit: string;
  date?: string;
}

export interface MedicalHistory {
  condition: string;
  onsetDate?: string;
  status?: string;
  notes?: string;
}

export interface MedicationRecord {
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate?: string;
  endDate?: string;
  indication?: string;
}

export interface SubjectData {
  demographics: SubjectDemographics;
  vitalSigns: VitalSign[];
  medicalHistory: MedicalHistory[];
  medications: MedicationRecord[];
  rawText?: string;
}
