
import React, { useState, useRef, useTransition, useEffect } from 'react';
import { GradientConfig, GradientType } from '../../types';
import { DEFAULT_GRADIENT_CONFIG } from '../../constants';
import GradientCanvas, { GradientCanvasHandle } from '../../components/GradientCanvas';
import ControlItem from '../../components/ControlItem';
import { getGradientSuggestion } from '../../services/geminiService';

interface GradientsAppProps {
  onBack: () => void;
}

const GradientsApp: React.FC<GradientsAppProps> = ({ onBack }) => {
  const [config, setConfig] = useState<GradientConfig>(DEFAULT_GRADIENT_CONFIG);
  const [localColors, setLocalColors] = useState<string[]>(DEFAULT_GRADIENT_CONFIG.colors);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isLoopRecording, setIsLoopRecording] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  const canvasHandleRef = useRef<GradientCanvasHandle>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const updateConfig = (updates: Partial<GradientConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    setLocalColors(config.colors);
  }, [config.colors]);

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...localColors];
    newColors[index] = color;
    setLocalColors(newColors);

    startTransition(() => {
      updateConfig({ colors: newColors });
    });
  };

  const addColor = () => {
    if (localColors.length < 5) {
      const newColors = [...localColors, '#ffffff'];
      setLocalColors(newColors);
      updateConfig({ colors: newColors });
    }
  };

  const removeColor = (index: number) => {
    if (localColors.length > 2) {
      const newColors = localColors.filter((_, i) => i !== index);
      setLocalColors(newColors);
      updateConfig({ colors: newColors });
    }
  };

  const handleDownloadStill = () => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (canvas) {
      const link = document.createElement('a');
      link.download = `gradient-still-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    }
  };

  const startRecording = (isFixedLoop = false) => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) return;

    if (typeof (canvas as any).captureStream !== 'function') {
      alert("Recording is not supported in this browser.");
      return;
    }

    try {
      chunksRef.current = [];
      const stream = (canvas as any).captureStream(60);
      
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
      const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 16000000 
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const ext = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
        link.download = `gradient-loop-${Date.now()}.${ext}`; 
        link.click();
        URL.revokeObjectURL(url);
        setIsLoopRecording(false);
      };

      mediaRecorderRef.current = recorder;
      
      // Start recording immediately
      recorder.start();
      setIsRecording(true);
      setRecordTime(0);
      
      if (isFixedLoop) {
        setIsLoopRecording(true);
        // We record exactly for the duration to ensure start and end states match
        // because the shader uses (performance.now() % duration)
        setTimeout(() => {
          stopRecording();
        }, config.loopDuration * 1000);
      }

      recordTimerRef.current = window.setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording start failed:", err);
      setIsRecording(false);
      setIsLoopRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const handleAiSuggestion = async () => {
    setIsAiLoading(true);
    try {
      const suggestion = await getGradientSuggestion(config);
      updateConfig(suggestion as Partial<GradientConfig>);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 flex flex-col text-slate-200">
      <nav className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6 z-30 flex-shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">
              Gradient<span className="text-indigo-400 not-italic">Labs</span>
            </h1>
            <span className="text-[9px] text-indigo-500 font-mono uppercase tracking-widest">v2.0 Infinite Sync</span>
          </div>

          <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
          <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
            <button 
              onClick={() => updateConfig({ activeTool: 'STILL_CAPTURE' })}
              className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${config.activeTool === 'STILL_CAPTURE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Still
            </button>
            <button 
              onClick={() => updateConfig({ activeTool: 'MOTION_CAPTURE' })}
              className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${config.activeTool === 'MOTION_CAPTURE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Motion
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isRecording && (
            <div className={`flex items-center gap-2 px-3 py-1 ${isLoopRecording ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-red-500/20 border-red-500/50'} border rounded-full transition-colors`}>
              <div className={`w-2 h-2 ${isLoopRecording ? 'bg-indigo-500' : 'bg-red-500'} rounded-full animate-pulse`} />
              <span className={`text-[10px] font-mono ${isLoopRecording ? 'text-indigo-400' : 'text-red-400'} font-bold uppercase`}>
                {isLoopRecording ? `Loop Syncing...` : `REC ${Math.floor(recordTime/60)}:{(recordTime%60).toString().padStart(2, '0')}`}
              </span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white transition-colors">
            {isSidebarOpen ? '✕' : '⚙️'}
          </button>
        </div>
      </nav>

      <div className="flex-grow flex min-h-0 relative">
        <aside className={`absolute md:relative z-20 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar min-h-0">
            
            <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl">
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Loop Physics</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {config.activeTool === 'STILL_CAPTURE' 
                  ? "Static render for hi-res backgrounds." 
                  : "Periodic functions ensure mathematical loop points align for seamless infinity video."}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Pattern Type</h3>
              <div className="grid grid-cols-2 gap-2">
                {(['LINEAR', 'RADIAL', 'CONIC', 'MESH', 'STRIPES', 'WAVES', 'AURORA'] as GradientType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateConfig({ type })}
                    className={`py-2 rounded-lg text-[10px] font-bold uppercase transition-all border ${config.type === type ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-white/5 text-slate-400 hover:border-white/20'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Resolution</h3>
              <div className="grid grid-cols-2 gap-3">
                <ControlItem label="Width" value={config.width}>
                  <input type="number" value={config.width} onChange={(e) => updateConfig({ width: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                </ControlItem>
                <ControlItem label="Height" value={config.height}>
                  <input type="number" value={config.height} onChange={(e) => updateConfig({ height: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
                </ControlItem>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Colors</h3>
                {localColors.length < 5 && (
                  <button onClick={addColor} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest">+ Add</button>
                )}
              </div>
              <div className="space-y-3">
                {localColors.map((color, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="color" value={color} onChange={(e) => handleColorChange(i, e.target.value)} className="w-12 h-8 bg-transparent cursor-pointer border border-white/10 rounded overflow-hidden" />
                    <input type="text" value={color} onChange={(e) => handleColorChange(i, e.target.value)} className="flex-grow bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs font-mono text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500" />
                    {localColors.length > 2 && (
                      <button onClick={() => removeColor(i)} className="p-1 text-slate-600 hover:text-red-400 transition-colors">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-white/5">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Adjustments</h3>
              <ControlItem label="Grain" value={Math.round(config.grain * 100)} unit="%">
                <input type="range" min="0" max="0.5" step="0.01" value={config.grain} onChange={(e) => updateConfig({ grain: parseFloat(e.target.value) })} className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
              </ControlItem>

              {config.activeTool === 'MOTION_CAPTURE' && (
                <ControlItem label="Loop Seconds" value={config.loopDuration} unit="s">
                  <input type="range" min="1" max="10" step="0.5" value={config.loopDuration} onChange={(e) => updateConfig({ loopDuration: parseFloat(e.target.value) })} className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
                </ControlItem>
              )}
              
              {(config.type !== 'RADIAL' && config.type !== 'WAVES' && config.type !== 'AURORA') && (
                <ControlItem label="Angle" value={config.angle} unit="°">
                  <input type="range" min="0" max="360" step="1" value={config.angle} onChange={(e) => updateConfig({ angle: parseInt(e.target.value) })} className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
                </ControlItem>
              )}

              {(config.type === 'RADIAL' || config.type === 'WAVES' || config.type === 'STRIPES') && (
                <ControlItem label="Scale" value={config.scale.toFixed(1)}>
                  <input type="range" min="0.1" max="4" step="0.1" value={config.scale} onChange={(e) => updateConfig({ scale: parseFloat(e.target.value) })} className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
                </ControlItem>
              )}

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-300">Animate Flow</span>
                <button 
                  onClick={() => updateConfig({ isAnimated: !config.isAnimated })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${config.isAnimated ? 'bg-indigo-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.isAnimated ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <button 
                onClick={handleAiSuggestion}
                disabled={isAiLoading}
                className={`w-full py-4 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-[0.2em] transition-all
                  ${isAiLoading ? 'bg-indigo-900/50 text-indigo-400 cursor-wait' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white shadow-xl shadow-indigo-500/20 active:scale-95'}`}
              >
                {isAiLoading ? 'Mixing...' : '🎨 AI suggestion'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-950/80 border-t border-white/10 flex flex-col gap-3 flex-shrink-0">
            {config.activeTool === 'STILL_CAPTURE' ? (
              <button 
                onClick={handleDownloadStill}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                💾 Export Master PNG
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button 
                  disabled={isRecording}
                  onClick={() => startRecording(true)}
                  className={`w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl`}
                >
                  🔁 Record {config.loopDuration}s Seamless Loop
                </button>
                <button 
                  onClick={isRecording ? stopRecording : () => startRecording(false)}
                  className={`w-full py-4 ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-white text-black hover:bg-slate-200'} text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl`}
                >
                  {isRecording ? '⏹ Stop Recording' : '⏺ Record Manual Stream'}
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-grow h-full bg-slate-950 relative overflow-hidden flex items-center justify-center">
          <GradientCanvas ref={canvasHandleRef} config={config} />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/5 pointer-events-none z-10">
            <div className={`w-2 h-2 rounded-full ${config.activeTool === 'STILL_CAPTURE' ? 'bg-indigo-400' : 'bg-indigo-500 animate-pulse'}`} />
            <span className="text-[10px] text-white/60 font-mono uppercase tracking-[0.3em] font-bold">
              {config.activeTool === 'STILL_CAPTURE' ? 'Still Renderer' : 'Infinity Loop Engine'}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default GradientsApp;
