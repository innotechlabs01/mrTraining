export interface Landmark {
  x: number; // normalized 0..1
  y: number;
  z: number;
  confidence: number; // 0..1 (model presence confidence)
  visibility: number; // 0..1 (limb visibility)
}

export interface LandmarkFrame {
  landmarks: Landmark[];
  timestamp: number; // ms
}

export interface Pose {
  landmarks: Landmark[];
  detected: boolean;
  confidence: number; // 0..1 mean visibility of tracked set
}
