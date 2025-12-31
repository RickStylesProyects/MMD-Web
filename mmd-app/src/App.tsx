import { Scene } from './components/Scene';
import { ModelManager } from './components/ModelManager';
import { AmmoProvider } from './components/AmmoProvider';
import { SettingsPanel } from './components/SettingsPanel';
import { AnimationPlayer } from './components/AnimationPlayer';

import { AudioController } from './components/AudioController';

import { ErrorBoundary } from './components/ErrorBoundary';
import { MorphPanel } from './components/MorphPanel';

function App() {
  return (
    <ErrorBoundary>
      <div className="w-full h-screen relative overflow-hidden bg-black">
        <AmmoProvider>
          <AudioController />
          {/* Left Panel - Models & Stages */}
          <ModelManager />
          
          {/* Right Panel - Settings */}
          <SettingsPanel />

          {/* Morph Panel (Floating) */}
          <MorphPanel />
          
          {/* 3D Scene */}
          <div className="w-full h-full">
            <Scene />
          </div>
          
          {/* Bottom - Animation Player */}
          <AnimationPlayer />
        </AmmoProvider>
        
        {/* Footer / Overlay Info */}
        <div className="absolute bottom-4 right-4 text-white/30 text-xs pointer-events-none">
          MMD Studio - v0.3.1 (Electron Ready)
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
