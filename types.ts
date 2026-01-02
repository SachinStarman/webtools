
export type ToolID = 'STILL_CAPTURE' | 'MOTION_CAPTURE';

// Stellar Trails Specific
export interface AppConfig {
  activeTool: ToolID;
  width: number;
  height: number;
  starCount: number;
  speedZ: number;
  driftX: number;
  driftY: number;
  trailLength: number;
  minSize: number;
  maxSize: number;
  randomness: number;
  bgColor: string;
  starColor: string;
  glowColor: string;
  glowEnabled: boolean;
  perspective: number;
  safeMargin: number;
  isPaused: boolean;
  isLooping: boolean;
  loopDuration: number; // in seconds
}

export interface StarData {
  x: number;
  y: number;
  z: number;
  baseSize: number;
  seed: number;
  tx?: number;
  ty?: number;
  tz?: number;
}

// Gradients Specific
export type GradientType = 'LINEAR' | 'RADIAL' | 'CONIC' | 'MESH' | 'STRIPES' | 'WAVES' | 'AURORA';

export interface GradientConfig {
  activeTool: ToolID;
  type: GradientType;
  width: number;
  height: number;
  colors: string[];
  angle: number;
  posX: number;
  posY: number;
  scale: number;
  grain: number; // 0 to 1
  isAnimated: boolean;
  animationSpeed: number;
  seed: number;
  loopDuration: number; // for video export
}
