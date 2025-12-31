import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {  Box, 
  Search,
  Trash2, 
  Upload, 
  Music, 
  FolderOpen,
  Eye,
  EyeOff,
  Move,
  Layers,
  PlayCircle,
  MapPin,
  Smile
} from 'lucide-react';
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
    // Stage actions
    stages,
    activeStageId,
    addStage,
    addStageFromUrl,
    removeStage,
    setActiveStage,
    // Audio actions
    setAudio,
    removeAudio,
    setAudioDelay,
    toggleModelVisibility,
    toggleMotion,
    updateModelTransform,
    audioState,
    addMotionToModel, // Kept this as it's used in the new UI
    addMotionFromUrl,
    updateModelMorph,
    setActiveMorphPanel,
    activeMorphPanelModelId
  } = useStore();

  const [expandedTransformId, setExpandedTransformId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'models' | 'stages' | 'audio'>('models');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addModel(e.target.files[0]);
    }
  };

  const handleStageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addStage(e.target.files[0]);
    }
  };
  
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAudio(e.target.files[0]);
    }
  };





  return (
    <div className="absolute top-4 left-4 z-10 w-80 bg-black/80 backdrop-blur-md text-white p-4 rounded-xl border border-white/10 shadow-xl">
      {/* Section Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveSection('models')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors",
            activeSection === 'models' 
              ? "bg-indigo-500 text-white" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          )}
        >
          <Search className="w-4 h-4" />
          Models
        </button>
        <button
          onClick={() => setActiveSection('stages')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors",
            activeSection === 'stages' 
              ? "bg-indigo-500 text-white" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Stages
        </button>
        <button
          onClick={() => setActiveSection('audio')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors",
            activeSection === 'audio' 
              ? "bg-indigo-500 text-white" 
              : "bg-white/5 text-gray-400 hover:bg-white/10"
          )}
        >
          <Music className="w-4 h-4" />
          Audio
        </button>
      </div>

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
            <PlayCircle className="w-4 h-4 text-indigo-400" />
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

      {/* ============ MODELS SECTION ============ */}
      {activeSection === 'models' && (
        <>
          {/* Model Upload */}
          <div className="mb-4 space-y-2">
            {/* Model Upload - Electron vs Web logic */}
            {window.electron ? (
              <button 
                onClick={async () => {
                  if (window.electron) {
                    const result = await window.electron.openFile({
                      filters: [{ name: 'MMD Models', extensions: ['pmx', 'pmd'] }]
                    });
                    if (result) {
                      const fullPath = 'file://' + result.path.replace(/\\/g, '/');
                      addModelFromUrl(result.name, fullPath);
                    }
                  }
                }}
                className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-white/5 transition-colors group"
              >
                <div className="flex flex-col items-center justify-center py-3">
                  <Box className="w-6 h-6 mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-gray-400 group-hover:text-white transition-colors">Open Model (.pmx)</p>
                </div>
              </button>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-white/5 transition-colors group">
                <div className="flex flex-col items-center justify-center py-3">
                  <Upload className="w-6 h-6 mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <p className="text-xs text-gray-400 group-hover:text-white transition-colors">Upload .pmx file</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pmx,.pmd"
                />
              </label>
            )}

            {/* Debug Demo Button - Ganyu Local */}
             <button
                onClick={() => {
                  // Use relative paths from public/demo folder
                  const modelId = addModelFromUrl('Ganyu (Debug)', '/demo/Ganyu/Ganyu.pmx');
                  
                  if (modelId) {
                      setTimeout(() => {
                           addMotionFromUrl(modelId as any, 'Hip Swing', '/demo/Motions/Hip_swing.vmd');
                           setActiveModel(modelId as any);
                      }, 200);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-xs text-indigo-300 transition-colors border border-indigo-500/30 font-bold"
                title="Load Ganyu + Hip Swing from D:/MMD"
              >
                <PlayCircle className="w-4 h-4" />
                Demo: Ganyu (Local)
              </button>
          </div>

          {/* Model List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {models.map((model) => (
              <div 
                key={model.id}
                onClick={() => setActiveModel(model.id)}
                className={`relative p-3 rounded-xl border transition-all duration-200 cursor-pointer group ${
                  model.id === activeModelId 
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      model.id === activeModelId ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
                    }`}>
                      <Box className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-medium truncate duration-200 ${
                      model.id === activeModelId ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                    }`}>
                      {model.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Morph Panel Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle: if open for this model -> close. Else -> open.
                        setActiveMorphPanel(activeMorphPanelModelId === model.id ? null : model.id);
                      }}
                       className={`p-1.5 rounded-lg transition-colors ${
                          activeMorphPanelModelId === model.id 
                            ? 'text-indigo-400 bg-indigo-400/10' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                       }`}
                      title="Facial Morphs"
                    >
                      <Smile className="w-4 h-4" />
                    </button>

                    {/* Transform Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTransformId(curr => curr === model.id ? null : model.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                         expandedTransformId === model.id 
                           ? 'text-indigo-400 bg-indigo-400/10' 
                           : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                      title="Move / Scale"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModelVisibility(model.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title={model.visible ? "Hide" : "Show"}
                    >
                      {model.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeModel(model.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>



                {/* Expanded Controls for Active Model (Just Motions) */}
                {model.id === activeModelId && (
                  <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-1 cursor-default" onClick={e => e.stopPropagation()}>
                    
                    {/* Motions List ONLY (Transform removed) */}

                    {/* Motions List */}
                    <div className="bg-black/20 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between text-xs font-medium text-indigo-300">
                        <div className="flex items-center gap-2"><Layers className="w-3 h-3" /> ACTIONS</div>
                        <label className="cursor-pointer hover:text-white transition-colors text-[10px] bg-white/10 px-2 py-1 rounded">
                           + ADD VMD
                           <input 
                             type="file" 
                             accept=".vmd"
                             className="hidden"
                             onChange={(e) => {
                               if (e.target.files?.[0]) {
                                 addMotionToModel(model.id, e.target.files[0]);
                               }
                             }}
                           />
                        </label>
                      </div>

                      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {(model.motions || []).length === 0 && !model.motionUrl ? (
                           <div className="text-[10px] text-gray-500 text-center py-2 italic">
                             No actions loaded
                           </div>
                        ) : (
                          <>
                            {/* New List */}
                            {(model.motions || []).map(motion => (
                              <div 
                                key={motion.id}
                                onClick={() => toggleMotion(model.id, motion.id)}
                                className={`flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer ${
                                  motion.active 
                                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30' 
                                    : 'hover:bg-white/5 text-gray-400'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <PlayCircle className={`w-3 h-3 ${motion.active ? 'text-indigo-400' : ''}`} />
                                  <span className="truncate max-w-[120px]">{motion.name}</span>
                                </div>
                                {motion.active && <span className="text-[8px] bg-indigo-500 px-1 rounded text-white">ON</span>}
                              </div>
                            ))}
                            
                            {/* Legacy Support (if url present but motions empty) */}
                            {(!model.motions || model.motions.length === 0) && model.motionUrl && (
                               <div className="flex items-center justify-between p-2 rounded text-xs bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                                  <span className="truncate">Legacy Motion</span>
                                  <span className="text-[8px] bg-indigo-500 px-1 rounded text-white">ACTIVE</span>
                               </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {models.length === 0 && (
              <div className="text-center text-gray-500 py-4 text-sm">
                No models loaded. Click "Demo" to load Ganyu.
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ STAGES SECTION ============ */}
      {activeSection === 'stages' && (
        <>
          {/* Stage Upload */}
          <div className="mb-4 space-y-2">
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-green-500 hover:bg-white/5 transition-colors">
              <div className="flex flex-col items-center justify-center py-3">
                <MapPin className="w-6 h-6 mb-1 text-green-400" />
                <p className="text-xs text-gray-400">Upload stage .pmx file</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".pmx"
                onChange={handleStageUpload}
              />
            </label>
            
            {/* Demo Stage Button */}
            <button
              onClick={() => addStageFromUrl('Mondstadt Stage', '/stages/Mondstadt/MondstadtCity_LowerPart1.pmx')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-xs text-green-300 transition-colors border border-green-500/30"
              title="Load Mondstadt demo stage"
            >
              <FolderOpen className="w-4 h-4" />
              Demo: Mondstadt
            </button>
          </div>

          {/* Stage List */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {stages.map((stage) => (
              <div 
                key={stage.id} 
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  activeStageId === stage.id 
                    ? "bg-green-500/20 border-green-500/50" 
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 cursor-pointer flex-1 truncate"
                    onClick={() => setActiveStage(stage.id)}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      activeStageId === stage.id ? "bg-green-400" : "bg-gray-600"
                    )} />
                    <span className="text-sm font-medium truncate">{stage.name}</span>
                  </div>
                  
                  <button 
                    onClick={() => {
                      removeStage(stage.id);
                    }}
                    className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Clear Stage Button */}
            {activeStageId && (
              <button
                onClick={() => setActiveStage(null)}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Clear Stage
              </button>
            )}

            {stages.length === 0 && (
              <div className="text-center text-gray-500 py-4 text-sm">
                No stages loaded. Upload a stage .pmx file.
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ AUDIO SECTION ============ */}
      {activeSection === 'audio' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-white/5 transition-colors">
              <div className="flex flex-col items-center justify-center py-3">
                <Music className="w-6 h-6 mb-1 text-indigo-400" />
                <p className="text-xs text-gray-400">Upload Music (.mp3/wav)</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept=".mp3,.wav,.ogg"
                onChange={handleAudioUpload}
              />
            </label>

            {audioState.url ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Music className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-medium truncate">{audioState.file?.name || 'Audio Loaded'}</span>
                      <span className="text-xs text-green-400">Ready to play</span>
                    </div>
                  </div>
                  <button 
                    onClick={removeAudio} 
                    className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-md transition-colors"
                    title="Remove audio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Delay Control */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Audio Offset (Delay)</span>
                    <span className="font-mono text-indigo-300">{audioState.delay.toFixed(2)}s</span>
                  </div>
                  <input 
                    type="range"
                    min="-2.0" 
                    max="2.0" 
                    step="0.05"
                    value={audioState.delay || 0}
                    onChange={(e) => setAudioDelay(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-500">
                    <span>Early (-2s)</span>
                    <span>Late (+2s)</span>
                  </div>
                </div>
              </div>
            ) : (
               <div className="text-center text-gray-500 py-4 text-sm border border-dashed border-white/5 rounded-lg">
                  No audio loaded.<br/>Music will sync with animation timeline.
               </div>
            )}
          </div>
        </div>
      )}

      {/* GLOBAL FLOATING TRANSFORM PANEL */}
      {expandedTransformId && (() => {
         const model = models.find(m => m.id === expandedTransformId);
         if (!model) return null;
         return (
             <div className="absolute left-[102%] top-20 w-64 bg-[#1a1a2e] border border-white/20 rounded-xl p-4 shadow-2xl z-[100] border-l-4 border-l-indigo-500">
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                       <Move className="w-3 h-3 text-indigo-400" /> {model.name}
                    </span>
                    <button onClick={() => setExpandedTransformId(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                
                <div className="space-y-4">
                  {/* Position Sliders */}
                  {['X', 'Y', 'Z'].map((axis, i) => (
                    <div key={axis} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-4 font-mono font-bold text-indigo-300">{axis}</span>
                      <input 
                        type="range"
                        min="-10" max="10" step="0.1"
                        value={model.position[i]}
                        onChange={(e) => {
                          const newPos = [...model.position] as [number, number, number];
                          newPos[i] = parseFloat(e.target.value);
                          updateModelTransform(model.id, newPos);
                        }}
                        className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                      />
                      <span className="text-[10px] text-gray-400 w-8 text-right font-mono">{model.position[i].toFixed(1)}</span>
                    </div>
                  ))}
                  
                  {/* Scale */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 w-4 font-mono font-bold text-indigo-300">S</span>
                    <input 
                      type="range"
                      min="0.1" max="2" step="0.05"
                      value={model.scale}
                      onChange={(e) => updateModelTransform(model.id, undefined, undefined, parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                    />
                     <span className="text-[10px] text-gray-400 w-8 text-right font-mono">{model.scale.toFixed(2)}</span>
                  </div>

                  {/* Morphs Section */}
                  {(model.availableMorphs || []).length > 0 && (
                      <div className="pt-4 mt-2 border-t border-white/10">
                          <div className="text-xs text-gray-400 mb-2 font-bold flex items-center gap-2">
                             <Layers className="w-3 h-3" /> Morphs ({model.availableMorphs!.length})
                          </div>
                          <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                              {model.availableMorphs!.map(morph => (
                                  <div key={morph} className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-gray-400">
                                          <span className="truncate max-w-[140px] text-gray-300" title={morph}>{morph}</span>
                                          <span className="font-mono text-indigo-300 text-[9px]">
                                              {(model.activeMorphs?.[morph] || 0).toFixed(2)}
                                          </span>
                                      </div>
                                      <input 
                                          type="range"
                                          min="0" max="1" step="0.01"
                                          value={model.activeMorphs?.[morph] || 0}
                                          onChange={(e) => updateModelMorph(model.id, morph, parseFloat(e.target.value))}
                                          className="w-full accent-indigo-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer hover:bg-white/20 transition-colors"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
                </div>
             </div>
         );
      })()}
    </div>
  );
}
