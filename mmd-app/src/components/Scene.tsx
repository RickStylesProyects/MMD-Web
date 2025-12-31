import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { MMDCharacter } from './MMDCharacter';
import { MMDStage } from './MMDStage';
import { Environment as Env } from './Environment';
import * as THREE from 'three';

function LoadingFallback() {
  return (
    <group>
      <gridHelper args={[10, 10, 0x4444ff, 0x222244]} />
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#6366f1" wireframe />
      </mesh>
    </group>
  );
}

// Dynamic lighting component that reads from store
function DynamicLighting() {
  const { lightSettings } = useStore();
  
  return (
    <>
      {/* Key Light - Main light from front */}
      <directionalLight 
        position={lightSettings.keyPosition as [number, number, number]} 
        intensity={lightSettings.keyIntensity} 
        color={lightSettings.keyColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      
      {/* Face Light - Soft frontal */}
      <directionalLight 
        position={[0, 3, -6]} 
        intensity={lightSettings.keyIntensity * 0.4} 
        color="#ffffff"
      />
      
      {/* Fill Light */}
      <directionalLight 
        position={[-4, 4, -4]} 
        intensity={lightSettings.fillIntensity} 
        color={lightSettings.fillColor}
      />
      
      {/* Rim Light - Behind for edge glow */}
      <directionalLight 
        position={[0, 4, 6]} 
        intensity={lightSettings.rimIntensity} 
        color={lightSettings.rimColor}
      />
      
      {/* Ambient */}
      <ambientLight 
        intensity={lightSettings.ambientIntensity} 
        color={lightSettings.ambientColor} 
      />
      
      {/* Hemisphere for subtle gradient */}
      <hemisphereLight 
        args={['#b0c0e0', '#404060', 0.3]} 
      />
    </>
  );
}

// Scene content component (inside Canvas)
function SceneContent() {
  const { activeModelId, models, activeStageId, stages } = useStore();
  const activeModel = models.find(m => m.id === activeModelId);
  const activeStage = stages.find(s => s.id === activeStageId);

  return (
    <>
      {/* Background gradient */}
      <Env />

      {/* Dynamic lighting from store */}
      <DynamicLighting />

      {/* Grid Helper (subtle) */}
      <Grid 
        infiniteGrid 
        fadeDistance={20} 
        fadeStrength={2}
        sectionColor="#3f3f5f" 
        cellColor="#2f2f4f"
        sectionSize={1}
        cellSize={0.5}
      />

      {/* Camera Controls - target at model center */}
      <OrbitControls 
        makeDefault 
        target={[0, 0.8, 0]} 
        minDistance={1}
        maxDistance={100}
        enablePan={true}
        enableDamping={true}
        dampingFactor={0.05}
      />

      {/* Stage */}
      <Suspense fallback={null}>
        {activeStage && (
          <MMDStage 
            url={activeStage.url} 
            key={activeStage.id} 
          />
        )}
      </Suspense>

      {/* Model */}
      <Suspense fallback={<LoadingFallback />}>
        {activeModel && (
          <MMDCharacter 
            url={activeModel.url} 
            motionUrl={activeModel.motionUrl}
            key={activeModel.id} 
          />
        )}
      </Suspense>
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      className="w-full h-full"
      camera={{ position: [0, 1.2, 3], fov: 45 }}
      shadows
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
