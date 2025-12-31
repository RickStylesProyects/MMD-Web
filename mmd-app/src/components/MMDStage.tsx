// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { MMDLoader } from 'three-stdlib';
import * as THREE from 'three';

interface MMDStageProps {
  url: string;
}

export function MMDStage({ url }: MMDStageProps) {
  const { scene } = useThree();
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const loaderRef = useRef<MMDLoader>(new MMDLoader());
  
  const [mesh, setMesh] = useState<THREE.SkinnedMesh | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const loader = loaderRef.current;
    
    const loadStage = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // Determine the actual URL to use
        let loadUrl = url;
        
        // If it's a blob URL from file upload, add .pmx extension hint
        if (url.startsWith('blob:')) {
          loadUrl = url + '#.pmx';
        }
        
        console.log('🏛️ Loading stage:', loadUrl);
        
        loader.load(
          loadUrl,
          (loadedMesh) => {
            if (disposed) return;
            
            console.log('✅ Stage loaded successfully');
            
            // Keep original materials for stages (no toon shader)
            loadedMesh.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                m.castShadow = true;
                m.receiveShadow = true;
                
                // Ensure materials render properly
                if (Array.isArray(m.material)) {
                  m.material.forEach((mat) => {
                    if (mat instanceof THREE.MeshPhongMaterial || 
                        mat instanceof THREE.MeshStandardMaterial ||
                        mat instanceof THREE.MeshBasicMaterial) {
                      mat.side = THREE.DoubleSide;
                    }
                  });
                } else if (m.material) {
                  m.material.side = THREE.DoubleSide;
                }
              }
            });
            
            meshRef.current = loadedMesh;
            setMesh(loadedMesh);
            setIsLoading(false);
          },
          (progress) => {
            if (progress.total > 0) {
              const pct = (progress.loaded / progress.total * 100).toFixed(1);
              console.log(`📦 Stage loading: ${pct}%`);
            }
          },
          (error) => {
            if (disposed) return;
            console.error('❌ Stage load error:', error);
            setLoadError(error.message || 'Failed to load stage');
            setIsLoading(false);
          }
        );
      } catch (err) {
        if (disposed) return;
        console.error('❌ Stage load exception:', err);
        setLoadError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };
    
    loadStage();
    
    return () => {
      disposed = true;
      if (meshRef.current) {
        meshRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            if (m.geometry) m.geometry.dispose();
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => mat.dispose());
            } else if (m.material) {
              m.material.dispose();
            }
          }
        });
      }
    };
  }, [url]);

  if (isLoading) {
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a9eff" wireframe />
      </mesh>
    );
  }
  
  if (loadError) {
    console.error("Stage load error:", loadError);
    return (
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
  }
  
  if (!mesh) return null;
  
  // Stage scale - typically smaller than character scale
  // Stages are usually 10x larger than characters so we use 0.01
  return (
    <primitive 
      object={mesh} 
      dispose={null} 
      scale={0.01}
      position={[0, 0, 0]}
    />
  );
}
