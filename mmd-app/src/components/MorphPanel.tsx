import React from 'react';
import { useStore } from '../store/useStore';
import { X, Smile } from 'lucide-react';
import { cn } from '../lib/utils';

export function MorphPanel() {
  const { 
    models, 
    activeMorphPanelModelId,
    setActiveMorphPanel,
    updateModelMorph 
  } = useStore();

  if (!activeMorphPanelModelId) return null;

  const model = models.find(m => m.id === activeMorphPanelModelId);
  if (!model) return null;

  return (
    <div className="fixed top-20 right-4 z-50 w-80 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl animate-in fade-in slide-in-from-right-10 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Smile className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-white">Facial Morphs</h3>
            <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{model.name}</p>
          </div>
        </div>
        <button 
          onClick={() => setActiveMorphPanel(null)}
          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
        {(!model.availableMorphs || model.availableMorphs.length === 0) ? (
            <div className="text-center text-gray-500 text-xs py-8">
                No morphs available for this model.
            </div>
        ) : (
            model.availableMorphs.map((morphName) => (
                <div key={morphName} className="space-y-1.5 bg-white/5 p-3 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-colors">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span className="font-medium truncate pr-2" title={morphName}>{morphName}</span>
                    <span className="font-mono text-indigo-300">{(model.activeMorphs?.[morphName] || 0).toFixed(2)}</span>
                  </div>
                  <div className="relative h-4 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={model.activeMorphs?.[morphName] || 0}
                        onChange={(e) => updateModelMorph(model.id, morphName, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                  </div>
                </div>
              ))
        )}
      </div>
    </div>
  );
}
