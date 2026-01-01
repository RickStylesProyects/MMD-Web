import * as THREE from 'three';

/**
 * Hair Shader with Kajiya-Kay Anisotropic Specular
 * Creates the characteristic "angelic halo" effect on hair
 * Based on tangent-space specular highlights
 */
export const HairShader = {
  uniforms: {
    ...THREE.UniformsLib.common,
    ...THREE.UniformsLib.lights,
    ...THREE.UniformsLib.fog,
    
    // Base material
    uColor: { value: new THREE.Color('#ffffff') },
    uMap: { value: null },
    uHasMap: { value: 0.0 },
    
    // Shadow control (cel-shading)
    uShadowThreshold: { value: 0.45 },
    uShadowSoftness: { value: 0.08 },
    uShadowDarkness: { value: 0.35 },
    uShadowColor: { value: new THREE.Color('#6a5a8a') },
    
    // Anisotropic Hair Specular (Kajiya-Kay)
    uHairSpecularPower: { value: 32.0 },
    uHairSpecularStrength: { value: 0.6 },
    uHairSpecularShift: { value: 0.1 },
    uHairSpecularColor: { value: new THREE.Color('#ffffff') },
    
    // Rim light
    uRimColor: { value: new THREE.Color('#ffffff') },
    uRimStrength: { value: 0.8 },
    uRimPower: { value: 2.5 },
    
    // Light intensity controls
    uKeyLightIntensity: { value: 1.0 },
    uAmbientIntensity: { value: 0.3 },
    
    // Professional Color Grading (Clothing + Hair group)
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
    varying vec3 vTangent;
    varying vec3 vBitangent;

    #include <common>
    #include <uv_pars_vertex>
    #include <skinning_pars_vertex>
    #include <morphtarget_pars_vertex>
    #include <shadowmap_pars_vertex>

    void main() {
      vUv = uv;
      
      // Skinning and morph support
      #include <begin_vertex>
      #include <morphtarget_vertex>
      #include <skinbase_vertex>
      #include <skinning_vertex>
      
      // Normals
      #include <beginnormal_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
      
      vNormal = normalize(normalMatrix * objectNormal);
      
      // Compute tangent for hair (flow along Y/Vertical mostly, or XZ plane)
      // MMD hair creates flow from UVs usually, but we approximate:
      vec3 tangent = normalize(cross(objectNormal, vec3(0.0, 1.0, 0.0)));
      if (length(tangent) < 0.001) tangent = normalize(cross(objectNormal, vec3(0.0, 0.0, 1.0)));
      
      vTangent = normalize(normalMatrix * tangent);
      vBitangent = cross(vNormal, vTangent);
      
      vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
      vViewPosition = -mvPosition.xyz;
      
      // vec4 worldPosition = modelMatrix * vec4(transformed, 1.0); // Define worldPosition for shadowmap
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
    
    uniform float uShadowThreshold;
    uniform float uShadowSoftness;
    uniform float uShadowDarkness;
    uniform vec3 uShadowColor;
    
    // Hair specular
    uniform float uHairSpecularPower;
    uniform float uHairSpecularStrength;
    uniform float uHairSpecularShift;
    uniform vec3 uHairSpecularColor;
    
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
    varying vec3 vTangent;
    varying vec3 vBitangent;

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
      vec3 tangent = normalize(vTangent);
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

      // === DIFFUSE WITH CEL-SHADING ===
      float NdotL = dot(normal, keyLightDir);
      float halfLambert = NdotL * 0.5 + 0.5;
      
      float shadowMask = smoothstep(
        uShadowThreshold - uShadowSoftness,
        uShadowThreshold + uShadowSoftness,
        halfLambert
      );
      
      // Map Darkness slider: 0.0 (brighter) -> 1.0 (black)
      float darknessMult = max(0.0, 1.0 - uShadowDarkness);
      vec3 shadowColor = baseColor * uShadowColor * darknessMult;
      shadowColor = max(shadowColor, vec3(0.01));
      
      vec3 litColor = baseColor * uKeyLightIntensity;
      vec3 diffuse = mix(shadowColor, litColor, shadowMask);

      // === KAJIYA-KAY ANISOTROPIC HAIR SPECULAR ===
      // This creates the characteristic "angelic halo" on hair
      
      // Shift tangent along normal (simulates hair cuticle)
      vec3 shiftedTangent = normalize(tangent + normal * uHairSpecularShift);
      
      // Calculate half vector
      vec3 H = normalize(keyLightDir + viewDir);
      
      // Kajiya-Kay specular term
      float TdotH = dot(shiftedTangent, H);
      float sinTH = sqrt(1.0 - TdotH * TdotH);
      
      // Directional attenuation (specular only on appropriate side)
      float dirAtten = smoothstep(-1.0, 0.0, TdotH);
      
      // Final specular
      float hairSpec = dirAtten * pow(sinTH, uHairSpecularPower) * uHairSpecularStrength;
      
      // Modulate by shadow for more natural look
      hairSpec *= shadowMask * 0.7 + 0.3;
      
      vec3 specularContribution = uHairSpecularColor * hairSpec;

      // === RIM LIGHTING ===
      float NdotV = max(dot(normal, viewDir), 0.0);
      float rim = 1.0 - NdotV;
      rim = pow(rim, uRimPower) * uRimStrength;
      rim *= shadowMask * 0.5 + 0.5;

      // === AMBIENT ===
      vec3 ambientContribution = baseColor * uAmbientIntensity;

      // === FINAL COMPOSITION ===
      vec3 finalColor = diffuse * keyLightColor;
      finalColor += ambientContribution;
      finalColor += specularContribution;
      finalColor += uRimColor * rim * 0.25;

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
