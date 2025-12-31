import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Upload, Trash2, Box, Music, X, Sparkles, Link, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';

export function ModelManager() {
  const { 
    models, 
    activeModelId, 
    addModel, 
    addModelFromUrl,
    removeModel, 
    setActiveModel, 
    backgroundColor1, 
    backgroundColor2,
    backgroundAnimated,
    setBackgroundColor1,
    setBackgroundColor2,
    setBackgroundAnimated,
    addMotionToModel,
    removeMotionFromModel
  } = useStore();

  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addModel(e.target.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      const name = urlInput.split('/').pop() || 'Model';
      addModelFromUrl(name, urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleMotionUpload = (modelId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addMotionToModel(modelId, e.target.files[0]);
    }
  };

  // Quick load for Ganyu model in public folder
  const loadGanyuDemo = () => {
    addModelFromUrl('Ganyu.pmx', '/models/Ganyu/Ganyu.pmx');
  };

  return (
    <div className="absolute top-4 left-4 z-10 w-80 bg-black/80 backdrop-blur-md text-white p-4 rounded-xl border border-white/10 shadow-xl">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Box className="w-5 h-5 text-indigo-400" />
        MMD Models
      </h2>

      {/* Background Controls */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
          <span className="text-sm text-gray-300">Gradient Colors</span>
          <div className="flex gap-2">
            <input 
              type="color" 
              value={backgroundColor1} 
              onChange={(e) => setBackgroundColor1(e.target.value)} 
              className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
              title="Color 1"
            />
            <input 
              type="color" 
              value={backgroundColor2} 
              onChange={(e) => setBackgroundColor2(e.target.value)} 
              className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
              title="Color 2"
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
          <span className="text-sm text-gray-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Animate BG
          </span>
          <button
            onClick={() => setBackgroundAnimated(!backgroundAnimated)}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              backgroundAnimated ? "bg-indigo-500" : "bg-gray-600"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
              backgroundAnimated ? "left-7" : "left-1"
            )} />
          </button>
        </div>
      </div>
      
      {/* Model Upload */}
      <div className="mb-4 space-y-2">
        <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-white/5 transition-colors">
          <div className="flex flex-col items-center justify-center py-3">
            <Upload className="w-6 h-6 mb-1 text-indigo-400" />
            <p className="text-xs text-gray-400">Upload .pmx file</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".pmx"
            onChange={handleFileUpload}
          />
        </label>

        {/* URL Input Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
          >
            <Link className="w-4 h-4" />
            Load from URL
          </button>
          <button
            onClick={loadGanyuDemo}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-xs text-indigo-300 transition-colors border border-indigo-500/30"
            title="Load Ganyu demo model"
          >
            <FolderOpen className="w-4 h-4" />
            Demo
          </button>
        </div>

        {showUrlInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="/models/ModelName/model.pmx"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <button
              onClick={handleUrlSubmit}
              className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm transition-colors"
            >
              Load
            </button>
          </div>
        )}
      </div>

      {/* Model List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {models.map((model) => (
          <div 
            key={model.id} 
            className={cn(
              "p-3 rounded-lg border transition-all",
              activeModelId === model.id 
                ? "bg-indigo-500/20 border-indigo-500/50" 
                : "bg-white/5 border-white/10 hover:bg-white/10"
            )}
          >
            {/* Model Header */}
            <div className="flex items-center justify-between mb-2">
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1 truncate"
                onClick={() => setActiveModel(model.id)}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  activeModelId === model.id ? "bg-indigo-400" : "bg-gray-600"
                )} />
                <span className="text-sm font-medium truncate">{model.name}</span>
                {model.isLocalUrl && (
                  <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">URL</span>
                )}
              </div>
              
              <button 
                onClick={() => removeModel(model.id)}
                className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Motion Controls */}
            <div className="mt-2 pt-2 border-t border-white/10">
              {model.motionUrl ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-400 flex items-center gap-1">
                    <Music className="w-3 h-3" />
                    {model.motionFile?.name || 'Motion loaded'}
                  </span>
                  <button
                    onClick={() => removeMotionFromModel(model.id)}
                    className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 py-1 text-xs text-gray-400 hover:text-indigo-400 cursor-pointer transition-colors">
                  <Music className="w-3 h-3" />
                  Add .vmd motion
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".vmd"
                    onChange={(e) => handleMotionUpload(model.id, e)}
                  />
                </label>
              )}
            </div>
          </div>
        ))}

        {models.length === 0 && (
          <div className="text-center text-gray-500 py-4 text-sm">
            No models loaded. Click "Demo" to load Ganyu.
          </div>
        )}
      </div>
    </div>
  );
}
