import * as THREE from 'three';

/**
 * Cache for generated shader materials to prevent memory leaks
 * and reduce overhead when switching models
 */
class ShaderCache {
  private cache = new Map<string, THREE.ShaderMaterial>();

  get(
    vertexShader: string, 
    fragmentShader: string, 
    uniforms: { [uniform: string]: THREE.IUniform }, 
    defines: { [key: string]: string } = {}
  ): THREE.ShaderMaterial {
    // Create unique key based on shader content
    const key = JSON.stringify({ 
      v: vertexShader.length, 
      f: fragmentShader.length, 
      d: defines 
    });

    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!.clone();
      // We must clone the uniforms to ensure each material instance is independent
      cached.uniforms = THREE.UniformsUtils.clone(uniforms);
      return cached;
    }

    // Create new material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: THREE.UniformsUtils.clone(uniforms),
      defines,
      lights: true,
      name: 'GenshinShader_Cached'
    });

    this.cache.set(key, material);
    
    // Return a clone so the cached base remains pure
    const instance = material.clone();
    instance.uniforms = THREE.UniformsUtils.clone(uniforms);
    return instance;
  }

  clear() {
    this.cache.forEach(mat => mat.dispose());
    this.cache.clear();
  }
}

export const shaderCache = new ShaderCache();
