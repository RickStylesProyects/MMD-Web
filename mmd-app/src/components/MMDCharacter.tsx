// @ts-nocheck
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { MMDLoader, MMDAnimationHelper, CCDIKSolver } from 'three-stdlib';
import { SkinnedMesh, ShaderMaterial, UniformsUtils, AnimationMixer, AnimationClip } from 'three';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { rampTextureCache } from '../lib/textureGenerator';
import { useAmmo } from './AmmoProvider';
import { GenshinToonShader } from '../materials/GenshinShader';
import { FaceShadingShader } from '../materials/FaceShadingShader';
import { HairShader } from '../materials/HairShader';
import { GradientRampShader } from '../materials/GradientRampShader';
import { shaderCache } from '../lib/shaderCache';

// Simple model cache
const modelCache = new Map<string, THREE.SkinnedMesh>();
const animationCache = new Map<string, AnimationClip>();

interface MMDCharacterProps {
  url: string;
  motionUrl?: string; // Legacy
  motions?: { id: string; name: string; url: string; active: boolean }[];
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isActive?: boolean;
}

export function MMDCharacter({ 
  url, 
  motionUrl,
  motions = [],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  isActive = false
}: MMDCharacterProps) {
  const { scene } = useThree();
  const { hasPhysics } = useAmmo();
  
  // Animation state from store
  const {
    animationState, 
    setCurrentTime, 
    setDuration,
    setPlaying,
    shaderSettings,
    lightSettings,
    models,
    setAvailableMorphs
  } = useStore();
  
  const currentModel = models.find(m => m.url === url || (url.startsWith('blob:') && m.url.includes(url)));
  
  // Refs
  const meshRef = useRef<THREE.SkinnedMesh | null>(null);
  const helperRef = useRef<MMDAnimationHelper | null>(null);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const isExternalMixerRef = useRef(false);
  const ikSolverRef = useRef<any>(null);
  // useMemo for loader to avoid re-instantiation and ensure stable reference
  const loader = useMemo(() => new MMDLoader(), []);
  
  // State
  const [mesh, setMesh] = useState<THREE.SkinnedMesh | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animationLoaded, setAnimationLoaded] = useState(false);

  // Apply custom shader to materials
  // Material type detection helpers
  const isFaceMaterial = (mat: any, name: string): boolean => {
    const lowerName = name.toLowerCase();
    return (
      lowerName.includes('face') ||
      lowerName.includes('顔') ||
      lowerName.includes('head') ||
      lowerName.includes('肌')
    );
  };

  const isHairMaterial = (mat: any, name: string): boolean => {
    const lowerName = name.toLowerCase();
    return (
      lowerName.includes('hair') ||
      lowerName.includes('髪') ||
      lowerName.includes('前髪') ||
      lowerName.includes('後髪')
    );
  };

  // Fallback material for when custom shaders fail
  const createFallbackMaterial = (oldMat: any): THREE.Material => {
    console.log('🔄 Creating fallback MeshToonMaterial for:', oldMat.name);
    
    const toonMat = new THREE.MeshToonMaterial({
      color: oldMat.color ? oldMat.color.clone() : new THREE.Color('#ffffff'),
      map: oldMat.map || null,
      side: THREE.DoubleSide,
      transparent: oldMat.transparent || false,
      alphaTest: oldMat.alphaTest || 0.01,
    });
    
    toonMat.userData = { 
      isFallbackMaterial: true, 
      originalName: oldMat.name || 'unknown' 
    };
    
    return toonMat;
  };

  // Apply shader system to model - WITH FACE SDF, HAIR, RAMP, AND MATCAP SUPPORT
  const applyGenshinShader = useCallback((targetMesh: THREE.SkinnedMesh) => {
    console.log('🎨 Applying Advanced Shader System v2...');
    
    // Load ramp textures and MatCap
    const defaultRamp = rampTextureCache.get('skin');
    
    targetMesh.traverse((child) => {
      if ((child as SkinnedMesh).isMesh) {
        const m = child as SkinnedMesh;
        m.castShadow = true;
        m.receiveShadow = true;

        const applyShader = (oldMat: any, index: number) => {
          // Skip if already processed
          if (oldMat.userData?.isGenshinShader) return oldMat;
          
          const matName = oldMat.name || `material_${index}`;
          const isFace = isFaceMaterial(oldMat, matName);
          const isHair = isHairMaterial(oldMat, matName);
          
          console.log(`📦 Processing material: ${matName} | Face: ${isFace} | Hair: ${isHair}`);
          
          // Choose shader based on material type
          let shaderSource;
          if (isFace) {
            // Face SDF Shader
            shaderSource = FaceShadingShader;
          } else if (isHair) {
            // Hair Shader with anisotropic specular
            shaderSource = HairShader;
          } else {
            // Body/Cloth shader with ramp and matcap support
            shaderSource = GradientRampShader;
          }
          
          // Create shader material using cache
          const shaderMat = shaderCache.get(
            shaderSource.vertexShader,
            shaderSource.fragmentShader,
            shaderSource.uniforms,
            {
              USE_SKINNING: '',
              USE_MORPHTARGETS: '',
              USE_MORPHNORMALS: ''
            }
          );
          
          // Crear textura dummy blanca para prevenir errores de WebGL con samplers nulos
          // Usamos una data texture simple de 1x1 pixel
          const getWhiteTexture = () => {
             if (!window._whiteTexture) {
                 const data = new Uint8Array([255, 255, 255, 255]);
                 window._whiteTexture = new THREE.DataTexture(data, 1, 1);
                 window._whiteTexture.needsUpdate = true;
             }
             return window._whiteTexture;
          };
          const whiteTex = getWhiteTexture();

          // Inicializar texturas con dummy blanco por defecto
          if (shaderMat.uniforms.uMap) shaderMat.uniforms.uMap.value = whiteTex; 
          if (shaderMat.uniforms.tFaceSDF) shaderMat.uniforms.tFaceSDF.value = whiteTex;
          if (shaderMat.uniforms.uRampTexture) shaderMat.uniforms.uRampTexture.value = whiteTex;
          if (shaderMat.uniforms.uMatCap) shaderMat.uniforms.uMatCap.value = whiteTex;

          // Copy texture and color
          if (oldMat.map) {
            shaderMat.uniforms.uMap.value = oldMat.map;
            shaderMat.uniforms.uHasMap.value = 1.0;
            
            // Face SDF texture check
            if (isFace && oldMat.userData?.faceSDF) {
              shaderMat.uniforms.tFaceSDF.value = oldMat.userData.faceSDF;
              shaderMat.uniforms.uHasFaceSDF.value = 1.0;
              console.log('✅ Face SDF texture loaded');
            } else if (isFace) {
              console.log('⚠️ Face material: no SDF, using Lambert fallback');
              shaderMat.uniforms.uHasFaceSDF.value = 0.0;
            }
          } else {
            shaderMat.uniforms.uHasMap.value = 0.0;
          }
          
          if (oldMat.color) {
            shaderMat.uniforms.uColor.value = oldMat.color.clone();
          }

          // CRITICAL: Copy material properties to avoid holes/rendering issues
          // UNCONDITIONALLY force DoubleSide for ALL MMD materials
          shaderMat.side = THREE.DoubleSide; 
          shaderMat.transparent = oldMat.transparent;
          shaderMat.alphaTest = oldMat.alphaTest || 0.01; // Use original or very low threshold
          shaderMat.depthWrite = oldMat.depthWrite !== false; // Inherit or default to true
          
          // Apply gradient ramp (for body/cloth materials)
          if (!isFace && !isHair && shaderMat.uniforms.uRampTexture) {
             // IMPORTANTE: Sobrescribir el dummy con el ramp real si corresponde
             shaderMat.uniforms.uRampTexture.value = defaultRamp || whiteTex;
             shaderMat.uniforms.uUseRamp.value = shaderSettings.useGradientRamp ? 1.0 : 0.0;
          }
          
          // Mark with metadata
          shaderMat.userData = { 
            isGenshinShader: true, 
            materialType: isFace ? 'face' : (isHair ? 'hair' : 'body'),
            originalName: matName
          };
          shaderMat.needsUpdate = true;
          
          return shaderMat;
        };

        try {
          if (Array.isArray(m.material)) {
            m.material = m.material.map((mat, idx) => {
              try {
                return applyShader(mat, idx);
              } catch (shaderErr) {
                console.warn(`⚠️ Shader failed for material ${idx}, using fallback:`, shaderErr);
                return createFallbackMaterial(mat);
              }
            });
          } else {
            try {
              m.material = applyShader(m.material, 0);
            } catch (shaderErr) {
              console.warn('⚠️ Shader failed, using fallback:', shaderErr);
              m.material = createFallbackMaterial(m.material);
            }
          }
          console.log('✅ Advanced shader system v2 applied');
        } catch (e) {
          console.error('❌ Shader application failed completely:', e);
          // Final fallback: keep original materials
        }
      }
    });
  }, [shaderSettings.useGradientRamp]);
  
  // Load model
  useEffect(() => {
    if (!url) return;
    
    setIsLoading(true);
    setLoadError(null);
    setAnimationLoaded(false);
    console.log("🛠️ SYSTEM UPDATE: Physics Engine v2 Loaded"); // Verify update code
    
    // const loader = loaderRef.current; // Removed this line
    
    const initializeRobustSystem = (loadedMesh: THREE.SkinnedMesh) => {
      // Initialize MMDAnimationHelper with Physics and IK enabled
      try {
        // Create helper if not exists
        const helper = new MMDAnimationHelper({
          afterglow: 2.0,
          resetPhysicsOnLoop: true,
        });
        
        // Add mesh to helper - CRITICAL: This sets up the internal Mixer, IK Solver, and Physics
        helper.add(loadedMesh, {
          animation: [],       // Pass empty array to FORCE Mixer creation
          physics: hasPhysics,  // Enable physics if Ammo is loaded
          warmup: 60,           // Stabilization frames for physics
          ik: true,            // Enable IK solver
          grant: true          // Enable grant solver (parenting/physics)
        });
        
        helperRef.current = helper;
        
        // INSPECT HELPER OBJECTS
        // @ts-ignore
        const entry = helper.objects.get(loadedMesh);
        console.log("🕵️ Helper Entry Inspection:", {
            hasEntry: !!entry,
            keys: entry ? Object.keys(entry) : [],
            mixer: !!entry?.mixer,
            ikSolver: !!entry?.ikSolver,
            physics: !!entry?.physics,
            hasPhysicsProp: hasPhysics
        });

        // Extract the mixer created by the helper
        // @ts-ignore
        const mixer = entry?.mixer;
        mixerRef.current = mixer;
        isExternalMixerRef.current = false;
        
        if (!mixer) {
            console.error("❌ CRITICAL: Mixer missing from Helper!", entry);
            // Fallback
             mixerRef.current = new AnimationMixer(loadedMesh);
        }
        
        // Expose IK solver ref just for debug (optional)
        // @ts-ignore
        ikSolverRef.current = entry?.ikSolver;

        console.log(`✅ System Ready: Helper initialized | Physics: ${hasPhysics} | IK: ${!!ikSolverRef.current} | Mixer: ${!!mixerRef.current}`);
        
      } catch (err) {
        console.error("❌ MMD Helper Init Failed:", err);
        // Fallback to basic mixer if helper fails (unlikely)
        mixerRef.current = new AnimationMixer(loadedMesh);
      }
    };

    // Check cache first
    if (modelCache.has(url)) {
      console.log("📦 Using cached model:", url);
      const cachedMesh = modelCache.get(url)!.clone();
      meshRef.current = cachedMesh;
      applyGenshinShader(cachedMesh);
      initializeRobustSystem(cachedMesh);
      setMesh(cachedMesh);
      setIsLoading(false);
      return;
    }
    
    // Modify URL for blob handling
    const modifiedUrl = url.startsWith('blob:') ? url + '#.pmx' : url;
    
    loader.load(
      modifiedUrl,
      (loadedMesh) => {
        console.log("✅ MMD Model loaded successfully");
        // DEBUG: Check Bone Names
        if (loadedMesh.skeleton && loadedMesh.skeleton.bones) {
            console.log("🍖 Model Bones (First 5):", loadedMesh.skeleton.bones.slice(0, 5).map(b => b.name));
            console.log("🍖 Model Morphs (Keys):", Object.keys(loadedMesh.morphTargetDictionary || {}));
        }
        
        // Cache the original mesh
        if (!url.startsWith('blob:')) {
          modelCache.set(url, loadedMesh.clone());
          console.log("📦 Model cached:", url);
        }
        
        meshRef.current = loadedMesh;
        applyGenshinShader(loadedMesh);
        initializeRobustSystem(loadedMesh);
        
        // Populate Available Morphs
        if (loadedMesh.morphTargetDictionary) {
            const morphs = Object.keys(loadedMesh.morphTargetDictionary);
            if (currentModel) {
                console.log("😊 Registering Morphs:", morphs.length, "for model ID:", currentModel.id, "URL:", url);
                setAvailableMorphs(currentModel.id, morphs);
            } else {
                console.warn("⚠️ Morphs found but currentModel is NULL. Model URL:", url, "Store URLs:", models.map(m => m.url));
            }
        }
        
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
  }, [url, hasPhysics, applyGenshinShader, loader]);
  
  // =========================================================
  // MULTI-TRACK MOTION HANDLING (Blending)
  // =========================================================
  
  const [loadedClips, setLoadedClips] = useState(new Map<string, AnimationClip>());
  
  // 1. Load active motions
  useEffect(() => {
    if (!mesh || !motions) {
        console.log("⚠️ Skipping motion load: mesh or motions missing", { mesh: !!mesh, motionsLen: motions?.length });
        return;
    }
    
    motions.forEach(bgMotion => {
      // Check if already loaded
      if (loadedClips.has(bgMotion.url) || animationCache.has(bgMotion.url)) {
          console.log("⏩ Motion already cached/loaded:", bgMotion.name);
          return;
      }
      
      console.log("⬇️ Starting load for motion:", bgMotion.name, bgMotion.url);
      
      // Use loader from useMemo
      loader.loadAnimation(
        bgMotion.url,
        mesh, // Bind to current mesh
        (clip) => {
           console.log("✅ Motion loaded successfully:", bgMotion.name);
           // DEBUG: Comprehensive Animation Track Analysis
           console.log("🎬 === ANIMATION DEBUG ===");
           console.log("🎬 Total tracks:", clip.tracks.length);
           
           // Show ALL tracks for full analysis
           const trackNames = clip.tracks.map(t => t.name);
           console.log("🎬 All Track Names:", trackNames);
           
           // Check for leg-related tracks (Japanese + English)
           const legKeywords = ['足', '脚', 'leg', 'Leg', 'knee', 'ひざ', 'ankle', '足首', 'IK'];
           const legTracks = trackNames.filter(name => 
             legKeywords.some(keyword => name.includes(keyword))
           );
           console.log("🦵 Leg-related tracks found:", legTracks.length > 0 ? legTracks : "NONE - This is the problem!");
           
           // Check model bone names for comparison
           if (mesh.skeleton?.bones) {
             const legBones = mesh.skeleton.bones.filter(b => 
               legKeywords.some(keyword => b.name.includes(keyword))
             ).map(b => b.name);
             console.log("🦵 Model leg bones:", legBones);
           }
           console.log("🎬 === END DEBUG ===");
           
           // Cache it
           if (!bgMotion.url.startsWith('blob:')) {
             animationCache.set(bgMotion.url, clip);
           }
           setLoadedClips(prev => new Map(prev).set(bgMotion.url, clip));
        },
        (xhr) => {
            if (xhr.lengthComputable) {
                const percentComplete = xhr.loaded / xhr.total * 100;
                // console.log(Math.round(percentComplete, 2) + '% downloaded');
            }
        },
        (err) => console.error("❌ Failed to load motion:", bgMotion.name, err)
      );
    });
  }, [motions, mesh, loadedClips, loader]);
  
  // 2. Sync Mixer (Play/Stop/Blend) - Direct mixer approach
  useEffect(() => {
    if (!mesh) return;
    
    const mixer = mixerRef.current;
    if (!mixer) return;
    
    let maxDuration = 0;
    let hasActive = false;
    
    if (motions && motions.length > 0) {
      motions.forEach(m => {
        const clip = loadedClips.get(m.url) || animationCache.get(m.url);
        
        if (clip && m.active) {
          // Use standard mixer - IK is handled by CCDIKSolver in render loop
          const action = mixer.clipAction(clip);
          if (!action.isRunning()) {
            action.reset();
            action.play();
            action.setLoop(THREE.LoopRepeat, Infinity);
            console.log("🎬 Playing animation (IK via CCDIKSolver):", m.name || m.url);
          }
          action.setEffectiveWeight(1);
          
          if (clip.duration > maxDuration) maxDuration = clip.duration;
          hasActive = true;
          
        } else if (clip && !m.active) {
          // STOP animation
          const action = mixer.clipAction(clip);
          if (action.isRunning()) {
            action.fadeOut(0.3);
          }
        }
      });
    }
    
    if (hasActive) {
      setDuration(maxDuration);
      setAnimationLoaded(true);
    }
    
  }, [motions, loadedClips, mesh, hasPhysics, setDuration, setAnimationLoaded]);
  
  // Track last time for scrubbing detection
  const lastTimeRef = useRef(0);
  
  // Animation loop - use MMDAnimationHelper.update() which handles both animation and physics
  // Animation loop - updates physics, animation, and shaders
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05); // Cap delta for stability
    // RELAXED CONDITION: Run if mesh exists and we are "playing".
    // Even if animationLoaded is false, we want physics to run.
    const shouldUpdate = animationState.isPlaying && !!mesh;

    // 1. ANIMATION & PHYSICS UPDATE
    if (shouldUpdate) {
       const step = dt * animationState.playbackSpeed;

       // helper.update() automatically handles:
       // - Mixer update
       // - IK Solver update
       // - Physics update
       // - Grant Solver update
       if (helperRef.current) {
         try {
           helperRef.current.update(step);
           
           // Debug log occasionally
           if (!window._helperUpdateLogged) {
             window._helperUpdateLoggedCounters = (window._helperUpdateLoggedCounters || 0) + 1;
             if (window._helperUpdateLoggedCounters % 120 === 0) { // Log every ~2 seconds at 60fps
                console.log(`⏱️ Loop: MixerTime=${mixerRef.current?.time.toFixed(3)} | ActionRunning=${mixerRef.current?._actions?.[0]?.isRunning()} | Physics=${!!helperRef.current.physics} | IK=${!!ikSolverRef.current}`);
             }
           }
           
         } catch (e) {
           console.error("Helper update error:", e);
         }
       } else if (mixerRef.current) {
         // Fallback if helper missing for some reason
         mixerRef.current.update(step);
       }
    }

       // --- MANUAL MORPH APPLICATION ---
       if (currentModel && currentModel.activeMorphs && mesh && mesh.morphTargetDictionary) {
           Object.entries(currentModel.activeMorphs).forEach(([name, value]) => {
               const index = mesh.morphTargetDictionary[name];
               if (index !== undefined) {
                   mesh.morphTargetInfluences[index] = value;
               }
           });
       }


    // 2. TIME SYNC, LOOPING & SCRUBBING
    if (mixerRef.current) {
       // Sync store time
       const currentTime = mixerRef.current.time;
       if (shouldUpdate && Math.abs(currentTime - lastTimeRef.current) > 0.016) {
          lastTimeRef.current = currentTime;
          setCurrentTime(currentTime);
       }
       
       // Handle Loop Reset
       if (shouldUpdate && animationState.loop && animationState.duration > 0) {
          if (currentTime >= animationState.duration) {
             mixerRef.current.setTime(0);
             // Reset physics to prevent clothing glitches
             try {
                const physics = (helperRef.current as any)?.physics;
                if (physics?.reset) physics.reset();
             } catch {}
          }
       }
       
       // Handle Manual Scrubbing (when paused)
       if (!animationState.isPlaying && Math.abs(animationState.currentTime - lastTimeRef.current) > 0.1) {
          mixerRef.current.setTime(animationState.currentTime);
          lastTimeRef.current = animationState.currentTime;
          
          // Also sync helper internal mixers if they exist (for IK solver update)
          if (helperRef.current) {
             const objects = (helperRef.current as any).objects;
             if (objects) {
                 for (const [_, mixerInfo] of objects) {
                     if (mixerInfo.mixer) mixerInfo.mixer.setTime(animationState.currentTime);
                 }
             }
          }
       }
    }

    // 3. SHADER UNIFORM UPDATES + HEAD ORIENTATION FOR FACE SDF
    if (meshRef.current) {
      // Get head bone for Face SDF orientation tracking
      let headBone: THREE.Bone | undefined;
      if (meshRef.current.skeleton) {
        headBone = meshRef.current.skeleton.bones.find(b => 
          b.name === '頭' || b.name === 'Head' || b.name === 'head'
        );
      }
      
      meshRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          
          const materials = Array.isArray(m.material) ? m.material : [m.material];
          
          materials.forEach((mat) => {
            // Fix self-shadowing acne by rendering shadows from back faces
            mat.shadowSide = THREE.BackSide;
            
            if (mat instanceof ShaderMaterial && mat.userData?.isGenshinShader) {
              const materialType = mat.userData.materialType;
              
              // === COMMON SHADER SETTINGS ===
              if (mat.uniforms.uShadowDarkness) mat.uniforms.uShadowDarkness.value = shaderSettings.shadowDarkness;
              if (mat.uniforms.uShadowThreshold) mat.uniforms.uShadowThreshold.value = shaderSettings.shadowThreshold;
              if (mat.uniforms.uShadowSoftness) mat.uniforms.uShadowSoftness.value = shaderSettings.shadowSoftness;
              
              // Apply toggles: if disabled, set strength to 0
              if (mat.uniforms.uRimStrength) mat.uniforms.uRimStrength.value = shaderSettings.rimLightEnabled ? shaderSettings.rimStrength : 0.0;
              if (mat.uniforms.uSpecularStrength) mat.uniforms.uSpecularStrength.value = shaderSettings.specularEnabled ? shaderSettings.specularStrength : 0.0;
              
              // Update light settings
              if (mat.uniforms.uKeyLightIntensity) mat.uniforms.uKeyLightIntensity.value = lightSettings.keyIntensity;
              if (mat.uniforms.uFillLightIntensity) mat.uniforms.uFillLightIntensity.value = lightSettings.fillIntensity;
              if (mat.uniforms.uAmbientIntensity) mat.uniforms.uAmbientIntensity.value = lightSettings.ambientIntensity;
              if (mat.uniforms.uRimLightIntensity) mat.uniforms.uRimLightIntensity.value = lightSettings.rimIntensity;
              
              // === FACE SDF: Update head orientation ===
              if (materialType === 'face' && headBone && mat.uniforms.uHeadForward) {
                const worldQuat = new THREE.Quaternion();
                headBone.getWorldQuaternion(worldQuat);
                
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat);
                const right = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat);
                
                mat.uniforms.uHeadForward.value.copy(forward);
                mat.uniforms.uHeadRight.value.copy(right);
                
                if (mat.uniforms.uShadowFeather) {
                  mat.uniforms.uShadowFeather.value = shaderSettings.faceShadowFeather;
                }
                if (mat.uniforms.uShadowDarkness?.value !== undefined) {
                  mat.uniforms.uShadowDarkness.value = shaderSettings.faceShadowDarkness;
                }
              }
              
              // === HAIR: Update hair-specific uniforms ===
              if (materialType === 'hair') {
                if (mat.uniforms.uHairSpecularPower) {
                  mat.uniforms.uHairSpecularPower.value = shaderSettings.hairSpecularPower;
                }
                if (mat.uniforms.uHairSpecularStrength) {
                  // Hair specular specific toggle
                  mat.uniforms.uHairSpecularStrength.value = shaderSettings.specularEnabled ? shaderSettings.hairSpecularStrength : 0.0;
                }
                if (mat.uniforms.uHairSpecularShift) {
                  mat.uniforms.uHairSpecularShift.value = shaderSettings.hairSpecularShift;
                }
              }
              
              // === BODY/CLOTH: Update ramp and matcap settings ===
              if (materialType === 'body') {
                if (mat.uniforms.uUseRamp) {
                  mat.uniforms.uUseRamp.value = shaderSettings.useGradientRamp ? 1.0 : 0.0;
                }
                if (mat.uniforms.uMatCapStrength) {
                  mat.uniforms.uMatCapStrength.value = shaderSettings.useMatCap ? shaderSettings.matCapStrength : 0.0;
                }
              }
            }
          });
        }
      });
    }

    // 4. PROCEDURAL BEHAVIORS (Blinking/Breathing when idle)
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
      scale={scale * 0.1} 
      position={position}
      rotation={[
        rotation[0] * (Math.PI / 180), 
        (rotation[1] + 180) * (Math.PI / 180), 
        rotation[2] * (Math.PI / 180)
      ]}
    >
      {shaderSettings.outlineEnabled && (
        <Outlines thickness={shaderSettings.outlineThickness} color="#1a1a2e" />
      )}
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

