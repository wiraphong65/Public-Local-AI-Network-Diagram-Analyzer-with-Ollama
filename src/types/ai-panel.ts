import type { Node, Edge } from '@xyflow/react';

export interface Project {
  id: number;
  name: string;
  description?: string;
  diagram_data?: string;
  analysis_count?: number;
  last_analysis_at?: string;
  owner_id: number;
  created_at: string;
  updated_at?: string;
}

export interface AIPanelProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  currentProject?: Project | null;
}

export interface AnalysisHistoryItem {
  id: number;
  user_id: number;
  project_id?: number;
  model_used: string;
  device_count: number;
  analysis_result: string;
  created_at: string;
  execution_time_seconds?: number;
}

export interface FloatingPosition {
  x: number;
  y: number;
}

export interface DragOffset {
  x: number;
  y: number;
}

export type ActiveTab = 'analysis' | 'history';