import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useStore } from '../store/useStore';
import { applyHeightFogToScene, updateHeightFogInScene } from '../lib/heightFog';
import * as THREE from 'three';

export function HeightFogManager() {
  const { scene } = useThree();
  const { atmosphericSettings } = useStore();
  
  // Initial application when scene is ready
  useEffect(() => {
    // Small delay to ensure materials are loaded
    const timer = setTimeout(() => {
      applyHeightFogToScene(scene, {
        color: new THREE.Color(atmosphericSettings.heightFogColor),
        density: atmosphericSettings.heightFogDensity,
        heightBase: atmosphericSettings.heightFogHeightBase,
        enabled: atmosphericSettings.heightFogEnabled
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [scene]);

  // Updates when settings change
  useEffect(() => {
    updateHeightFogInScene(scene, {
        color: new THREE.Color(atmosphericSettings.heightFogColor),
        density: atmosphericSettings.heightFogDensity,
        heightBase: atmosphericSettings.heightFogHeightBase,
        enabled: atmosphericSettings.heightFogEnabled
    });
  }, [
    atmosphericSettings.heightFogColor, 
    atmosphericSettings.heightFogDensity, 
    atmosphericSettings.heightFogHeightBase, 
    atmosphericSettings.heightFogEnabled
  ]);

  return null;
}
