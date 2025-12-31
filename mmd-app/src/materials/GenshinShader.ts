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
    uShadowSteps: { value: 2.0 }, // Fewer steps for cleaner look
    uShadowThreshold: { value: 0.45 }, // Where shadow starts
    uShadowSoftness: { value: 0.08 }, // Edge softness
    uShadowDarkness: { value: 0.35 }, // How dark shadows are (0 = black, 1 = no shadow)
    uShadowColor: { value: new THREE.Color('#6a5a8a') }, // Purple-ish shadow tint
    // Rim light
    uRimColor: { value: new THREE.Color('#ffffff') },
    uRimStrength: { value: 0.8 },
    uRimPower: { value: 2.5 },
    // Specular
    uSpecularStrength: { value: 0.3 },
    uSpecularPower: { value: 48.0 },
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

      // Get main light direction
      vec3 lightDir = vec3(0.3, 0.8, -0.5);
      vec3 lightColor = vec3(1.0);
      
      #if NUM_DIR_LIGHTS > 0
        lightDir = normalize(directionalLights[0].direction);
        lightColor = directionalLights[0].color;
      #endif

      // === DIFFUSE WITH CEL-SHADING ===
      float NdotL = dot(normal, lightDir);
      float halfLambert = NdotL * 0.5 + 0.5;
      
      // Smooth step for clean shadow edge
      float shadowMask = smoothstep(uShadowThreshold - uShadowSoftness, uShadowThreshold + uShadowSoftness, halfLambert);
      
      // Create shadow color by mixing base with shadow tint
      vec3 shadowColor = baseColor * uShadowColor * uShadowDarkness;
      vec3 litColor = baseColor;
      
      // Mix between shadow and lit based on mask
      vec3 diffuse = mix(shadowColor, litColor, shadowMask);

      // === SPECULAR (subtle, cel-shaded) ===
      vec3 halfDir = normalize(lightDir + viewDir);
      float NdotH = max(dot(normal, halfDir), 0.0);
      float specular = pow(NdotH, uSpecularPower);
      // Sharp cutoff for anime specular
      specular = smoothstep(0.4, 0.6, specular) * uSpecularStrength;

      // === RIM LIGHTING ===
      float NdotV = max(dot(normal, viewDir), 0.0);
      float rim = 1.0 - NdotV;
      rim = pow(rim, uRimPower) * uRimStrength;
      // Appear more on lit areas
      rim *= shadowMask * 0.7 + 0.3;

      // === FINAL COMPOSITION ===
      vec3 finalColor = diffuse * lightColor;
      finalColor += specular * lightColor * 0.5;
      finalColor += uRimColor * rim * 0.25;

      // Preserve color saturation
      float lum = dot(finalColor, vec3(0.299, 0.587, 0.114));
      finalColor = mix(vec3(lum), finalColor, 1.1);

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
};
