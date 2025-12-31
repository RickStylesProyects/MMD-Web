import { Scene } from './components/Scene';
import { ModelManager } from './components/ModelManager';
import { AmmoProvider } from './components/AmmoProvider';

function App() {
  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      <AmmoProvider>
        <ModelManager />
        <div className="w-full h-full">
          <Scene />
        </div>
      </AmmoProvider>
      
      {/* Footer / Overlay Info */}
      <div className="absolute bottom-4 right-4 text-white/30 text-xs pointer-events-none">
        MMD Web App - v0.1.0
      </div>
    </div>
  );
}

export default App;
