import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface MMDModel {
  id: string;
  name: string;
  url: string;
  file?: File; // Optional - not present for URL-loaded models
  motionUrl?: string;
  motionFile?: File;
  isLocalUrl?: boolean; // True if loaded from public folder
}

export interface MMDStore {
  models: MMDModel[];
  activeModelId: string | null;
  
  // Background settings
  backgroundColor1: string;
  backgroundColor2: string;
  backgroundAnimated: boolean;
  
  // Actions
  addModel: (file: File) => void;
  addModelFromUrl: (name: string, url: string) => void;
  removeModel: (id: string) => void;
  setActiveModel: (id: string) => void;
  setBackgroundColor1: (color: string) => void;
  setBackgroundColor2: (color: string) => void;
  setBackgroundAnimated: (animated: boolean) => void;
  addMotionToModel: (modelId: string, file: File) => void;
  removeMotionFromModel: (modelId: string) => void;
}

export const useStore = create<MMDStore>((set) => ({
  models: [],
  activeModelId: null,
  backgroundColor1: '#1a1a2e',
  backgroundColor2: '#16213e',
  backgroundAnimated: true,
  
  addModel: (file: File) => {
    const url = URL.createObjectURL(file);
    const newModel: MMDModel = {
      id: uuidv4(),
      name: file.name,
      url,
      file,
      isLocalUrl: false,
    };
    set((state) => ({ 
      models: [...state.models, newModel],
      activeModelId: state.activeModelId ? state.activeModelId : newModel.id 
    }));
  },
  
  addModelFromUrl: (name: string, url: string) => {
    const newModel: MMDModel = {
      id: uuidv4(),
      name,
      url,
      isLocalUrl: true,
    };
    set((state) => ({ 
      models: [...state.models, newModel],
      activeModelId: state.activeModelId ? state.activeModelId : newModel.id 
    }));
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
        activeModelId: state.activeModelId === id ? (newModels.length > 0 ? newModels[0].id : null) : state.activeModelId
      };
    });
  },
  
  setActiveModel: (id: string) => set({ activeModelId: id }),
  
  setBackgroundColor1: (color: string) => set({ backgroundColor1: color }),
  setBackgroundColor2: (color: string) => set({ backgroundColor2: color }),
  setBackgroundAnimated: (animated: boolean) => set({ backgroundAnimated: animated }),
  
  addMotionToModel: (modelId: string, file: File) => {
    const motionUrl = URL.createObjectURL(file);
    set((state) => ({
      models: state.models.map((m) => 
        m.id === modelId 
          ? { ...m, motionUrl, motionFile: file }
          : m
      )
    }));
  },
  
  removeMotionFromModel: (modelId: string) => {
    set((state) => ({
      models: state.models.map((m) => {
        if (m.id === modelId && m.motionUrl) {
          URL.revokeObjectURL(m.motionUrl);
          return { ...m, motionUrl: undefined, motionFile: undefined };
        }
        return m;
      })
    }));
  },
}));
