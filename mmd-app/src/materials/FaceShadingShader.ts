import * as THREE from 'three';

/**
 * Face SDF-based Shading Shader
 * Based on Genshin Impact facial lighting technique
 * Uses a Shadow Distance Field map to control shadows artistically
 * instead of relying on geometric normals (which create "dirty shadows")
 */
export const FaceShadingShader = {
  uniforms: {
    ...THREE.UniformsLib.common,
    ...THREE.UniformsLib.lights,
    ...THREE.UniformsLib.fog,
    
    // Base material
    uColor: { value: new THREE.Color('#ffffff') },
    uMap: { value: null },
    uHasMap: { value: 0.0 },
    
    // SDF Shadow Map
    tFaceSDF: { value: null },
    uHasFaceSDF: { value: 0.0 },
    
    // Head orientation (updated per frame)
    uHeadForward: { value: new THREE.Vector3(0, 0, -1) },
    uHeadRight: { value: new THREE.Vector3(1, 0, 0) },
    
    // Shadow control
    uShadowColor: { value: new THREE.Color('#6a5a8a') },
    uShadowThreshold: { value: 0.45 },
    uShadowSoftness: { value: 0.05 },
    uShadowDarkness: { value: 0.4 },
    uShadowFeather: { value: 0.05 },
    
    // Fallback to Lambert if no SDF
    uUseLambert: { value: 1.0 },
    
    // Rim light
    uRimColor: { value: new THREE.Color('#ffffff') },
    uRimStrength: { value: 0.5 },
    uRimPower: { value: 3.0 },
    
    // Light intensity controls
    uKeyLightIntensity: { value: 1.0 },
    uAmbientIntensity: { value: 0.3 },
    
    // Professional Color Grading
    uSaturation: { value: 1.0 },
    uTemperature: { value: 0.0 },
    uTint: { value: 0.0 },
    uBrightness: { value: 1.0 },
  },
  
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    #include <common>
    #include <uv_pars_vertex>
    #include <skinning_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <shadowmap_pars_vertex>

    void main() {
      vUv = uv;
      
      // Skinning and morph support (CRITICAL for MMD models)
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinbase_vertex>
      #include <skinning_vertex>
      
      // Normals
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
      
      vNormal = normalize(normalMatrix * objectNormal);
      
      vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vViewPosition = -mvPosition.xyz;
    // vec4 worldPosition = modelMatrix * vec4(transformed, 1.0); 
    // vWorldPosition = worldPosition.xyz;
    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vec4 worldPosition = vec4(vWorldPosition, 1.0); // Explicitly defined for shadowmap_vertex
    
    gl_Position = projectionMatrix * mvPosition;
      
      #include <shadowmap_vertex>
    }
  `,
  
  fragmentShader: `
    uniform vec3 uColor;
    uniform sampler2D uMap;
    uniform float uHasMap;
    
    // SDF
    uniform sampler2D tFaceSDF;
    uniform float uHasFaceSDF;
    uniform vec3 uHeadForward;
    uniform vec3 uHeadRight;
    
    uniform vec3 uShadowColor;
    uniform float uShadowThreshold;
    uniform float uShadowSoftness;
    uniform float uShadowDarkness;
    uniform float uShadowFeather;
    uniform float uUseLambert;
    
    uniform vec3 uRimColor;
    uniform float uRimStrength;
    uniform float uRimPower;
    
    uniform float uKeyLightIntensity;
    uniform float uAmbientIntensity;
    
    // Professional Color Grading
    uniform float uSaturation;
    uniform float uTemperature;
    uniform float uTint;
    uniform float uBrightness;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    
    // Color Grading Utilities
    vec3 applyTemperature(vec3 color, float temp) {
      // Warm = more red/yellow, Cool = more blue
      vec3 warm = vec3(1.0, 0.9, 0.7);
      vec3 cool = vec3(0.7, 0.9, 1.0);
      vec3 tempShift = mix(cool, warm, temp * 0.5 + 0.5);
      return color * tempShift;
    }
    
    vec3 applyTint(vec3 color, float tint) {
      // Green-Magenta axis
      vec3 green = vec3(0.9, 1.0, 0.9);
      vec3 magenta = vec3(1.0, 0.9, 1.0);
      vec3 tintShift = mix(green, magenta, tint * 0.5 + 0.5);
      return color * tintShift;
    }
    
    vec3 applySaturation(vec3 color, float sat) {
      float lum = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(lum), color, sat);
    }

    void main() {
      // Get base color
      vec4 texColor;
      if (uHasMap > 0.5) {
        texColor = texture2D(uMap, vUv);
        if (texColor.a < 0.1) discard;
      } else {
        texColor = vec4(uColor, 1.0);
      }

      vec3 baseColor = texColor.rgb;
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);

      // Get light direction
      vec3 keyLightDir = vec3(0.3, 0.8, -0.5);
      vec3 keyLightColor = vec3(1.0);
      
      #if NUM_DIR_LIGHTS > 0
        keyLightDir = normalize(directionalLights[0].direction);
        keyLightColor = directionalLights[0].color;
      #endif
      
      // Calculate Shadow Map
      float realShadow = 1.0;
      // #ifdef USE_SHADOWMAP
      //   realShadow = getShadowMask();
      // #endif

      float shadowFactor = 1.0;
      
      // === SDF-BASED SHADOW (if SDF texture available) ===
      if (uHasFaceSDF > 0.5) {
        // Project light and head vectors to XZ plane (ignore vertical tilt)
        vec3 lightDirXZ = normalize(vec3(keyLightDir.x, 0.0, keyLightDir.z));
        vec3 headForwardXZ = normalize(vec3(uHeadForward.x, 0.0, uHeadForward.z));
        vec3 headRightXZ = normalize(vec3(uHeadRight.x, 0.0, uHeadRight.z));
        
        // Calculate angle of light relative to head
        float dotF = dot(headForwardXZ, lightDirXZ); // 1.0 = frontal, -1.0 = back
        float dotR = dot(headRightXZ, lightDirXZ);   // 1.0 = right, -1.0 = left
        
        // Sample SDF threshold from texture
        float shadowThreshold = texture2D(tFaceSDF, vUv).r;
        
        // Map light angle to 0-1 range
        float lightAngle = dotF * 0.5 + 0.5;
        
        // Flip logic: if light is from the right (dotR > 0), mirror the check
        // This handles symmetry for faces that have SDF baked for only one side
        float adjustedAngle = lightAngle;
        if (dotR > 0.0) {
          // Mirror the UV for right-side lighting
          adjustedAngle = 1.0 - lightAngle;
        }
        
        // Smooth shadow transition
        shadowFactor = smoothstep(
          shadowThreshold - uShadowFeather,
          shadowThreshold + uShadowFeather,
          adjustedAngle
        );
      } 
      // === GLOBAL CEL FALLBACK (Main Shadow Logic) ===
      else {
        float NdotL = dot(normal, keyLightDir);
        float halfLambert = NdotL * 0.5 + 0.5;
        
        // Use global threshold and softness sliders
        shadowFactor = smoothstep(
          uShadowThreshold - uShadowSoftness,
          uShadowThreshold + uShadowSoftness,
          halfLambert
        );
      }
        // Mix shadow and lit colors
      // Map Darkness slider: 0.0 (brighter) -> 1.0 (black)
      float darknessMult = max(0.0, 1.0 - uShadowDarkness);
      vec3 shadowedColor = baseColor * uShadowColor * darknessMult;
      
      vec3 litColor = baseColor * uKeyLightIntensity;
      vec3 diffuse = mix(shadowedColor, litColor, shadowFactor);

      // === RIM LIGHTING ===
      float NdotV = max(dot(normal, viewDir), 0.0);
      float rim = 1.0 - NdotV;
      rim = pow(rim, uRimPower) * uRimStrength;
      rim *= shadowFactor * 0.5 + 0.5; // Stronger on lit side

      // === AMBIENT ===
      vec3 ambientContribution = baseColor * uAmbientIntensity;

      // === FINAL COMPOSITION ===
      vec3 finalColor = diffuse * keyLightColor;
      finalColor += ambientContribution;
      finalColor += uRimColor * rim * 0.3;

      // === PROFESSIONAL COLOR GRADING ===
      // Apply brightness first
      finalColor *= uBrightness;
      
      // Apply saturation
      finalColor = applySaturation(finalColor, uSaturation);
      
      // Apply temperature
      finalColor = applyTemperature(finalColor, uTemperature);
      
      // Apply tint
      finalColor = applyTint(finalColor, uTint);

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
};
