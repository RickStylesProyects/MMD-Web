import * as THREE from 'three';

/**
 * Height Fog Utility
 * Applies exponential height-based fog to materials via onBeforeCompile
 */

export interface HeightFogSettings {
  color: THREE.Color;
  density: number;
  heightBase: number;
  enabled: boolean;
}

/**
 * Apply height fog to a material
 */
export function applyHeightFog(
  material: THREE.Material,
  settings: HeightFogSettings
): void {
  if (!settings.enabled) return;
  
  // Skip if already applied
  if ((material as any).userData?.heightFogApplied) return;
  
  // Only apply to materials that support onBeforeCompile
  if (!('onBeforeCompile' in material)) return;
  
  const mat = material as THREE.ShaderMaterial | THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  
  mat.onBeforeCompile = (shader) => {
    // Add uniforms
    shader.uniforms.uFogColor = { value: settings.color };
    shader.uniforms.uFogDensity = { value: settings.density };
    shader.uniforms.uFogHeightBase = { value: settings.heightBase };
    
    // Add to vertex shader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vWorldPosition;
      `
    );
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      #include <project_vertex>
      vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `
    );
    
    // Add to fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uFogHeightBase;
      varying vec3 vWorldPosition;
      `
    );
    
    // Replace default fog with height fog
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      `
      // Height-based exponential fog
      float heightFactor = max(0.0, vWorldPosition.y - uFogHeightBase);
      float fogFactor = 1.0 - exp(-uFogDensity * heightFactor);
      fogFactor = clamp(fogFactor, 0.0, 1.0);
      gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, fogFactor);
      `
    );
    
    // Store reference to update uniforms later
    (material as any).userData.heightFogShader = shader;
  };
  
  (material as any).userData.heightFogApplied = true;
  material.needsUpdate = true;
}

/**
 * Update height fog uniforms for an already-processed material
 */
export function updateHeightFog(
  material: THREE.Material,
  settings: HeightFogSettings
): void {
  const shader = (material as any).userData?.heightFogShader;
  if (!shader) return;
  
  if (shader.uniforms.uFogColor) {
    shader.uniforms.uFogColor.value.copy(settings.color);
  }
  if (shader.uniforms.uFogDensity) {
    shader.uniforms.uFogDensity.value = settings.density;
  }
  if (shader.uniforms.uFogHeightBase) {
    shader.uniforms.uFogHeightBase.value = settings.heightBase;
  }
}

/**
 * Apply height fog to all materials in a scene
 */
export function applyHeightFogToScene(
  scene: THREE.Scene,
  settings: HeightFogSettings
): void {
  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      
      materials.forEach(mat => {
        if (mat) {
          applyHeightFog(mat, settings);
        }
      });
    }
  });
}

/**
 * Update height fog for all materials in a scene
 */
export function updateHeightFogInScene(
  scene: THREE.Scene,
  settings: HeightFogSettings
): void {
  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      
      materials.forEach(mat => {
        if (mat && (mat as any).userData?.heightFogApplied) {
          updateHeightFog(mat, settings);
        }
      });
    }
  });
}
