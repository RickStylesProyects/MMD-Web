import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment as DreiEnvironment } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { MMDCharacter } from './MMDCharacter';
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

// Balanced anime-style lighting - softer to preserve colors
function AnimeStyleLighting() {
  return (
    <>
      {/* Key Light - Main light from front, reduced intensity */}
      <directionalLight 
        position={[2, 5, -8]} 
        intensity={1.0} 
        color="#fff8f0"
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
        intensity={0.4} 
        color="#ffffff"
      />
      
      {/* Fill Light - Left side, very soft */}
      <directionalLight 
        position={[-4, 4, -4]} 
        intensity={0.25} 
        color="#c8d8ff"
      />
      
      {/* Rim Light - Behind for edge glow */}
      <directionalLight 
        position={[0, 4, 6]} 
        intensity={0.35} 
        color="#ffeedd"
      />
      
      {/* Ambient - Reduced for better contrast */}
      <ambientLight intensity={0.3} color="#8888a0" />
      
      {/* Hemisphere for subtle gradient */}
      <hemisphereLight 
        args={['#b0c0e0', '#404060', 0.3]} 
      />
    </>
  );
}

export function Scene() {
  const { activeModelId, models } = useStore();
  const activeModel = models.find(m => m.id === activeModelId);

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
      {/* Background gradient */}
      <Env />

      {/* Anime-style three-point lighting */}
      <AnimeStyleLighting />

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
        maxDistance={10}
        enablePan={true}
        enableDamping={true}
        dampingFactor={0.05}
      />

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

    </Canvas>
  );
}
