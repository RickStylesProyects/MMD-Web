import { Suspense, useEffect } from 'react';
import * as React from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom, LUT } from '@react-three/postprocessing';
import { useStore } from '../store/useStore';
import { MMDCharacter } from './MMDCharacter';
import { MMDStage } from './MMDStage';
import { Environment as Env } from './Environment';
import { GodraysGroup } from './Godrays';
import { HeightFogManager } from './HeightFogManager';
import { lutManager } from '../lib/lutManager';
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
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.001}
        shadow-normalBias={0.05}
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
      
      {/* Height Fog Manager */}
      <HeightFogManager />
      
      {/* Volumetric Godrays */}
      <GodraysGroup />

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

      {/* Camera Controls - target at active model center or origin */}
      <OrbitControls 
        makeDefault 
        target={[
          activeModel ? activeModel.position[0] : 0, 
          activeModel ? activeModel.position[1] + 0.8 : 0.8, 
          activeModel ? activeModel.position[2] : 0
        ]} 
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

      {/* Models - Render all loaded models */}
      <Suspense fallback={<LoadingFallback />}>
        {models.map((model) => (
          <MMDCharacter 
            key={model.id}
            url={model.url} 
            motions={model.motions || []}
            position={model.position}
            rotation={model.rotation}
            scale={model.scale}
            isActive={model.id === activeModelId}
          />
        ))}
      </Suspense>
    </>
  );
}


// Post-Processing Component
function PostEffects() {
  const { postProcessingSettings } = useStore();
  const [lutTexture, setLutTexture] = React.useState<THREE.Data3DTexture | null>(null);
  
  // Load LUT when enabled or preset changes
  React.useEffect(() => {
    if (postProcessingSettings.useLUT) {
      const lut = lutManager.getPreset(postProcessingSettings.lutPreset);
      setLutTexture(lut);
    } else {
      setLutTexture(null);
    }

  }, [postProcessingSettings.useLUT, postProcessingSettings.lutPreset]);

  if (!postProcessingSettings.bloomEnabled && !postProcessingSettings.useLUT) return null;
  
  return (
    <EffectComposer disableNormalPass>
      {postProcessingSettings.bloomEnabled && (
        <Bloom 
          luminanceThreshold={postProcessingSettings.bloomThreshold} 
          mipmapBlur 
          intensity={postProcessingSettings.bloomIntensity}
          radius={0.8}
          levels={4}
        />
      )}
      
      {/* LUT Color Grading */}
      {postProcessingSettings.useLUT && lutTexture && (
        <LUT lut={lutTexture} />
      )}
    </EffectComposer>
  );
}

export function Scene() {
  const { postProcessingSettings } = useStore();

  return (
    <Canvas
      className="w-full h-full"
      camera={{ position: [0, 1.2, 3], fov: 45 }}
      shadows
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.NoToneMapping, // Better for anime/NPR styles
        toneMappingExposure: postProcessingSettings.tonemappingExposure, 
        outputColorSpace: THREE.SRGBColorSpace,
        stencil: true,
        depth: true
      }}
      dpr={[1, 2]} // Dynamic pixel ratio
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <SceneContent />
      <PostEffects />
    </Canvas>
  );
}
