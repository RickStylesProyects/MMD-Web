import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// ============ INTERFACES ============

export interface MMDModel {
  id: string;
  name: string;
  url: string;
  file?: File;
  motionUrl?: string; // Currently playing motion
  motionFile?: File;
  motions: { id: string; name: string; url: string; file?: File; active: boolean }[]; // List of available motions
  activeMotionId: string | null; // Deprecated, but keeping for compatibility if needed temporarily
  
  // Morphs
  activeMorphs?: Record<string, number>;
  availableMorphs?: string[];
  isLocalUrl?: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  visible: boolean;
}

export interface UIState {
  activeMorphPanelModelId: string | null;
}

export interface Stage {
  id: string;
  name: string;
  url: string;
  file?: File;
  isLocalUrl?: boolean;
}

export interface LightSettings {
  keyIntensity: number;
  keyColor: string;
  keyPosition: [number, number, number];
  fillIntensity: number;
  fillColor: string;
  ambientIntensity: number;
  ambientColor: string;
  rimIntensity: number;
  rimColor: string;
}

export interface ShaderSettings {
  shadowDarkness: number;
  shadowThreshold: number;
  shadowSoftness: number;
  rimStrength: number;
  specularStrength: number;
  outlineThickness: number;
}

export interface AnimationState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  loop: boolean;
}

export interface AudioState {
  file: File | null;
  url: string | null;
  duration: number;
  volume: number;
  delay: number;
}

export interface MMDStore {
  // Models
  models: MMDModel[];
  activeModelId: string | null;
  activeMorphPanelModelId: string | null;
  
  // Stages
  stages: Stage[];
  activeStageId: string | null;
  
  // Background
  backgroundColor1: string;
  backgroundColor2: string;
  backgroundAnimated: boolean;
  
  // Lighting
  lightSettings: LightSettings;
  
  // Shader
  shaderSettings: ShaderSettings;
  
  // Animation Player
  animationState: AnimationState;
  
  // Audio
  audioState: AudioState;
  
  // Model Actions
  addModel: (file: File) => void;
  addModelFromUrl: (name: string, url: string) => void;
  removeModel: (id: string) => void;
  setActiveModel: (id: string) => void;
  setActiveModel: (id: string) => void;
  addMotionToModel: (modelId: string, file: File) => void;
  addMotionFromUrl: (modelId: string, name: string, url: string) => void;
  removeMotionFromModel: (modelId: string) => void;
  
  // Morph Actions
  setAvailableMorphs: (modelId: string, morphs: string[]) => void;
  updateModelMorph: (modelId: string, morphName: string, value: number) => void;
  setActiveMorphPanel: (id: string | null) => void;

  // Stage Actions
  addStage: (file: File) => void;
  addStageFromUrl: (name: string, url: string) => void;
  removeStage: (id: string) => void;
  setActiveStage: (id: string | null) => void;
  
  // Background Actions
  setBackgroundColor1: (color: string) => void;
  setBackgroundColor2: (color: string) => void;
  setBackgroundAnimated: (animated: boolean) => void;
  
  // Lighting Actions
  setLightSettings: (settings: Partial<LightSettings>) => void;
  
  // Shader Actions
  setShaderSettings: (settings: Partial<ShaderSettings>) => void;
  
  // Animation Actions
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleLoop: () => void;
  resetAnimation: () => void;

  // Audio Actions
  setAudio: (file: File) => void;
  removeAudio: () => void;
  setAudioVolume: (volume: number) => void;
  setAudioDelay: (delay: number) => void;
  toggleModelVisibility: (id: string) => void;
  toggleMotion: (modelId: string, motionId: string) => void;
  updateModelTransform: (id: string, pos?: [number,number,number], rot?: [number,number,number], scale?: number) => void;
}

// ============ DEFAULT VALUES ============

const defaultLightSettings: LightSettings = {
  keyIntensity: 1.0,
  keyColor: '#fff8f0',
  keyPosition: [2, 5, -8],
  fillIntensity: 0.25,
  fillColor: '#c8d8ff',
  ambientIntensity: 0.3,
  ambientColor: '#8888a0',
  rimIntensity: 0.35,
  rimColor: '#ffeedd',
};

const defaultShaderSettings: ShaderSettings = {
  shadowDarkness: 0.35,
  shadowThreshold: 0.45,
  shadowSoftness: 0.08,
  rimStrength: 0.8,
  specularStrength: 0.3,
  outlineThickness: 0.02,
};

const defaultAnimationState: AnimationState = {
  isPlaying: true,
  currentTime: 0,
  duration: 0,
  playbackSpeed: 1.0,
  loop: true,
};

const defaultAudioState: AudioState = {
  file: null,
  url: null,
  duration: 0,
  volume: 0.5,
  delay: 0,
};

// ============ STORE ============

export const useStore = create<MMDStore>()(
  persist(
    (set) => ({
      // Initial state
      models: [],
      activeModelId: null,
      activeMorphPanelModelId: null,
      stages: [],
      activeStageId: null,
      backgroundColor1: '#1a1a2e',
      backgroundColor2: '#16213e',
      backgroundAnimated: true,
      lightSettings: defaultLightSettings,
      shaderSettings: defaultShaderSettings,
      animationState: defaultAnimationState,
      audioState: defaultAudioState,
      
      // Model Actions
      addModel: (file: File) => {
        let url = '';
        if (file.path) {
          // Electron path - custom protocol for textures
          // @ts-ignore
          url = 'file://' + file.path.replace(/\\/g, '/');
        } else {
          url = URL.createObjectURL(file);
        }

        const newModel: MMDModel = {
          id: uuidv4(),
          name: file.name,
          url,
          file,
          isLocalUrl: false,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: 1,
          visible: true,
          motions: [],
          activeMotionId: null,
          activeMorphs: {},
          availableMorphs: []
        };
        set((state) => ({ 
          models: [...state.models, newModel],
          activeModelId: state.activeModelId ? state.activeModelId : newModel.id 
        }));
      },
      
      addModelFromUrl: (name: string, url: string) => {
        const id = uuidv4();
        const newModel: MMDModel = {
          id,
          name,
          url,
          isLocalUrl: true,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: 1,
          visible: true,
          motions: [],
          activeMotionId: null,
          activeMorphs: {},
          availableMorphs: []
        };
        set((state) => ({ 
          models: [...state.models, newModel],
          activeModelId: state.activeModelId ? state.activeModelId : newModel.id 
        }));
        return id;
      },
      
      removeModel: (id: string) => {
        set((state) => {
          const model = state.models.find((m) => m.id === id);
          if (model && !model.isLocalUrl) {
            URL.revokeObjectURL(model.url);
            if (model.motionUrl) {
              URL.revokeObjectURL(model.motionUrl);
            }
          }
          const newModels = state.models.filter((m) => m.id !== id);
          return {
            models: newModels,
            activeModelId: state.activeModelId === id 
              ? (newModels.length > 0 ? newModels[0].id : null) 
              : state.activeModelId
          };
        });
      },
      
      setActiveModel: (id: string) => set({ activeModelId: id }),
      
      addMotionToModel: (modelId: string, file: File) => {
        let motionUrl = '';
        // @ts-ignore
        if (file.path) {
           // @ts-ignore
           motionUrl = 'file://' + file.path.replace(/\\/g, '/');
        } else {
           motionUrl = URL.createObjectURL(file);
        }
        
        const newMotion = { id: uuidv4(), name: file.name, url: motionUrl, file, active: true };
        
        set((state) => ({
          models: state.models.map((m) => {
            if (m.id === modelId) {
              return { 
                ...m, 
                motions: [...(m.motions || []), newMotion],
                activeMotionId: newMotion.id, // Still set for UI highlight logic initially
              };
            }
            return m;
          }),
          animationState: { ...state.animationState, isPlaying: true, currentTime: 0 }
        }));
      },
      
      addMotionFromUrl: (modelId: string, name: string, url: string) => {
        console.log("Adding motion from URL:", { modelId, name, url });
        const newMotion = { id: uuidv4(), name, url, active: true };
        
        set((state) => {
           const modelExists = state.models.find(m => m.id === modelId);
           console.log("Model found in store?", !!modelExists, state.models.map(m => m.id));
           
           return {
              models: state.models.map((m) => {
                if (m.id === modelId) {
                  return { 
                    ...m, 
                    motions: [...(m.motions || []), newMotion],
                    activeMotionId: newMotion.id,
                  };
                }
                return m;
              }),
              animationState: { ...state.animationState, isPlaying: true, currentTime: 0 }
           };
        });
      },
      
      removeMotionFromModel: (modelId: string) => {
        set((state) => ({
          models: state.models.map((m) => {
            if (m.id === modelId && m.motionUrl) {
              URL.revokeObjectURL(m.motionUrl);
              return { ...m, motionUrl: undefined, motionFile: undefined };
            }
            return m;
          }),
          animationState: defaultAnimationState
        }));
      },

      setAvailableMorphs: (modelId: string, morphs: string[]) => set((state) => ({
        models: state.models.map(m => m.id === modelId ? { ...m, availableMorphs: morphs } : m)
      })),

      updateModelMorph: (modelId: string, morphName: string, value: number) => set((state) => ({
        models: state.models.map(m => {
          if (m.id === modelId) {
             const newMorphs = { ...m.activeMorphs, [morphName]: value };
             return { ...m, activeMorphs: newMorphs };
          }
          return m;
        })
      })),
      
      // Stage Actions
      addStage: (file: File) => {
        let url = '';
        // @ts-ignore
        if (file.path) {
           // @ts-ignore
           url = 'file://' + file.path.replace(/\\/g, '/');
        } else {
           url = URL.createObjectURL(file);
        }
        const newStage: Stage = {
          id: uuidv4(),
          name: file.name,
          url,
          file,
          isLocalUrl: false,
        };
        set((state) => ({ 
          stages: [...state.stages, newStage],
          activeStageId: newStage.id
        }));
      },
      
      addStageFromUrl: (name: string, url: string) => {
        const newStage: Stage = {
          id: uuidv4(),
          name,
          url,
          isLocalUrl: true,
        };
        set((state) => ({ 
          stages: [...state.stages, newStage],
          activeStageId: newStage.id
        }));
      },
      
      removeStage: (id: string) => {
        set((state) => {
          const stage = state.stages.find((s) => s.id === id);
          if (stage && !stage.isLocalUrl) {
            URL.revokeObjectURL(stage.url);
          }
          const newStages = state.stages.filter((s) => s.id !== id);
          return {
            stages: newStages,
            activeStageId: state.activeStageId === id ? null : state.activeStageId
          };
        });
      },
      
      setActiveStage: (id: string | null) => set({ activeStageId: id }),
      
      // Background Actions
      setBackgroundColor1: (color: string) => set({ backgroundColor1: color }),
      setBackgroundColor2: (color: string) => set({ backgroundColor2: color }),
      setBackgroundAnimated: (animated: boolean) => set({ backgroundAnimated: animated }),
      
      // Lighting Actions
      setLightSettings: (settings: Partial<LightSettings>) => 
        set((state) => ({ 
          lightSettings: { ...state.lightSettings, ...settings } 
        })),
      
      // Shader Actions
      setShaderSettings: (settings: Partial<ShaderSettings>) => 
        set((state) => ({ 
          shaderSettings: { ...state.shaderSettings, ...settings } 
        })),
      
      // Animation Actions
      setPlaying: (playing: boolean) => 
        set((state) => ({ 
          animationState: { ...state.animationState, isPlaying: playing } 
        })),
      
      setCurrentTime: (time: number) => 
        set((state) => ({ 
          animationState: { ...state.animationState, currentTime: time } 
        })),
      
      setDuration: (duration: number) => 
        set((state) => ({ 
          animationState: { ...state.animationState, duration } 
        })),
      
      setPlaybackSpeed: (speed: number) => 
        set((state) => ({ 
          animationState: { ...state.animationState, playbackSpeed: speed } 
        })),
      
      toggleLoop: () => 
        set((state) => ({ 
          animationState: { ...state.animationState, loop: !state.animationState.loop } 
        })),
      
      resetAnimation: () => 
        set((state) => ({ 
          animationState: { ...state.animationState, currentTime: 0, isPlaying: false } 
        })),

      // Audio Actions
      setAudio: (file: File) => {
        const url = URL.createObjectURL(file);
        set((state) => {
          if (state.audioState.url) URL.revokeObjectURL(state.audioState.url);
          return {
            audioState: { ...state.audioState, file, url, duration: 0 }
          };
        });
      },

      removeAudio: () => {
        set((state) => {
          if (state.audioState.url) URL.revokeObjectURL(state.audioState.url);
          return { audioState: defaultAudioState };
        });
      },

      setAudioVolume: (volume: number) => set((state) => ({
        audioState: { ...state.audioState, volume }
      })),

      setAudioDelay: (delay: number) => set((state) => ({
        audioState: { ...state.audioState, delay }
      })),

      // Morph Actions (New)
      setAvailableMorphs: (modelId: string, morphs: string[]) => set((state) => ({
        models: state.models.map(m => m.id === modelId ? { ...m, availableMorphs: morphs } : m)
      })),
      
      updateModelMorph: (modelId: string, morphName: string, value: number) => set((state) => ({
        models: state.models.map(m => {
            if (m.id === modelId) {
                const newActiveMorphs = { ...(m.activeMorphs || {}), [morphName]: value };
                return { ...m, activeMorphs: newActiveMorphs };
            }
            return m;
        })
      })),

      setActiveMorphPanel: (id: string | null) => set({ activeMorphPanelModelId: id }),

      // Transform Actions
      updateModelTransform: (id: string, pos?: [number,number,number], rot?: [number,number,number], scale?: number) => set((state) => ({
        models: state.models.map(m => {
          if (m.id !== id) return m;
          return {
            ...m,
            position: pos ?? m.position,
            rotation: rot ?? m.rotation,
            scale: scale ?? m.scale
          };
        })
      })),

      toggleModelVisibility: (id: string) => set((state) => ({
        models: state.models.map(m => m.id === id ? { ...m, visible: !m.visible } : m)
      })),

      toggleMotion: (modelId: string, motionId: string) => set((state) => ({
        models: state.models.map(m => {
          if (m.id === modelId) {
            return {
              ...m,
              motions: m.motions.map(mot => 
                mot.id === motionId ? { ...mot, active: !mot.active } : mot
              )
            };
          }
          return m;
        }),
        // Don't reset time on toggle, allow blending/adding dynamically
      })),
    }),
    {
      name: 'mmd-storage', // unique name
      partialize: (state) => ({ 
        // Only persist settings vs transient data
        lightSettings: state.lightSettings,
        shaderSettings: state.shaderSettings,
        backgroundColor1: state.backgroundColor1,
        backgroundColor2: state.backgroundColor2,
        backgroundAnimated: state.backgroundAnimated,
        animationState: {
          ...defaultAnimationState,
          playbackSpeed: state.animationState.playbackSpeed,
          loop: state.animationState.loop
        }
      }),
    }
  )
);
