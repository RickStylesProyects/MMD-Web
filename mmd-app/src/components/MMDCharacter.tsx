// @ts-nocheck
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { MMDLoader, MMDAnimationHelper } from 'three-stdlib';
import { SkinnedMesh, ShaderMaterial, UniformsUtils, AnimationMixer, AnimationClip } from 'three';
import { Outlines } from '@react-three/drei';
import { GenshinToonShader } from '../materials/GenshinShader';
import { useAmmo } from './AmmoProvider';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

// Simple model cache
const modelCache = new Map<string, THREE.SkinnedMesh>();
const animationCache = new Map<string, AnimationClip>();

interface MMDCharacterProps {
  url: string;
  motionUrl?: string;
}

export function MMDCharacter({ url, motionUrl }: MMDCharacterProps) {
  const { scene } = useThree();
  const { hasPhysics } = useAmmo();
  
  // Animation state from store
  const { 
    animationState, 
    setCurrentTime, 
    setDuration,
    shaderSettings,
    lightSettings
  } = useStore();
  
  // Refs
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const helperRef = useRef<MMDAnimationHelper | null>(null);
  const loaderRef = useRef<MMDLoader>(new MMDLoader());
  
  // State
  const [mesh, setMesh] = useState<THREE.SkinnedMesh | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animationLoaded, setAnimationLoaded] = useState(false);

  // Apply custom shader to materials
  const applyGenshinShader = useCallback((targetMesh: THREE.SkinnedMesh) => {
    targetMesh.traverse((child) => {
      if ((child as SkinnedMesh).isMesh) {
        const m = child as SkinnedMesh;
        m.castShadow = true;
        m.receiveShadow = true;

        const applyShader = (oldMat: any) => {
          if (oldMat.userData?.isGenshin) return oldMat;
          
          const shaderMat = new ShaderMaterial({
            uniforms: UniformsUtils.clone(GenshinToonShader.uniforms),
            vertexShader: GenshinToonShader.vertexShader,
            fragmentShader: GenshinToonShader.fragmentShader,
            lights: true,
            transparent: true,
            side: THREE.DoubleSide,
          });

          if (oldMat.map) {
            shaderMat.uniforms.uMap.value = oldMat.map;
            shaderMat.uniforms.uHasMap.value = 1.0;
          } else {
            shaderMat.uniforms.uHasMap.value = 0.0;
          }
          
          if (oldMat.color) {
            shaderMat.uniforms.uColor.value = oldMat.color.clone();
          }
          
          shaderMat.userData = { isGenshin: true };
          shaderMat.needsUpdate = true;
          return shaderMat;
        };

        if (Array.isArray(m.material)) {
          m.material = m.material.map(applyShader);
        } else {
          m.material = applyShader(m.material);
        }
      }
    });
  }, []);
  
  // Load model
  useEffect(() => {
    if (!url) return;
    
    setIsLoading(true);
    setLoadError(null);
    setAnimationLoaded(false);
    
    const loader = loaderRef.current;
    
    // Check cache first
    if (modelCache.has(url)) {
      console.log("📦 Using cached model:", url);
      const cachedMesh = modelCache.get(url)!.clone();
      meshRef.current = cachedMesh;
      applyGenshinShader(cachedMesh);
      initializeHelper(cachedMesh);
      setMesh(cachedMesh);
      setIsLoading(false);
      return;
    }
    
    const initializeHelper = (loadedMesh: THREE.SkinnedMesh) => {
      // Create MMDAnimationHelper - this handles both animation and physics
      if (hasPhysics && window.Ammo) {
        try {
          const helper = new MMDAnimationHelper({ 
            afterglow: 2.0,
            resetPhysicsOnLoop: true 
          });
          helperRef.current = helper;
          console.log("✅ MMD Animation Helper created");
        } catch (e) {
          console.warn("⚠️ Failed to create animation helper:", e);
        }
      }
    };
    
    // Modify URL for blob handling
    const modifiedUrl = url.startsWith('blob:') ? url + '#.pmx' : url;
    
    loader.load(
      modifiedUrl,
      (loadedMesh) => {
        console.log("✅ MMD Model loaded successfully");
        
        // Cache the original mesh
        if (!url.startsWith('blob:')) {
          modelCache.set(url, loadedMesh.clone());
          console.log("📦 Model cached:", url);
        }
        
        meshRef.current = loadedMesh;
        applyGenshinShader(loadedMesh);
        initializeHelper(loadedMesh);
        
        setMesh(loadedMesh);
        setIsLoading(false);
      },
      (progress) => {
        if (progress.total > 0) {
          console.log(`Loading: ${Math.round((progress.loaded / progress.total) * 100)}%`);
        }
      },
      (error) => {
        console.error("❌ MMD Model load error:", error);
        setLoadError(`Failed to load model: ${error.message || error}`);
        setIsLoading(false);
      }
    );
    
    // Cleanup
    return () => {
      if (helperRef.current && meshRef.current) {
        try {
          helperRef.current.remove(meshRef.current);
        } catch (e) {}
        helperRef.current = null;
      }
      meshRef.current = null;
      setMesh(null);
      setAnimationLoaded(false);
    };
  }, [url, hasPhysics, applyGenshinShader]);
  
  // Load VMD animation - use MMDAnimationHelper properly
  useEffect(() => {
    if (!motionUrl || !meshRef.current) return;
    
    const mesh = meshRef.current;
    const loader = loaderRef.current;
    
    // Check animation cache
    if (animationCache.has(motionUrl)) {
      console.log("📦 Using cached animation:", motionUrl);
      const cachedClip = animationCache.get(motionUrl)!;
      applyAnimation(mesh, cachedClip);
      return;
    }
    
    console.log("Loading VMD animation:", motionUrl);
    
    const applyAnimation = (targetMesh: THREE.SkinnedMesh, clip: AnimationClip) => {
      // Use MMDAnimationHelper to handle animation + physics together
      if (helperRef.current) {
        try {
          // Remove mesh if already added
          try {
            helperRef.current.remove(targetMesh);
          } catch (e) {}
          
          // Add mesh with animation and physics
          helperRef.current.add(targetMesh, {
            animation: clip,
            physics: hasPhysics && !!window.Ammo
          });
          
          
          setAnimationLoaded(true);
          setDuration(clip.duration);
          console.log("✅ Animation applied via MMDAnimationHelper, duration:", clip.duration);
        } catch (e) {
          console.error("Failed to apply animation:", e);
          // Fallback to simple mixer
          const mixer = new AnimationMixer(targetMesh);
          const action = mixer.clipAction(clip);
          action.play();
          (targetMesh as any)._fallbackMixer = mixer;
          setAnimationLoaded(true);
        }
      } else {
        // No helper, use simple mixer
        const mixer = new AnimationMixer(targetMesh);
        const action = mixer.clipAction(clip);
        action.play();
        (targetMesh as any)._fallbackMixer = mixer;
        setAnimationLoaded(true);
        console.log("✅ Animation applied via fallback mixer");
      }
    };
    
    // Load animation with the mesh for proper bone mapping
    loader.loadAnimation(
      motionUrl,
      mesh,
      (clip: AnimationClip) => {
        // Cache animation
        if (!motionUrl.startsWith('blob:')) {
          animationCache.set(motionUrl, clip);
          console.log("📦 Animation cached:", motionUrl);
        }
        
        applyAnimation(mesh, clip);
      },
      undefined,
      (error) => {
        console.error("❌ Failed to load VMD:", error);
      }
    );
    
  }, [motionUrl, hasPhysics, mesh]);
  
  // Track last time for scrubbing detection
  const lastTimeRef = useRef(0);
  
  // Animation loop - use MMDAnimationHelper.update() which handles both animation and physics
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05); // Cap delta for stability
    
    // Only update animation if playing
    const shouldUpdate = animationState.isPlaying && animationLoaded;
    
    // Handle scrubbing (when currentTime changes externally)
    if (animationLoaded && helperRef.current) {
      const helper = helperRef.current;
      const objects = (helper as any).objects;
      
      if (objects && objects.size > 0) {
        // Check if time was changed externally (scrubbing)
        const timeDiff = Math.abs(animationState.currentTime - lastTimeRef.current);
        if (timeDiff > 0.1 && !animationState.isPlaying) {
          // Scrub to new time
          for (const [mesh, mixerInfo] of objects) {
            if (mixerInfo.mixer) {
              mixerInfo.mixer.setTime(animationState.currentTime);
            }
          }
        }
        
        // Update current time in store
        for (const [mesh, mixerInfo] of objects) {
          if (mixerInfo.mixer) {
            const currentTime = mixerInfo.mixer.time;
            if (Math.abs(currentTime - lastTimeRef.current) > 0.016) {
              lastTimeRef.current = currentTime;
              setCurrentTime(currentTime);
            }
            
            // Apply playback speed
            mixerInfo.mixer.timeScale = animationState.playbackSpeed;
            
            // Handle looping
            if (currentTime >= animationState.duration && animationState.duration > 0) {
              if (animationState.loop) {
                mixerInfo.mixer.setTime(0);
              }
            }
          }
        }
      }
    }
    
    // Update via helper (handles animation + physics) only if playing
    if (helperRef.current && shouldUpdate) {
      helperRef.current.update(dt * animationState.playbackSpeed);
    }
    
    // Fallback mixer update
    if (meshRef.current && (meshRef.current as any)._fallbackMixer && shouldUpdate) {
      const mixer = (meshRef.current as any)._fallbackMixer;
      mixer.timeScale = animationState.playbackSpeed;
      mixer.update(dt);
    }
    
    // Update shader uniforms from store settings
    if (meshRef.current) {
      meshRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          const materials = Array.isArray(m.material) ? m.material : [m.material];
          materials.forEach((mat) => {
            if (mat instanceof ShaderMaterial && mat.userData?.isGenshin) {
              // Shader Settings
              mat.uniforms.uShadowDarkness.value = shaderSettings.shadowDarkness;
              mat.uniforms.uShadowThreshold.value = shaderSettings.shadowThreshold;
              mat.uniforms.uShadowSoftness.value = shaderSettings.shadowSoftness;
              mat.uniforms.uRimStrength.value = shaderSettings.rimStrength;
              mat.uniforms.uSpecularStrength.value = shaderSettings.specularStrength;
              
              // Light Settings
              if (mat.uniforms.uKeyLightIntensity) mat.uniforms.uKeyLightIntensity.value = lightSettings.keyIntensity;
              if (mat.uniforms.uFillLightIntensity) mat.uniforms.uFillLightIntensity.value = lightSettings.fillIntensity;
              if (mat.uniforms.uAmbientIntensity) mat.uniforms.uAmbientIntensity.value = lightSettings.ambientIntensity;
              if (mat.uniforms.uRimLightIntensity) mat.uniforms.uRimLightIntensity.value = lightSettings.rimIntensity;
            }
          });
        }
      });
    }
    
    // Procedural behaviors only when no animation is playing
    if (meshRef.current && !animationLoaded) {
      updateProceduralBehaviors(meshRef.current, state, dt);
    }
  });
  
  // Show loading/error state
  if (isLoading) {
    return (
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#6366f1" wireframe />
      </mesh>
    );
  }
  
  if (loadError) {
    console.error("Load error:", loadError);
    return (
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
  }
  
  if (!mesh) return null;
  
  return (
    <primitive 
      object={mesh} 
      dispose={null} 
      scale={0.1} 
      position={[0, 0, 0]}
      rotation={[0, Math.PI, 0]} // Rotate to face camera
    >
      <Outlines thickness={shaderSettings.outlineThickness} color="#1a1a2e" />
    </primitive>
  );
}

// Procedural behaviors - Lumi/Nova Desktop style idle animations
// State for various behaviors
const idleState = {
  // Blinking
  blinkValue: 0,
  isBlinking: false,
  nextBlinkTime: 0,
  
  // Weight shifting
  weightShiftPhase: 0,
  weightShiftTarget: 0,
  currentWeightShift: 0,
  nextWeightShiftTime: 0,
  
  // Random gestures
  gestureType: 0, // 0=none, 1=head tilt, 2=look around, 3=shoulder roll
  gestureProgress: 0,
  nextGestureTime: 3,
  
  // Arm sway
  armSwayOffset: Math.random() * Math.PI * 2,
  
  // Idle pose (to break T-pose)
  poseInitialized: false,
};

// Bone name mappings for different model formats
const BONE_NAMES = {
  HEAD: ['頭', 'Head', 'head'],
  NECK: ['首', 'Neck', 'neck'],
  UPPER_BODY: ['上半身', 'Upper Body', 'upper body', 'Spine1', 'spine1'],
  LOWER_BODY: ['下半身', 'Lower Body', 'lower body', 'Hips', 'hips'],
  LEFT_ARM: ['左腕', 'Left Arm', 'arm_L', 'LeftArm'],
  RIGHT_ARM: ['右腕', 'Right Arm', 'arm_R', 'RightArm'],
  LEFT_SHOULDER: ['左肩', 'Left Shoulder', 'shoulder_L', 'LeftShoulder'],
  RIGHT_SHOULDER: ['右肩', 'Right Shoulder', 'shoulder_R', 'RightShoulder'],
  LEFT_ELBOW: ['左ひじ', 'Left Elbow', 'elbow_L', 'LeftForeArm'],
  RIGHT_ELBOW: ['右ひじ', 'Right Elbow', 'elbow_R', 'RightForeArm'],
};

const BLINK_MORPHS = ['まばたき', 'blink', 'eye_close', 'wink_2', 'ウィンク２', 'Blink'];
const SMILE_MORPHS = ['にやり', 'smile', 'Smile', 'にっこり', 'a'];

function updateProceduralBehaviors(mesh: THREE.SkinnedMesh, state: any, delta: number) {
  const time = state.clock.elapsedTime;
  
  if (!mesh.skeleton) return;
  
  // Flexible bone finder - checks exact match and substring
  const findBone = (names: string[]) => {
    for (const name of names) {
      const exact = mesh.skeleton?.bones.find((b) => b.name === name);
      if (exact) return exact;
    }
    // Try substring match
    for (const name of names) {
      const partial = mesh.skeleton?.bones.find((b) => 
        b.name.includes(name) || name.includes(b.name)
      );
      if (partial) return partial;
    }
    return undefined;
  };
  
  // Log bones once for debugging
  if (!idleState.poseInitialized && mesh.skeleton) {
    console.log('📊 Available bones:', mesh.skeleton.bones.map(b => b.name));
  }
  
  // Get all needed bones with Japanese MMD names
  const headBone = findBone(['頭', 'head', 'Head']);
  const neckBone = findBone(['首', 'neck', 'Neck']);
  const upperBodyBone = findBone(['上半身', 'upper body', 'Upper Body', 'Spine']);
  const lowerBodyBone = findBone(['下半身', 'lower body', 'Lower Body', 'Hips', 'センター', 'center']);
  const leftArm = findBone(['左腕', 'arm_L', 'LeftArm', 'Left arm']);
  const rightArm = findBone(['右腕', 'arm_R', 'RightArm', 'Right arm']);
  const leftShoulder = findBone(['左肩', 'shoulder_L', 'LeftShoulder', 'Left shoulder']);
  const rightShoulder = findBone(['右肩', 'shoulder_R', 'RightShoulder', 'Right shoulder']);
  const leftElbow = findBone(['左ひじ', 'elbow_L', 'LeftForeArm', 'Left elbow']);
  const rightElbow = findBone(['右ひじ', 'elbow_R', 'RightForeArm', 'Right elbow']);
  
  // === INITIAL POSE (break T-pose) ===
  if (!idleState.poseInitialized) {
    console.log('🦴 Setting initial pose - Found bones:', {
      leftArm: leftArm?.name,
      rightArm: rightArm?.name,
    });
    
    // Lower arms to a relaxed position 
    // For MMD models: negative Z rotation lowers arm, positive raises it
    if (leftArm) {
      leftArm.rotation.z = -0.8; // Rotate arm DOWN (negative)
      leftArm.rotation.x = 0.15; // Slight forward
      console.log('✅ Left arm lowered');
    }
    if (rightArm) {
      rightArm.rotation.z = 0.8; // Rotate arm DOWN (positive for right side)
      rightArm.rotation.x = 0.15;
      console.log('✅ Right arm lowered');
    }
    // Elbows bent slightly for natural look
    if (leftElbow) {
      leftElbow.rotation.y = 0.3;
    }
    if (rightElbow) {
      rightElbow.rotation.y = -0.3;
    }
    idleState.poseInitialized = true;
  }
  
  // === BREATHING ===
  const breathCycle = Math.sin(time * 1.2) * 0.5 + 0.5; // 0 to 1
  const breathAmount = breathCycle * 0.012;
  
  if (upperBodyBone) {
    upperBodyBone.rotation.x = THREE.MathUtils.lerp(
      upperBodyBone.rotation.x,
      breathAmount,
      delta * 3
    );
  }
  if (leftShoulder) {
    leftShoulder.rotation.z = THREE.MathUtils.lerp(
      leftShoulder.rotation.z,
      breathAmount * 0.3,
      delta * 3
    );
  }
  if (rightShoulder) {
    rightShoulder.rotation.z = THREE.MathUtils.lerp(
      rightShoulder.rotation.z,
      -breathAmount * 0.3,
      delta * 3
    );
  }
  
  // === WEIGHT SHIFTING ===
  if (time > idleState.nextWeightShiftTime) {
    idleState.weightShiftTarget = (Math.random() - 0.5) * 0.04;
    idleState.nextWeightShiftTime = time + 3 + Math.random() * 4;
  }
  
  idleState.currentWeightShift = THREE.MathUtils.lerp(
    idleState.currentWeightShift,
    idleState.weightShiftTarget,
    delta * 0.5
  );
  
  if (lowerBodyBone) {
    lowerBodyBone.rotation.z = idleState.currentWeightShift;
    lowerBodyBone.rotation.y = idleState.currentWeightShift * 0.3;
  }
  
  // === SUBTLE ARM SWAY ===
  const armSway = Math.sin(time * 0.8 + idleState.armSwayOffset) * 0.02;
  if (leftArm) {
    leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, armSway, delta * 2);
  }
  if (rightArm) {
    rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -armSway, delta * 2);
  }
  
  // === RANDOM GESTURES ===
  if (time > idleState.nextGestureTime && idleState.gestureType === 0) {
    idleState.gestureType = Math.floor(Math.random() * 3) + 1;
    idleState.gestureProgress = 0;
    idleState.nextGestureTime = time + 5 + Math.random() * 8;
  }
  
  if (idleState.gestureType > 0) {
    idleState.gestureProgress += delta * 0.8;
    const gestureValue = Math.sin(idleState.gestureProgress * Math.PI);
    
    switch (idleState.gestureType) {
      case 1: // Head tilt
        if (headBone) {
          headBone.rotation.z = gestureValue * 0.1;
        }
        break;
      case 2: // Look around
        if (neckBone || headBone) {
          const bone = neckBone || headBone;
          bone.rotation.y += Math.sin(idleState.gestureProgress * 2) * delta * 0.3;
        }
        break;
      case 3: // Slight body sway
        if (upperBodyBone) {
          upperBodyBone.rotation.z = gestureValue * 0.02;
        }
        break;
    }
    
    if (idleState.gestureProgress >= 1) {
      idleState.gestureType = 0;
    }
  }
  
  // === BLINKING ===
  if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
    let blinkIndex = -1;
    for (const name of BLINK_MORPHS) {
      if (mesh.morphTargetDictionary[name] !== undefined) {
        blinkIndex = mesh.morphTargetDictionary[name];
        break;
      }
    }

    if (blinkIndex !== -1) {
      if (time > idleState.nextBlinkTime && !idleState.isBlinking) {
        idleState.isBlinking = true;
        // Occasional double blink
        const doubleBlinkChance = Math.random() < 0.2;
        idleState.nextBlinkTime = time + (doubleBlinkChance ? 0.15 : (2 + Math.random() * 4));
      }

      if (idleState.isBlinking) {
        idleState.blinkValue += delta / 0.06; // Fast blink
        if (idleState.blinkValue >= 1) {
          idleState.blinkValue = 1;
          idleState.isBlinking = false;
        }
      } else {
        idleState.blinkValue = Math.max(0, idleState.blinkValue - delta / 0.08);
      }
      
      mesh.morphTargetInfluences[blinkIndex] = THREE.MathUtils.smoothstep(idleState.blinkValue, 0, 1);
    }
    
    // Occasional subtle smile
    let smileIndex = -1;
    for (const name of SMILE_MORPHS) {
      if (mesh.morphTargetDictionary[name] !== undefined) {
        smileIndex = mesh.morphTargetDictionary[name];
        break;
      }
    }
    if (smileIndex !== -1) {
      const smileAmount = (Math.sin(time * 0.3) * 0.5 + 0.5) * 0.15;
      mesh.morphTargetInfluences[smileIndex] = THREE.MathUtils.lerp(
        mesh.morphTargetInfluences[smileIndex] || 0,
        smileAmount,
        delta * 0.5
      );
    }
  }
  
  // === HEAD/NECK TRACKING (follows mouse) ===
  const mx = state.mouse.x;
  const my = state.mouse.y;
  
  // Add some lag and limit for natural feel
  const trackingSpeed = 1.5;
  const maxRotation = 0.4;
  
  if (neckBone) {
    const targetY = THREE.MathUtils.clamp(mx * 0.4, -maxRotation, maxRotation);
    const targetX = THREE.MathUtils.clamp(-my * 0.25, -maxRotation * 0.6, maxRotation * 0.6);
    
    neckBone.rotation.y = THREE.MathUtils.lerp(neckBone.rotation.y, targetY * 0.6, delta * trackingSpeed);
    neckBone.rotation.x = THREE.MathUtils.lerp(neckBone.rotation.x, targetX * 0.6, delta * trackingSpeed);
  }
  
  if (headBone) {
    const targetY = THREE.MathUtils.clamp(mx * 0.5, -maxRotation, maxRotation);
    const targetX = THREE.MathUtils.clamp(-my * 0.3, -maxRotation * 0.7, maxRotation * 0.7);
    
    headBone.rotation.y = THREE.MathUtils.lerp(headBone.rotation.y, targetY * 0.4, delta * trackingSpeed);
    headBone.rotation.x = THREE.MathUtils.lerp(headBone.rotation.x, targetX * 0.4, delta * trackingSpeed);
  }
}

