
import { AppConfig, GradientConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  activeTool: 'MOTION_CAPTURE',
  width: 1920,
  height: 1080,
  starCount: 1500,
  speedZ: 45,
  driftX: 0,
  driftY: 0,
  trailLength: 50,
  minSize: 0.1,
  maxSize: 3.5,
  randomness: 0.75,
  bgColor: '#020617',
  starColor: '#ffffff',
  glowColor: '#38bdf8',
  glowEnabled: true,
  perspective: 800,
  safeMargin: 20,
  isPaused: false,
  isLooping: true,
  loopDuration: 4.0,
};

export const DEFAULT_GRADIENT_CONFIG: GradientConfig = {
  activeTool: 'MOTION_CAPTURE',
  type: 'MESH',
  width: 1920,
  height: 1080,
  colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'],
  angle: 45,
  posX: 50,
  posY: 50,
  scale: 1,
  grain: 0.15,
  isAnimated: true,
  animationSpeed: 1,
  seed: Math.random(),
  loopDuration: 4.0,
};

export const PRESETS = {
  WARP: {
    ...DEFAULT_CONFIG,
    speedZ: 80,
    trailLength: 120,
    starCount: 2000,
  },
  HYPERSPACE: {
    ...DEFAULT_CONFIG,
    speedZ: 150,
    trailLength: 200,
    driftX: 5,
    starColor: '#e0f2fe',
    glowColor: '#0ea5e9',
  },
  NEBULA_DRIFT: {
    ...DEFAULT_CONFIG,
    speedZ: 10,
    trailLength: 30,
    starColor: '#fae8ff',
    glowColor: '#d946ef',
    starCount: 3000,
  }
};
