import React, { useState, useRef } from 'react';
import { VisionCanvas } from './components/VisionCanvas';
import { AnalyticsStats } from './types';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [hasAccess, setHasAccess] = useState(!!process.env.API_KEY);
  
  // Media State
  const [videoSource, setVideoSource] = useState<string | MediaStream | null>(null);
  const [isVideoFile, setIsVideoFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<AnalyticsStats>({
    fps: 0,
    totalObjects: 0,
    roiEntered: 0,
    roiExited: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setIsVideoFile(true);
      setIsProcessing(false);
    }
  };

  const handleWebcamStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoSource(stream);
      setIsVideoFile(false);
      setIsProcessing(false);
    } catch (err) {
      console.error("Webcam error:", err);
      alert("Could not access webcam.");
    }
  };

  const toggleProcessing = () => {
    if (!videoSource) return;
    setIsProcessing(!isProcessing);
  };

  const updateStats = (newStats: Partial<AnalyticsStats>) => {
    setStats(prev => ({ ...prev, ...newStats }));
  };

  if (!hasAccess) {
    // Should ideally not happen if env var is set, but good fallback
    return <div className="min-h-screen flex items-center justify-center text-white">API Key Required in Environment</div>;
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-200 font-sans selection:bg-neon-blue selection:text-black flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-panel-bg p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-neon-blue to-purple-600 flex items-center justify-center font-bold text-black">
            VT
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Vision-Tracker <span className="text-neon-blue font-light">Pro</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-sm">
             <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-neon-green animate-pulse' : 'bg-red-500'}`}></span>
             {isProcessing ? 'System Active' : 'System Idle'}
           </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left/Top: Video Canvas Area (Span 3 cols) */}
        <section className="lg:col-span-3 flex flex-col gap-4 h-full relative">
          <div className="flex-1 bg-black rounded-xl border border-gray-800 shadow-2xl relative overflow-hidden group">
            {videoSource ? (
              <VisionCanvas 
                source={videoSource}
                isVideoFile={isVideoFile}
                isProcessing={isProcessing}
                onStatsUpdate={updateStats}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
                 <p className="text-lg">Select a video source to begin analysis</p>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition text-white"
                    >
                      📁 Upload Video
                    </button>
                    <button 
                      onClick={handleWebcamStart}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition text-white"
                    >
                      📹 Use Webcam
                    </button>
                 </div>
              </div>
            )}
            <input 
              type="file" 
              accept="video/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </div>

          {/* Controls Bar */}
          <div className="h-16 bg-panel-bg rounded-lg border border-gray-800 flex items-center px-6 gap-6">
            <button
               onClick={toggleProcessing}
               disabled={!videoSource}
               className={`px-6 py-2 rounded font-bold transition flex items-center gap-2 ${
                 isProcessing 
                   ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
                   : 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50 hover:bg-neon-blue/30'
               } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? 'STOP ANALYSIS' : 'START ANALYSIS'}
            </button>
            
            <div className="h-8 w-px bg-gray-700 mx-2"></div>

            <div className="flex gap-4 text-sm text-gray-400">
               <div>Model: <span className="text-white">Gemini 2.5 Flash</span></div>
               <div>Tracker: <span className="text-white">Sort-Sim</span></div>
            </div>
          </div>
        </section>

        {/* Right: Analytics Dashboard (Span 1 col) */}
        <aside className="lg:col-span-1 flex flex-col gap-4 h-full overflow-y-auto">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-panel-bg p-4 rounded-xl border border-gray-800">
               <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Live FPS</div>
               <div className="text-2xl font-mono text-neon-green">{stats.fps}</div>
             </div>
             <div className="bg-panel-bg p-4 rounded-xl border border-gray-800">
               <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Objects</div>
               <div className="text-2xl font-mono text-white">{stats.totalObjects}</div>
             </div>
          </div>

          <div className="bg-panel-bg p-6 rounded-xl border border-gray-800 flex-1 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-4">ROI Analytics</h3>
            
            <div className="flex flex-col gap-8">
              <div className="relative">
                 <div className="flex justify-between items-end mb-2">
                   <span className="text-gray-400">Entered</span>
                   <span className="text-3xl font-bold text-neon-blue">{stats.roiEntered}</span>
                 </div>
                 <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                   <div className="bg-neon-blue h-full transition-all duration-500" style={{ width: `${Math.min((stats.roiEntered / 50) * 100, 100)}%` }}></div>
                 </div>
              </div>

              <div className="relative">
                 <div className="flex justify-between items-end mb-2">
                   <span className="text-gray-400">Exited</span>
                   <span className="text-3xl font-bold text-neon-red">{stats.roiExited}</span>
                 </div>
                 <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                   <div className="bg-neon-red h-full transition-all duration-500" style={{ width: `${Math.min((stats.roiExited / 50) * 100, 100)}%` }}></div>
                 </div>
              </div>
            </div>

            <div className="mt-auto pt-6 text-xs text-gray-500">
              <p className="mb-2"><strong>Instructions:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Upload video or use Webcam.</li>
                <li>Click <strong>Edit ROI</strong> to define a counting zone.</li>
                <li>Click points on video to draw polygon.</li>
                <li>Click <strong>Start Analysis</strong> to run Gemini Detection.</li>
              </ul>
            </div>
          </div>

          <div className="bg-panel-bg p-4 rounded-xl border border-gray-800 text-xs font-mono text-gray-500">
            <div className="flex justify-between mb-1">
               <span>System Status:</span>
               <span className="text-neon-green">ONLINE</span>
            </div>
            <div className="flex justify-between mb-1">
               <span>Resolution:</span>
               <span>Auto (640px)</span>
            </div>
             <div className="flex justify-between">
               <span>Latency:</span>
               <span>~200ms</span>
            </div>
          </div>

        </aside>
      </main>
    </div>
  );
}