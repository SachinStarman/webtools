
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppConfig, ToolID } from '../../types';
import { DEFAULT_CONFIG } from '../../constants';
import StarCanvas, { StarCanvasHandle } from '../../components/StarCanvas';
import ControlItem from '../../components/ControlItem';
import { getAestheticSuggestion } from '../../services/geminiService';

interface StellarTrailsAppProps {
  onBack: () => void;
}

const StellarTrailsApp: React.FC<StellarTrailsAppProps> = ({ onBack }) => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [seed, setSeed] = useState(Math.random());
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isLoopRecording, setIsLoopRecording] = useState(false);
  
  const canvasHandleRef = useRef<StarCanvasHandle>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const reroll = () => setSeed(Math.random());

  const handleDownloadStill = () => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (canvas) {
      const link = document.createElement('a');
      link.download = `stellar-still-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    }
  };

  const startRecording = (isFixedLoop = false) => {
    const canvas = canvasHandleRef.current?.getCanvas();
    if (!canvas) return;

    // Feature detection for recording
    if (typeof (canvas as any).captureStream !== 'function') {
      alert("Recording is not supported in this browser (captureStream missing).");
      return;
    }

    try {
      chunksRef.current = [];
      const stream = (canvas as any).captureStream(60);
      
      // Mimetype detection
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm',
        'video/mp4'
      ];
      const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 12000000 
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
        link.download = `stellar-loop-${Date.now()}.${ext}`; 
        link.click();
        URL.revokeObjectURL(url);
        setIsLoopRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordTime(0);
      
      if (isFixedLoop) {
        setIsLoopRecording(true);
        setTimeout(() => {
          stopRecording();
        }, config.loopDuration * 1000);
      }

      recordTimerRef.current = window.setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Recording start failed:", err);
      alert("Failed to start recording. This browser might not support the required features.");
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
      const suggestion = await getAestheticSuggestion(config);
      updateConfig(suggestion);
      reroll();
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && document.activeElement?.tagName !== 'INPUT') {
        setSidebarOpen(prev => !prev);
      } else if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        updateConfig({ isPaused: !config.isPaused });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.isPaused]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-950 flex flex-col text-slate-200">
      
      <nav className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6 z-30 flex-shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white tracking-tighter uppercase italic leading-none">
              Stellar<span className="text-sky-400 not-italic">Trails</span>
            </h1>
            <span className="text-[9px] text-sky-500 font-mono uppercase tracking-widest">v3.5 Infinite Loop</span>
          </div>
          <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
          <div className="flex gap-1 bg-black/40 p-1 rounded-lg">
            <button 
              onClick={() => updateConfig({ activeTool: 'STILL_CAPTURE' })}
              className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${config.activeTool === 'STILL_CAPTURE' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Still
            </button>
            <button 
              onClick={() => updateConfig({ activeTool: 'MOTION_CAPTURE' })}
              className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all ${config.activeTool === 'MOTION_CAPTURE' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Motion
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isRecording && (
            <div className={`flex items-center gap-2 px-3 py-1 ${isLoopRecording ? 'bg-sky-500/20 border-sky-500/50' : 'bg-red-500/20 border-red-500/50'} border rounded-full transition-colors`}>
              <div className={`w-2 h-2 ${isLoopRecording ? 'bg-sky-500' : 'bg-red-500'} rounded-full animate-pulse`} />
              <span className={`text-[10px] font-mono ${isLoopRecording ? 'text-sky-400' : 'text-red-400'} font-bold uppercase`}>
                {isLoopRecording ? `Loop Syncing...` : `REC ${Math.floor(recordTime/60)}:{(recordTime%60).toString().padStart(2, '0')}`}
              </span>
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? '✕' : '⚙️'}
          </button>
        </div>
      </nav>

      <div className="flex-grow flex min-h-0 relative">
        <aside 
          className={`
            absolute md:relative z-20 h-full w-80 bg-slate-900/95 backdrop-blur-xl 
            border-r border-white/10 flex flex-col transition-transform duration-500 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar min-h-0">
            <div className="bg-sky-500/5 border border-sky-500/20 p-4 rounded-xl">
              <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-1">Active Modality</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {config.activeTool === 'STILL_CAPTURE' 
                  ? "Hi-res static render engine." 
                  : "Seamless looping physics engine."}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Framing</h3>
              <div className="grid grid-cols-2 gap-3">
                <ControlItem label="Width" value={config.width} unit="px">
                  <input type="number" value={config.width} onChange={(e) => updateConfig({ width: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-sky-500 outline-none" />
                </ControlItem>
                <ControlItem label="Height" value={config.height} unit="px">
                  <input type="number" value={config.height} onChange={(e) => updateConfig({ height: parseInt(e.target.value) || 0 })} className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-sky-500 outline-none" />
                </ControlItem>
              </div>
              <ControlItem label="Perspective" value={config.perspective}>
                <input type="range" min="100" max="2000" step="10" value={config.perspective} onChange={(e) => updateConfig({ perspective: parseInt(e.target.value) })} className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
              </ControlItem>
            </div>

            <div className="space-y-6">
               <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Appearance</h3>
               <ControlItem label="Background" value={config.bgColor}>
                  <input type="color" value={config.bgColor} onChange={(e) => updateConfig({ bgColor: e.target.value })} className="w-full h-8 bg-transparent cursor-pointer border border-white/10 rounded overflow-hidden" />
               </ControlItem>
               <div className="grid grid-cols-2 gap-3">
                  <ControlItem label="Stars" value={config.starColor}>
                    <input type="color" value={config.starColor} onChange={(e) => updateConfig({ starColor: e.target.value })} className="w-full h-8 bg-transparent cursor-pointer border border-white/10 rounded overflow-hidden" />
                  </ControlItem>
                  <ControlItem label="Glow" value={config.glowColor}>
                    <input type="color" value={config.glowColor} onChange={(e) => updateConfig({ glowColor: e.target.value })} className="w-full h-8 bg-transparent cursor-pointer border border-white/10 rounded overflow-hidden" />
                  </ControlItem>
               </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Engine Config</h3>
              
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-300">Seamless Loop</span>
                <button 
                  onClick={() => updateConfig({ isLooping: !config.isLooping })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${config.isLooping ? 'bg-sky-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${config.isLooping ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {config.isLooping && (
                <ControlItem label="Loop Duration" value={config.loopDuration} unit="s" min={1} max={20} onInputChange={(v) => updateConfig({ loopDuration: parseFloat(v) })}>
                  <input type="range" min="1" max="20" step="0.5" value={config.loopDuration} onChange={(e) => updateConfig({ loopDuration: parseFloat(e.target.value) })} className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
                </ControlItem>
              )}

              <ControlItem label="Star Density" value={config.starCount} min={100} max={8000} onInputChange={(v) => updateConfig({ starCount: parseInt(v) })}>
                <input type="range" min="100" max="8000" step="100" value={config.starCount} onChange={(e) => updateConfig({ starCount: parseInt(e.target.value) })} className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
              </ControlItem>
              <ControlItem label="Trail Duration" value={config.trailLength} min={1} max={500} onInputChange={(v) => updateConfig({ trailLength: parseInt(v) })}>
                <input type="range" min="1" max="500" step="1" value={config.trailLength} onChange={(e) => updateConfig({ trailLength: parseInt(e.target.value) })} className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
              </ControlItem>
              <ControlItem label="Speed Z" value={config.speedZ} min={0} max={500} onInputChange={(v) => updateConfig({ speedZ: parseInt(v) })}>
                <input type="range" min="0" max="500" step="1" value={config.speedZ} onChange={(e) => updateConfig({ speedZ: parseInt(e.target.value) })} className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
              </ControlItem>
              
              <div className="pt-4 border-t border-white/5 space-y-6">
                <h4 className="text-[10px] text-sky-500/70 font-bold uppercase tracking-widest">Vector Drift</h4>
                <ControlItem label="Drift X" value={config.driftX} min={-100} max={100} onInputChange={(v) => updateConfig({ driftX: parseInt(v) })}>
                  <input type="range" min="-100" max="100" step="1" value={config.driftX} onChange={(e) => updateConfig({ driftX: parseInt(e.target.value) })} className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
                </ControlItem>
                <ControlItem label="Drift Y" value={config.driftY} min={-100} max={100} onInputChange={(v) => updateConfig({ driftY: parseInt(v) })}>
                  <input type="range" min="-100" max="100" step="1" value={config.driftY} onChange={(e) => updateConfig({ driftY: parseInt(e.target.value) })} className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-full appearance-none" />
                </ControlItem>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <button 
                onClick={handleAiSuggestion}
                disabled={isAiLoading}
                className={`w-full py-4 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-[0.2em] transition-all
                  ${isAiLoading ? 'bg-purple-900/50 text-purple-400 cursor-wait' : 'bg-gradient-to-r from-purple-600 to-sky-600 hover:brightness-110 text-white shadow-xl shadow-purple-500/20 active:scale-95'}`}
              >
                {isAiLoading ? 'Analyzing...' : '✨ Suggest Theme'}
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-950/80 border-t border-white/10 flex flex-col gap-3 flex-shrink-0">
            {config.activeTool === 'MOTION_CAPTURE' && (
              <div className="flex gap-2 mb-1">
                <button 
                  onClick={() => updateConfig({ isPaused: !config.isPaused })}
                  className={`flex-grow py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${config.isPaused ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                  {config.isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button onClick={reroll} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-lg transition-colors">🎲</button>
              </div>
            )}
            
            {config.activeTool === 'STILL_CAPTURE' ? (
              <button 
                onClick={handleDownloadStill}
                className="w-full py-4 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-sky-500/20"
              >
                💾 Export Master PNG
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {config.isLooping && (
                   <button 
                    disabled={isRecording}
                    onClick={() => startRecording(true)}
                    className={`w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl`}
                  >
                    🔁 Record 1 Seamless Loop
                  </button>
                )}
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
          <div className="w-full h-full relative">
            <StarCanvas ref={canvasHandleRef} config={config} seed={seed} />
          </div>
          
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/5 pointer-events-none z-10">
            <div className={`w-2 h-2 rounded-full ${config.activeTool === 'STILL_CAPTURE' ? 'bg-sky-400' : 'bg-green-400 animate-pulse'}`} />
            <span className="text-[10px] text-white/60 font-mono uppercase tracking-[0.3em] font-bold">
              {config.activeTool === 'STILL_CAPTURE' ? 'Still Engine' : 'Loop Physics Active'}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StellarTrailsApp;
