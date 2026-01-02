
import React, { useState } from 'react';
import StellarTrailsApp from './apps/StellarTrails/StellarTrailsApp';
import GradientsApp from './apps/Gradients/GradientsApp';

type AppID = 'HOME' | 'STELLAR_TRAILS' | 'GRADIENTS';

interface ToolMetadata {
  id: AppID;
  name: string;
  icon: string;
  description: string;
  color: string;
}

const TOOLS: ToolMetadata[] = [
  {
    id: 'STELLAR_TRAILS',
    name: 'Stellar Trails',
    icon: '✨',
    description: 'Cinematic warp field & star trail engine.',
    color: 'from-sky-500 to-blue-600'
  },
  {
    id: 'GRADIENTS',
    name: 'Gradient Labs',
    icon: '🌈',
    description: 'Modern mesh & conic gradient generator.',
    color: 'from-indigo-500 to-purple-600'
  }
];

const App: React.FC = () => {
  const [activeApp, setActiveApp] = useState<AppID>('HOME');

  if (activeApp === 'STELLAR_TRAILS') {
    return <StellarTrailsApp onBack={() => setActiveApp('HOME')} />;
  }
  
  if (activeApp === 'GRADIENTS') {
    return <GradientsApp onBack={() => setActiveApp('HOME')} />;
  }

  return (
    <div className="fixed inset-0 bg-[#020617] text-white flex flex-col items-center justify-center p-6 sm:p-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[120px]" />
      </div>

      <header className="mb-16 text-center z-10">
        <h1 className="text-6xl sm:text-7xl font-outfit font-black tracking-tighter mb-2">
          fun<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">tools</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base font-medium tracking-wide uppercase opacity-60">
          The Creative Utility Suite
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-10 max-w-4xl w-full z-10">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveApp(tool.id)}
            className="group flex flex-col items-center gap-4 focus:outline-none transition-all duration-300 transform hover:scale-105"
          >
            <div className={`
              w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br ${tool.color} 
              flex items-center justify-center text-4xl sm:text-5xl shadow-2xl 
              group-hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] transition-all
              relative overflow-hidden
            `}>
              <span className="z-10">{tool.icon}</span>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-center">
              <h3 className="font-outfit font-bold text-sm sm:text-base mb-1 group-hover:text-sky-400 transition-colors">
                {tool.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight max-w-[120px]">
                {tool.description}
              </p>
            </div>
          </button>
        ))}

        {/* Placeholder for future tools */}
        {[1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-4 opacity-20 cursor-not-allowed grayscale">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center text-3xl">
              🔒
            </div>
            <div className="text-center">
              <h3 className="font-outfit font-bold text-sm sm:text-base mb-1">Coming Soon</h3>
              <p className="text-[10px] text-slate-500 font-medium leading-tight max-w-[120px]">Next utility...</p>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 z-10">
        <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Version 1.1.0-beta
        </div>
      </footer>
    </div>
  );
};

export default App;
