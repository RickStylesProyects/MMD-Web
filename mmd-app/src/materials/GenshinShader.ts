import * as THREE from 'three';

// Genshin/MiSide style toon shader with balanced cel-shading and better shadows
export const GenshinToonShader = {
  uniforms: {
    ...THREE.UniformsLib.common,
    ...THREE.UniformsLib.lights,
    uColor: { value: new THREE.Color('#ffffff') },
    uMap: { value: null },
    uHasMap: { value: 0.0 },
    // Cel-shading parameters
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
    // === NEW: Light intensity controls from UI ===
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

    #include <common>
    #include <skinning_pars_vertex>

    void main() {
      vUv = uv;
      
      #include <skinbase_vertex>
      #include <begin_vertex>
      #include <skinning_vertex>
      #include <beginnormal_vertex>
      #include <defaultnormal_vertex>
      #include <skinnormal_vertex>
      
      vNormal = normalize(normalMatrix * objectNormal);
      
      vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform sampler2D uMap;
    uniform float uHasMap;
    uniform float uShadowSteps;
    uniform float uShadowThreshold;
    uniform float uShadowSoftness;
    uniform float uShadowDarkness;
    uniform vec3 uShadowColor;
    uniform vec3 uRimColor;
    uniform float uRimStrength;
    uniform float uRimPower;
    uniform float uSpecularStrength;
    uniform float uSpecularPower;
    // Light controls from UI
    uniform float uKeyLightIntensity;
    uniform float uFillLightIntensity;
    uniform float uAmbientIntensity;
    uniform float uRimLightIntensity;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    #include <common>
    #include <lights_pars_begin>

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

      // === KEY LIGHT ===
      vec3 keyLightDir = vec3(0.3, 0.8, -0.5);
      vec3 keyLightColor = vec3(1.0);
      
      #if NUM_DIR_LIGHTS > 0
        keyLightDir = normalize(directionalLights[0].direction);
        keyLightColor = directionalLights[0].color;
      #endif

      // === FILL LIGHT (from left side) ===
      vec3 fillLightDir = normalize(vec3(-0.7, 0.3, -0.5));
      float fillNdotL = max(dot(normal, fillLightDir), 0.0);
      vec3 fillContribution = baseColor * fillNdotL * uFillLightIntensity;

      // === AMBIENT (uniform lighting) ===
      vec3 ambientContribution = baseColor * uAmbientIntensity;

      // === BACK RIM LIGHT ===
      vec3 backLightDir = normalize(vec3(0.0, 0.3, 0.8));
      float backNdotL = max(dot(normal, backLightDir), 0.0);
      vec3 backRimContribution = baseColor * backNdotL * uRimLightIntensity;

      // === DIFFUSE WITH CEL-SHADING (Key Light) ===
      float NdotL = dot(normal, keyLightDir);
      float halfLambert = NdotL * 0.5 + 0.5;
      
      // Smooth step for clean shadow edge
      float shadowMask = smoothstep(uShadowThreshold - uShadowSoftness, uShadowThreshold + uShadowSoftness, halfLambert);
      
      // Create shadow color by mixing base with shadow tint
      vec3 shadowColor = baseColor * uShadowColor * uShadowDarkness;
      vec3 litColor = baseColor * uKeyLightIntensity;
      
      // Mix between shadow and lit based on mask
      vec3 diffuse = mix(shadowColor, litColor, shadowMask);

      // === SPECULAR (subtle, cel-shaded) ===
      vec3 halfDir = normalize(keyLightDir + viewDir);
      float NdotH = max(dot(normal, halfDir), 0.0);
      float specular = pow(NdotH, uSpecularPower);
      specular = smoothstep(0.4, 0.6, specular) * uSpecularStrength;

      // === RIM LIGHTING (shader-based) ===
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

      // Preserve color saturation
      float lum = dot(finalColor, vec3(0.299, 0.587, 0.114));
      finalColor = mix(vec3(lum), finalColor, 1.1);

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
};
