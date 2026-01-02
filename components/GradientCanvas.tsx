
import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { GradientConfig } from '../types';

interface GradientCanvasProps {
  config: GradientConfig;
}

export interface GradientCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

const VERTEX_SHADER_SOURCE = `#version 300 es
layout(location = 0) in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time; // Normalized 0.0 to 1.0 representing one full loop cycle
uniform vec3 u_colors[5];
uniform int u_colorCount;
uniform int u_type;
uniform float u_angle;
uniform vec2 u_pos;
uniform float u_scale;
uniform float u_grain;
uniform float u_seed;

out vec4 outColor;

#define PI 3.14159265359

float interleavedGradientNoise(vec2 uv) {
    vec3 magic = vec3(0.06711056, 0.00583715, 52.9829189);
    return fract(magic.z * fract(dot(uv, magic.xy)));
}

float hash(float n) { return fract(sin(n) * 43758.5453123); }
float noise(vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0;
    return mix(mix(hash(n+0.0), hash(n+1.0), f.x),
               mix(hash(n+57.0), hash(n+58.0), f.y), f.y);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec3 color = u_colors[0];
    float ratio = u_resolution.x / u_resolution.y;
    vec2 p = (uv - u_pos) * vec2(ratio, 1.0);
    
    // Convert normalized u_time to radians for smooth looping
    float phase = u_time * 2.0 * PI;

    if (u_type == 0) { // LINEAR
        // For linear to loop, we rotate the angle through 360 degrees or keep it static
        float rad = radians(u_angle + u_time * 360.0);
        vec2 dir = vec2(cos(rad), sin(rad));
        float t = dot(uv - 0.5, dir) + 0.5;
        t = clamp(t, 0.0, 1.0);
        
        float stepSize = 1.0 / float(u_colorCount - 1);
        for(int i = 0; i < u_colorCount - 1; i++) {
            float start = float(i) * stepSize;
            float end = float(i + 1) * stepSize;
            if (t >= start && t <= end) {
                color = mix(u_colors[i], u_colors[i+1], smoothstep(start, end, t));
            }
        }
    } 
    else if (u_type == 1) { // RADIAL
        // Scale oscillates smoothly to loop
        float loopScale = u_scale * (1.0 + sin(phase) * 0.1);
        float d = length(p) / loopScale;
        float t = clamp(d, 0.0, 1.0);
        float stepSize = 1.0 / float(u_colorCount - 1);
        for(int i = 0; i < u_colorCount - 1; i++) {
            float start = float(i) * stepSize;
            float end = float(i + 1) * stepSize;
            if (t >= start && t <= end) {
                color = mix(u_colors[i], u_colors[i+1], smoothstep(start, end, t));
            }
        }
    }
    else if (u_type == 2) { // CONIC
        float angle = atan(p.y, p.x);
        float t = (angle + PI) / (2.0 * PI);
        // Angle rotation loops naturally
        t = fract(t + radians(u_angle)/ (2.0 * PI) + u_time);
        float stepSize = 1.0 / float(u_colorCount - 1);
        for(int i = 0; i < u_colorCount - 1; i++) {
            float start = float(i) * stepSize;
            float end = float(i + 1) * stepSize;
            if (t >= start && t <= end) {
                color = mix(u_colors[i], u_colors[i+1], (t - start) / stepSize);
            }
        }
    }
    else if (u_type == 3) { // MESH
        color = u_colors[0];
        for(int i = 1; i < u_colorCount; i++) {
            float fi = float(i);
            // Periodic movement using sin/cos of phase
            vec2 offset = vec2(
                cos(phase + fi * 2.1 + u_seed * 10.0) * 0.35,
                sin(phase + fi * 1.8 + u_seed * 10.0) * 0.35
            );
            float dist = length(uv - (0.5 + offset));
            float weight = smoothstep(1.2 * u_scale, 0.0, dist);
            color = mix(color, u_colors[i], weight);
        }
    }
    else if (u_type == 4) { // STRIPES
        float rad = radians(u_angle);
        vec2 dir = vec2(cos(rad), sin(rad));
        // Shift exactly by an integer number of color steps to loop perfectly
        float t = dot(uv, dir) * 10.0 * u_scale + u_time * float(u_colorCount);
        int idx = int(mod(floor(t), float(u_colorCount)));
        color = u_colors[idx];
    }
    else if (u_type == 5) { // WAVES
        color = u_colors[0];
        for(int i = 1; i < u_colorCount; i++) {
            float fi = float(i);
            float h = 0.1 + 0.8 * (fi / float(u_colorCount));
            // Wave phase loops every 2PI
            float wave = sin(uv.x * 4.0 + phase + fi) * 0.08 * u_scale;
            float line = smoothstep(h + wave + 0.01, h + wave, uv.y);
            color = mix(color, u_colors[i], line);
        }
    }
    else if (u_type == 6) { // AURORA
        vec3 finalColor = u_colors[0];
        for(int i = 1; i < u_colorCount; i++) {
            float fi = float(i);
            // Traverse noise in a circular/periodic path for perfect looping
            float nx = uv.x * 2.0 + cos(phase) * 0.2;
            float ny = uv.y * 1.5 + sin(phase) * 0.2 + fi * 0.5;
            float n = noise(vec2(nx, ny));
            float mask = smoothstep(0.3, 0.7, n);
            finalColor = mix(finalColor, u_colors[i], mask * 0.5);
        }
        color = finalColor;
    }

    // DITHERING (Stays high frequency, doesn't need explicit loop sync but helps mask transitions)
    float noiseVal = interleavedGradientNoise(gl_FragCoord.xy);
    float ditherStrength = 1.0 / 255.0; 
    float grainStrength = u_grain * 0.05;
    color += (noiseVal - 0.5) * (ditherStrength + grainStrength);

    outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

const GradientCanvas = forwardRef<GradientCanvasHandle, GradientCanvasProps>(({ config }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const startTimeRef = useRef<number>(performance.now());
  const requestRef = useRef<number>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current
  }));

  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  };

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { 
        alpha: false, 
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
    });
    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return;
    }
    programRef.current = program;

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  }, []);

  const render = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    if (!gl || !program) return;

    const { width, height, colors, type, angle, posX, posY, scale, grain, isAnimated, animationSpeed, seed, loopDuration } = config;
    
    const canvas = canvasRef.current;
    if (canvas && (canvas.width !== width || canvas.height !== height)) {
        canvas.width = width;
        canvas.height = height;
    }

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);

    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), width, height);
    
    // Calculate normalized loop progress (0 to 1)
    const elapsedMs = performance.now() - startTimeRef.current;
    const cycleMs = loopDuration * 1000;
    const progress = (elapsedMs % cycleMs) / cycleMs;
    
    // We pass the progress as u_time to ensure periodic functions in shader loop perfectly
    gl.uniform1f(gl.getUniformLocation(program, 'u_time'), isAnimated ? progress : 0);
    
    const colorData = new Float32Array(15);
    colors.slice(0, 5).forEach((hex, i) => {
      const rgb = hexToRgb(hex);
      colorData[i * 3] = rgb[0];
      colorData[i * 3 + 1] = rgb[1];
      colorData[i * 3 + 2] = rgb[2];
    });
    gl.uniform3fv(gl.getUniformLocation(program, 'u_colors'), colorData);
    gl.uniform1i(gl.getUniformLocation(program, 'u_colorCount'), Math.min(colors.length, 5));
    
    const typeMap: Record<string, number> = { 
        LINEAR: 0, RADIAL: 1, CONIC: 2, MESH: 3, STRIPES: 4, WAVES: 5, AURORA: 6 
    };
    gl.uniform1i(gl.getUniformLocation(program, 'u_type'), typeMap[type] || 0);
    gl.uniform1f(gl.getUniformLocation(program, 'u_angle'), angle);
    gl.uniform2f(gl.getUniformLocation(program, 'u_pos'), posX / 100, 1.0 - (posY / 100));
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), scale);
    gl.uniform1f(gl.getUniformLocation(program, 'u_grain'), grain);
    gl.uniform1f(gl.getUniformLocation(program, 'u_seed'), seed);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (config.activeTool === 'MOTION_CAPTURE') {
        requestRef.current = requestAnimationFrame(render);
    }
  }, [config]);

  useEffect(() => {
    initGL();
    render();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [render, initGL]);

  return (
    <div className="absolute inset-0 flex items-center justify-center p-4 md:p-12 overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <canvas
          ref={canvasRef}
          className="shadow-[0_0_120px_rgba(0,0,0,0.6)] bg-black pointer-events-auto"
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

export default GradientCanvas;
