import { useStore } from '../store/useStore';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Repeat, 
  RotateCcw,
  FastForward,
  Rewind,
  Settings2
} from 'lucide-react';
import { cn } from '../lib/utils';
import React from 'react';

export function AnimationPlayer() {
  const { 
    animationState, 
    setPlaying, 
    setCurrentTime, 
    setPlaybackSpeed, 
    toggleLoop,
    resetAnimation,
    // models,
    // activeModelId 
    // Show player even if no active model logic? Or check globally.
    // Ideally we show it always if there's capability to play.
  } = useStore();
  
  // Format time as MM:SS.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };
  
  const skip = (amount: number) => {
    const newTime = Math.min(Math.max(0, animationState.currentTime + amount), animationState.duration);
    setCurrentTime(newTime);
  };
  
  const speeds = [0.25, 0.5, 1.0, 1.5, 2.0];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50">
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
        
        {/* Timeline Slider */}
        <div className="group relative w-full h-1 cursor-pointer flex items-center">
             <input
                type="range"
                min="0"
                max={animationState.duration || 100}
                step="0.01"
                value={animationState.currentTime}
                onChange={handleScrub}
                className="absolute w-full h-full opacity-0 z-20 cursor-pointer"
             />
             <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-75 ease-out"
                  style={{ width: `${(animationState.currentTime / (animationState.duration || 1)) * 100}%` }}
                />
             </div>
             {/* Hover Handle */}
             <div 
                className="absolute h-3 w-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-lg"
                style={{ left: `${(animationState.currentTime / (animationState.duration || 1)) * 100}%`, transform: 'translateX(-50%)' }}
             />
        </div>

        {/* Timestamps & Controls */}
        <div className="flex items-center justify-between">
           {/* Time */}
           <div className="text-xs font-mono text-gray-400 w-20">
             {formatTime(animationState.currentTime)}
           </div>

           {/* Main Controls */}
           <div className="flex items-center gap-4">
              <button onClick={() => setCurrentTime(0)} className="text-gray-400 hover:text-white transition">
                <RotateCcw className="w-4 h-4" />
              </button>
              
              <button onClick={() => skip(-5)} className="text-gray-400 hover:text-white transition">
                <Rewind className="w-5 h-5" />
              </button>

              <button 
                onClick={() => setPlaying(!animationState.isPlaying)}
                className="w-12 h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
              >
                {animationState.isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>

              <button onClick={() => skip(5)} className="text-gray-400 hover:text-white transition">
                <FastForward className="w-5 h-5" />
              </button>
              
              <button 
                onClick={toggleLoop}
                className={cn(
                  "transition",
                  animationState.loop ? "text-indigo-400" : "text-gray-400 hover:text-white"
                )}
              >
                <Repeat className="w-4 h-4" />
              </button>
           </div>

           {/* Right: Speed & Duration */}
           <div className="flex items-center gap-3 w-20 justify-end">
             <div className="relative group">
               <button className="text-xs font-medium text-gray-400 hover:text-white bg-white/5 px-2 py-1 rounded">
                 {animationState.playbackSpeed}x
               </button>
               {/* Speed Popup */}
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-black/90 border border-white/10 rounded-lg p-1 min-w-[3rem]">
                 {speeds.slice().reverse().map(s => (
                   <button 
                     key={s}
                     onClick={() => setPlaybackSpeed(s)}
                     className={cn(
                       "px-2 py-1 text-xs hover:bg-white/10 rounded",
                       animationState.playbackSpeed === s ? "text-indigo-400" : "text-gray-300"
                     )}
                   >
                     {s}x
                   </button>
                 ))}
               </div>
             </div>
             
             <div className="text-xs font-mono text-gray-500">
                {formatTime(animationState.duration)}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
