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
      vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vec4 worldPosition = vec4(vWorldPosition, 1.0); // Required for shadowmap_vertex
      
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
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec3 vViewNormal;

    #include <common>
    #include <packing>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>

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
      vec3 shadowColor = baseColor * uShadowColor * uShadowDarkness;
      vec3 litColor = baseColor * uKeyLightIntensity;
      
      if (uUseRamp > 0.5) {
        // Use gradient ramp texture
        float rampValue = texture2D(uRampTexture, vec2(halfLambert, 0.5)).r;
        shadowMask = rampValue;
      } else {
        // Use smoothstep cel-shading
        shadowMask = smoothstep(
          uShadowThreshold - uShadowSoftness,
          uShadowThreshold + uShadowSoftness,
          halfLambert
        );
      }
      
      vec3 diffuse = mix(shadowColor, litColor, shadowMask);

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

      float lum = dot(finalColor, vec3(0.299, 0.587, 0.114));
      finalColor = mix(vec3(lum), finalColor, 1.1);

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
};
