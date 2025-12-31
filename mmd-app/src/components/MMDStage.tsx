// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { MMDLoader } from 'three-stdlib';
import * as THREE from 'three';

interface MMDStageProps {
  url: string;
}

export function MMDStage({ url }: MMDStageProps) {
  const meshRef = useRef<THREE.Object3D | null>(null);
  const loaderRef = useRef<MMDLoader>(new MMDLoader());
  
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const loader = loaderRef.current;
    
    setIsLoading(true);
    setLoadError(null);
    
    let loadUrl = url;
    
    // If it's a blob URL from file upload, add .pmx extension hint
    if (url.startsWith('blob:')) {
      loadUrl = url + '#.pmx';
    }
    
    console.log('🏛️ Loading stage PMX:', loadUrl);
    
    loader.load(
      loadUrl,
      (loadedMesh) => {
        if (disposed) return;
        
        console.log('✅ Stage PMX loaded successfully');
        
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(loadedMesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        console.log('📐 Stage size:', size.x.toFixed(2), 'x', size.y.toFixed(2), 'x', size.z.toFixed(2));
        console.log('📍 Stage center:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2));
        
        // Replace complex materials with simple ones to avoid shader errors
        loadedMesh.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = false; // Stages don't need to cast shadows usually
            m.receiveShadow = true;
            
            // Convert materials to simpler MeshLambertMaterial to avoid shader errors
            const convertMaterial = (oldMat: any) => {
              const newMat = new THREE.MeshLambertMaterial({
                color: oldMat.color ? oldMat.color.clone() : new THREE.Color(0xcccccc),
                map: oldMat.map || null,
                side: THREE.DoubleSide,
                transparent: oldMat.transparent || false,
                opacity: oldMat.opacity !== undefined ? oldMat.opacity : 1.0,
              });
              return newMat;
            };
            
            if (Array.isArray(m.material)) {
              m.material = m.material.map(convertMaterial);
            } else if (m.material) {
              m.material = convertMaterial(m.material);
            }
          }
        });
        
        meshRef.current = loadedMesh;
        setObject(loadedMesh);
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
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#22c55e" wireframe />
      </mesh>
    );
  }
  
  if (loadError) {
    console.error("Stage load error:", loadError);
    return (
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
  }
  
  if (!object) return null;
  
  // Stage scale - Genshin stages are typically very large
  // Try scale 0.05 for a smaller initial view
  return (
    <primitive 
      object={object} 
      dispose={null} 
      scale={0.05}
      position={[0, -10, 0]}
    />
  );
}
