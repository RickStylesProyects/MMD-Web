import * as THREE from 'three';

/**
 * Enhanced Genshin Shader with Gradient Ramp Support
 * Allows artistic control over shadow falloff via 1D ramp textures
 * Different ramps for different material types (skin, metal, cloth)
 */
export const GradientRampShader = {
  uniforms: {
    ...THREE.UniformsLib.common,
    ...THREE.UniformsLib.lights,
    ...THREE.UniformsLib.fog,
    uColor: { value: new THREE.Color('#ffffff') },
    uMap: { value: null },
    uHasMap: { value: 0.0 },
    
    // Gradient Ramp
    uRampTexture: { value: null },
    uUseRamp: { value: 0.0 },
    
    // Fallback cel-shading (if no ramp)
    uShadowSteps: { value: 2.0 },
    uShadowThreshold: { value: 0.45 },
    uShadowSoftness: { value: 0.08 },
    uShadowDarkness: { value: 0.35 },
    uShadowColor: { value: new THREE.Color('#6a5a8a') },
    
    // Rim light
    uRimColor: { value: new THREE.Color('#ffffff') },
    uRimStrength: { value: 0.8 },
    uRimPower: { value: 2.5 },
    
    // Specular
    uSpecularStrength: { value: 0.3 },
    uSpecularPower: { value: 48.0 },
    
    // MatCap support
    uMatCap: { value: null },
    uMatCapStrength: { value: 0.0 },
    
    // Light intensity controls
    uKeyLightIntensity: { value: 1.0 },
    uFillLightIntensity: { value: 0.25 },
    uAmbientIntensity: { value: 0.3 },
    uRimLightIntensity: { value: 0.35 },
    
    // Professional Color Grading (Clothing + Hair)
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
    varying vec3 vViewNormal;

    #include <common>
    #include <uv_pars_vertex>
    #include <skinning_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <shadowmap_pars_vertex>

    void main() {
      vUv = uv;
      
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinbase_vertex>
      #include <skinning_vertex>
      
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
      
      vNormal = normalize(normalMatrix * objectNormal);
      vViewNormal = normalize(normalMatrix * objectNormal);
      
      vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
      vViewPosition = -mvPosition.xyz;
      vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      gl_Position = projectionMatrix * mvPosition;
      
      #include <shadowmap_vertex>
    }
  `,
  
  fragmentShader: `
    uniform vec3 uColor;
    uniform sampler2D uMap;
    uniform float uHasMap;
    
    // Ramp
    uniform sampler2D uRampTexture;
    uniform float uUseRamp;
    
    uniform float uShadowThreshold;
    uniform float uShadowSoftness;
    uniform float uShadowDarkness;
    uniform vec3 uShadowColor;
    
    uniform vec3 uRimColor;
    uniform float uRimStrength;
    uniform float uRimPower;
    
    uniform float uSpecularStrength;
    uniform float uSpecularPower;
    
    // MatCap
    uniform sampler2D uMatCap;
    uniform float uMatCapStrength;
    
    uniform float uKeyLightIntensity;
    uniform float uFillLightIntensity;
    uniform float uAmbientIntensity;
    uniform float uRimLightIntensity;
    
    // Professional Color Grading
    uniform float uSaturation;
    uniform float uTemperature;
    uniform float uTint;
    uniform float uBrightness;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vViewNormal;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    
    // Color Grading Utilities
    vec3 applyTemperature(vec3 color, float temp) {
      vec3 warm = vec3(1.0, 0.9, 0.7);
      vec3 cool = vec3(0.7, 0.9, 1.0);
      vec3 tempShift = mix(cool, warm, temp * 0.5 + 0.5);
      return color * tempShift;
    }
    
    vec3 applyTint(vec3 color, float tint) {
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

      vec3 keyLightDir = vec3(0.3, 0.8, -0.5);
      vec3 keyLightColor = vec3(1.0);
      
      #if NUM_DIR_LIGHTS > 0
        keyLightDir = normalize(directionalLights[0].direction);
        keyLightColor = directionalLights[0].color;
      #endif
      
      // Calculate Shadow Map (Standard Three.js Shadows)
      float realShadow = 1.0;
      // #ifdef USE_SHADOWMAP
      //   realShadow = getShadowMask();
      // #endif

      vec3 fillLightDir = normalize(vec3(-0.7, 0.3, -0.5));
      float fillNdotL = max(dot(normal, fillLightDir), 0.0);
      vec3 fillContribution = baseColor * fillNdotL * uFillLightIntensity;

      vec3 ambientContribution = baseColor * uAmbientIntensity;

      vec3 backLightDir = normalize(vec3(0.0, 0.3, 0.8));
      float backNdotL = max(dot(normal, backLightDir), 0.0);
      vec3 backRimContribution = baseColor * backNdotL * uRimLightIntensity;

      // === DIFFUSE WITH RAMP OR CEL-SHADING ===
      float NdotL = dot(normal, keyLightDir);
      float halfLambert = NdotL * 0.5 + 0.5;
      
      // Modulate halfLambert by real shadow map
      // This forces the "unlit" side of the ramp when in shadow
      halfLambert *= realShadow;
      
      float shadowMask;

      
      if (uUseRamp > 0.5) {
        // PROCEDURAL TOON RAMP (No Texture)
        float toonEdge = smoothstep(
          uShadowThreshold - uShadowSoftness,
          uShadowThreshold + uShadowSoftness,
          halfLambert
        );
        shadowMask = toonEdge;
      } else {
        // Fallback: Smooth Half-Lambert
        shadowMask = halfLambert;
      }
      
      // Mix shadow and lit colors
      // Map Darkness slider: 0.0 (brighter) -> 1.0 (black)
      float darknessMult = max(0.0, 1.0 - uShadowDarkness);
      vec3 shadowedColor = baseColor * uShadowColor * darknessMult;
      shadowedColor = max(shadowedColor, vec3(0.01)); // Prevent total pitch black
      
      vec3 litColor = baseColor * uKeyLightIntensity;
      
      // Shadow mask logic: mix(shadow, lit, 0-1 mask)
      vec3 diffuse = mix(shadowedColor, litColor, shadowMask);

      // === MATCAP (for metals) ===
      vec3 matcapContribution = vec3(0.0);
      if (uMatCapStrength > 0.0) {
        vec3 viewNormal = normalize(vViewNormal);
        vec2 matcapUV = viewNormal.xy * 0.5 + 0.5;
        vec3 matcapColor = texture2D(uMatCap, matcapUV).rgb;
        matcapContribution = matcapColor * uMatCapStrength;
      }

      // === SPECULAR ===
      vec3 halfDir = normalize(keyLightDir + viewDir);
      float NdotH = max(dot(normal, halfDir), 0.0);
      float specular = pow(NdotH, uSpecularPower);
      specular = smoothstep(0.4, 0.6, specular) * uSpecularStrength;
      specular *= realShadow; // Mask specular by shadow

      // === RIM LIGHTING ===
      float NdotV = max(dot(normal, viewDir), 0.0);
      float rim = 1.0 - NdotV;
      rim = pow(rim, uRimPower) * uRimStrength;
      rim *= shadowMask * 0.7 + 0.3;

      // === FINAL COMPOSITION ===
      vec3 finalColor = diffuse * keyLightColor;
      finalColor += fillContribution;
      finalColor += ambientContribution;
      finalColor += backRimContribution;
      finalColor += specular * keyLightColor * 0.5;
      finalColor += uRimColor * rim * 0.25;
      finalColor = mix(finalColor, finalColor + matcapContribution, uMatCapStrength);

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
