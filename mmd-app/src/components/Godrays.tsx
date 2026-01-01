import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { GodrayShader } from '../shaders/GodrayShader';

interface GodraysProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/**
 * Volumetric Godrays Component
 * Creates mesh-based volumetric light rays with animated noise
 */
export function Godrays({ 
  position = [0, 10, -5], 
  rotation = [0, 0, 0],
  scale = 1.0 
}: GodraysProps) {
  const { atmosphericSettings } = useStore();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Update shader uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uIntensity.value = atmosphericSettings.godraysIntensity;
      materialRef.current.uniforms.uColor.value.set(atmosphericSettings.godraysColor);
    }
  });
  

  if (!atmosphericSettings.godraysEnabled) return null;
  
  return (
    <mesh 
      position={position} 
      rotation={rotation}
      scale={[scale, scale * 3, scale]}
    >
      {/* Cone geometry for light ray */}
      <coneGeometry args={[2, 10, 16, 1, true]} />
      
      <shaderMaterial
        ref={materialRef}
        vertexShader={GodrayShader.vertexShader}
        fragmentShader={GodrayShader.fragmentShader}
        uniforms={THREE.UniformsUtils.clone(GodrayShader.uniforms)}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Multiple Godrays Setup
 * Creates several godray instances for dynamic scenes
 */
export function GodraysGroup() {
  const { lightSettings, atmosphericSettings } = useStore();
  
  if (!atmosphericSettings.godraysEnabled) return null;
  
  // Main godray from key light position
  const keyLightAngle = Math.atan2(
    lightSettings.keyPosition[0],
    lightSettings.keyPosition[2]
  );
  
  return (
    <group>
      {/* Main godray aligned with key light */}
      <Godrays 
        position={[
          lightSettings.keyPosition[0] * 0.8,
          lightSettings.keyPosition[1] - 3,
          lightSettings.keyPosition[2] * 0.8
        ]}
        rotation={[Math.PI / 2 + 0.3, keyLightAngle, 0]}
        scale={1.2}
      />
      
      {/* Additional atmospheric rays */}
      <Godrays 
        position={[-8, 8, -10]}
        rotation={[Math.PI / 2 + 0.2, -0.5, 0]}
        scale={0.8}
      />
      
      <Godrays 
        position={[10, 9, -8]}
        rotation={[Math.PI / 2 + 0.4, 0.8, 0]}
        scale={1.0}
      />
    </group>
  );
}
