import * as THREE from 'three';

/**
 * Texture Generator for Ramps and Procedural Textures
 * Creates gradient ramp textures for different material types
 */

export interface RampConfig {
  steps: { position: number; value: number }[];
  smooth?: boolean;
}

/**
 * Generate a 1D gradient ramp texture
 */
export function generateRampTexture(config: RampConfig, width: number = 256): THREE.DataTexture {
  const data = new Uint8Array(width * 4); // RGBA = 4 bytes per pixel
  
  for (let i = 0; i < width; i++) {
    const x = i / (width - 1);
    let value = 0;
    
    // Find surrounding steps
    for (let j = 0; j < config.steps.length - 1; j++) {
      const step1 = config.steps[j];
      const step2 = config.steps[j + 1];
      
      if (x >= step1.position && x <= step2.position) {
        const t = (x - step1.position) / (step2.position - step1.position);
        
        if (config.smooth) {
          // Smooth interpolation
          value = step1.value + (step2.value - step1.value) * smoothstep(0, 1, t);
        } else {
          // Linear interpolation
          value = step1.value + (step2.value - step1.value) * t;
        }
        break;
      }
    }
    
    // Clamp 0-1 and convert to 0-255
    const val = Math.floor(Math.max(0, Math.min(1, value)) * 255);
    
    // Fill RGBA channels
    const offset = i * 4;
    data[offset] = val;     // R
    data[offset + 1] = val; // G
    data[offset + 2] = val; // B
    data[offset + 3] = 255; // A (Full Alpha)
  }
  
  const texture = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  
  return texture;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Preset ramp configurations
 */
export const RampPresets = {
  // Soft skin ramp - gradual transition
  skin: {
    steps: [
      { position: 0.0, value: 0.3 },   // Deep shadow
      { position: 0.4, value: 0.4 },   // Transition start
      { position: 0.6, value: 0.8 },   // Transition end
      { position: 1.0, value: 1.0 }    // Full light
    ],
    smooth: true
  },
  
  // Hard metal ramp - sharp transition
  metal: {
    steps: [
      { position: 0.0, value: 0.2 },
      { position: 0.45, value: 0.25 },
      { position: 0.55, value: 0.9 },
      { position: 1.0, value: 1.0 }
    ],
    smooth: false
  },
  
  // Medium cloth ramp
  cloth: {
    steps: [
      { position: 0.0, value: 0.35 },
      { position: 0.5, value: 0.6 },
      { position: 1.0, value: 1.0 }
    ],
    smooth: true
  },
  
  // Classic 2-step toon
  toon: {
    steps: [
      { position: 0.0, value: 0.3 },
      { position: 0.5, value: 0.3 },
      { position: 0.51, value: 1.0 },
      { position: 1.0, value: 1.0 }
    ],
    smooth: false
  }
};

/**
 * Ramp Texture Cache
 */
class RampTextureCache {
  private cache = new Map<string, THREE.DataTexture>();
  
  get(name: string, config?: RampConfig): THREE.DataTexture {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }
    
    // Generate from preset or config
    const rampConfig = config || RampPresets[name as keyof typeof RampPresets];
    if (!rampConfig) {
      console.warn(`Ramp preset "${name}" not found, using default`);
      return this.get('skin');
    }
    
    const texture = generateRampTexture(rampConfig);
    this.cache.set(name, texture);
    console.log(`✅ Generated ramp texture: ${name}`);
    
    return texture;
  }
  
  dispose() {
    this.cache.forEach(tex => tex.dispose());
    this.cache.clear();
  }
}

export const rampTextureCache = new RampTextureCache();

/**
 * Generate default MatCap texture (simple sphere)
 * Real MatCaps should be loaded from image files
 */
export function generateDefaultMatCap(size: number = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 3);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      
      // Normalized coordinates (-1 to 1)
      const nx = (x / size) * 2 - 1;
      const ny = (y / size) * 2 - 1;
      
      // Create simple sphere lighting
      const distSq = nx * nx + ny * ny;
      
      if (distSq <= 1.0) {
        const nz = Math.sqrt(1.0 - distSq);
        
        // Simple lighting calculation
        const lightDir = new THREE.Vector3(0.3, 0.7, 0.6).normalize();
        const normal = new THREE.Vector3(nx, ny, nz);
        const ndotl = Math.max(0, normal.dot(lightDir));
        
        const brightness = 0.4 + ndotl * 0.6;
        const color = Math.floor(brightness * 255);
        
        data[i] = color;
        data[i + 1] = color;
        data[i + 2] = color;
      } else {
        // Outside sphere - black
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
    }
  }
  
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  
  return texture;
}
