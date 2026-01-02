
import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { AppConfig, StarData } from '../types';

interface StarCanvasProps {
  config: AppConfig;
  seed: number;
}

export interface StarCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const StarCanvas = forwardRef<StarCanvasHandle, StarCanvasProps>(({ config, seed }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<StarData[]>([]);
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(performance.now());
  const lastFrameTimeRef = useRef<number>(performance.now());
  const totalElapsedRef = useRef<number>(0);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }));

  const createStar = useCallback((): StarData => {
    const { width, height } = config;
    return {
      x: (Math.random() - 0.5) * width * 4.0, 
      y: (Math.random() - 0.5) * height * 2.0,
      z: Math.random() * 3000, 
      baseSize: Math.random(),
      seed: Math.random()
    };
  }, [config.width, config.height]);

  useEffect(() => {
    const newStars: StarData[] = [];
    for (let i = 0; i < config.starCount; i++) {
      newStars.push(createStar());
    }
    starsRef.current = newStars;
  }, [config.starCount, seed, config.width, config.height, createStar]);

  const renderFrame = useCallback((ctx: CanvasRenderingContext2D, elapsedMs: number) => {
    const { 
      width, height, bgColor, starColor, speedZ, driftX, driftY, 
      trailLength, minSize, maxSize, randomness, perspective, 
      glowEnabled, glowColor, activeTool, isLooping, loopDuration 
    } = config;

    if (width <= 0 || height <= 0) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const loopCycleMs = (loopDuration || 4) * 1000;

    starsRef.current.forEach((star) => {
      let currentZ, currentX, currentY;

      if (activeTool === 'MOTION_CAPTURE' && isLooping) {
        const starTimeOffset = (star.z / 3000) * loopCycleMs;
        const totalElapsed = (elapsedMs + starTimeOffset) % loopCycleMs;
        const progress = totalElapsed / loopCycleMs;

        currentZ = 3000 * (1 - progress);
        const travelMultiplier = (speedZ / 50) * progress * 50; 
        currentX = star.x - (driftX * travelMultiplier);
        currentY = star.y - (driftY * travelMultiplier);
      } else {
        currentZ = star.z;
        currentX = star.x;
        currentY = star.y;
      }

      if (currentZ <= 10) return;

      const sx = cx + (currentX / currentZ) * perspective;
      const sy = cy + (currentY / currentZ) * perspective;

      const trailZ = currentZ + (speedZ * trailLength * 0.1);
      const tx = cx + ((currentX + driftX * trailLength * 0.1) / trailZ) * perspective;
      const ty = cy + ((currentY + driftY * trailLength * 0.1) / trailZ) * perspective;

      const size = minSize + ((maxSize - minSize) * ((star.baseSize * randomness) + (0.5 * (1 - randomness))));
      const scaledWidth = Math.max(0.2, size * (perspective / currentZ));
      const alpha = Math.max(0, Math.min(1, (3000 - currentZ) / 1500));
      
      if (alpha <= 0) return;

      if (glowEnabled) {
        ctx.shadowBlur = scaledWidth * 2;
        ctx.shadowColor = glowColor;
      }

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = starColor;
      ctx.lineWidth = scaledWidth;
      ctx.lineCap = 'round';
      ctx.globalAlpha = alpha;
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    });
  }, [config]);

  const animate = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const deltaTime = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    if (!config.isPaused) {
      totalElapsedRef.current += deltaTime;
    }

    if (canvas.width !== config.width || canvas.height !== config.height) {
      canvas.width = config.width;
      canvas.height = config.height;
    }

    renderFrame(ctx, totalElapsedRef.current);

    if (config.activeTool === 'MOTION_CAPTURE') {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [config, renderFrame]);

  useEffect(() => {
    if (config.activeTool === 'MOTION_CAPTURE') {
      lastFrameTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(animate);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = config.width;
        canvas.height = config.height;
        const ctx = canvas.getContext('2d');
        if (ctx) renderFrame(ctx, 0);
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [config.activeTool, config.width, config.height, animate, renderFrame]);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 md:p-12">
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <canvas
          ref={canvasRef}
          className="shadow-[0_0_100px_rgba(0,0,0,0.8)] flex-shrink-0 transition-all duration-700 bg-black pointer-events-auto"
          style={{
            width: config.width + 'px',
            height: config.height + 'px',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      </div>
    </div>
  );
});

export default StarCanvas;
