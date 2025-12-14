export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface DetectionResult {
  label: string;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000 scale
  confidence?: number;
}

export interface TrackedObject {
  id: number;
  label: string;
  box: BoundingBox;
  trajectory: { x: number; y: number }[];
  color: string;
  lastSeen: number; // timestamp
}

export interface Point {
  x: number;
  y: number;
}

export enum DetectionStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
}

export interface AnalyticsStats {
  fps: number;
  totalObjects: number;
  roiEntered: number;
  roiExited: number;
}