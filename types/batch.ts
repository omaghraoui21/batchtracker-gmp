export type BatchStatus = 'PRODUCTION' | 'SUPERVISOR' | 'QA' | 'COMPLETED' | 'ON_HOLD';

export interface BatchStage {
  id: string;
  name: string;
  role: string;
  sla: string; // Ex: "4h"
  assignedTo?: string;
  completedAt?: string;
  isCompleted: boolean;
  isCurrent: boolean;
}

export interface Batch {
  id: string;
  number: string; // Ex: "#12345"
  product: string;
  status: BatchStatus;
  currentStage: string;
  stages: BatchStage[];
  createdAt: string;
  updatedAt: string;
}

export interface Deviation {
  id: string;
  batchId: string;
  type: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
}
