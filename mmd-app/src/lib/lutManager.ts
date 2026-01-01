import * as THREE from 'three';
import { LUTCubeLoader } from 'three/examples/jsm/loaders/LUTCubeLoader.js';

/**
 * LUT (Look-Up Table) Generator and Manager
 * Creates procedural LUTs for color grading in anime/Genshin Impact style
 */

export interface LUTSettings {
  size: number; // 16, 32, or 64 (higher = more accurate but slower)
  shadows: { r: number; g: number; b: number }; // RGB shift for shadows
  midtones: { r: number; g: number; b: number }; // RGB shift for midtones
  highlights: { r: number; g: number; b: number }; // RGB shift for highlights
  saturation: number; // Overall saturation multiplier
  contrast: number; // Contrast adjustment
}

/**
 * Generate a 3D LUT texture from settings
 */
export function generateLUT3D(settings: LUTSettings): THREE.Data3DTexture {
  const size = settings.size;
  const data = new Uint8Array(size * size * size * 4);
  
  let index = 0;
  
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Normalize to 0-1
        let r = x / (size - 1);
        let g = y / (size - 1);
        let b = z / (size - 1);
        
        // Calculate luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Apply color shifts based on luminance
        if (lum < 0.33) {
          // Shadows
          const t = lum / 0.33;
          r += settings.shadows.r * (1 - t) * 0.1;
          g += settings.shadows.g * (1 - t) * 0.1;
          b += settings.shadows.b * (1 - t) * 0.1;
        } else if (lum < 0.66) {
          // Midtones
          const t = (lum - 0.33) / 0.33;
          r += settings.midtones.r * (1 - Math.abs(t - 0.5) * 2) * 0.05;
          g += settings.midtones.g * (1 - Math.abs(t - 0.5) * 2) * 0.05;
          b += settings.midtones.b * (1 - Math.abs(t - 0.5) * 2) * 0.05;
        } else {
          // Highlights
          const t = (lum - 0.66) / 0.34;
          r += settings.highlights.r * t * 0.08;
          g += settings.highlights.g * t * 0.08;
          b += settings.highlights.b * t * 0.08;
        }
        
        // Apply saturation
        if (settings.saturation !== 1.0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * settings.saturation;
          g = gray + (g - gray) * settings.saturation;
          b = gray + (b - gray) * settings.saturation;
        }
        
        // Apply contrast
        if (settings.contrast !== 1.0) {
          r = (r - 0.5) * settings.contrast + 0.5;
          g = (g - 0.5) * settings.contrast + 0.5;
          b = (b - 0.5) * settings.contrast + 0.5;
        }
        
        // Clamp to 0-1 and convert to 0-255
        data[index++] = Math.max(0, Math.min(255, Math.floor(r * 255)));
        data[index++] = Math.max(0, Math.min(255, Math.floor(g * 255)));
        data[index++] = Math.max(0, Math.min(255, Math.floor(b * 255)));
        data[index++] = 255; // Alpha
      }
    }
  }
  
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.wrapR = THREE.ClampToEdgeWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  
  return texture;
}

/**
 * Preset LUT configurations
 */
export const LUTPresets = {
  // Genshin Impact style - warm highlights, cool shadows, vibrant
  genshin: {
    size: 32,
    shadows: { r: -0.2, g: -0.1, b: 0.3 },      // Cool blue shadows
    midtones: { r: 0.0, g: 0.05, b: 0.0 },       // Slight green push
    highlights: { r: 0.3, g: 0.2, b: -0.1 },     // Warm golden highlights
    saturation: 1.15,
    contrast: 1.05
  },
  
  // Honkai Impact style - cooler overall, high contrast
  honkai: {
    size: 32,
    shadows: { r: 0.0, g: -0.1, b: 0.2 },
    midtones: { r: 0.0, g: 0.0, b: 0.1 },
    highlights: { r: 0.1, g: 0.15, b: 0.2 },
    saturation: 1.2,
    contrast: 1.15
  },
  
  // Classic anime - slightly desaturated, soft
  classicAnime: {
    size: 32,
    shadows: { r: 0.1, g: 0.0, b: 0.1 },
    midtones: { r: 0.0, g: 0.0, b: 0.0 },
    highlights: { r: 0.1, g: 0.1, b: 0.0 },
    saturation: 0.95,
    contrast: 1.0
  },
  
  // Vibrant - high saturation, warm
  vibrant: {
    size: 32,
    shadows: { r: 0.0, g: 0.0, b: 0.0 },
    midtones: { r: 0.1, g: 0.05, b: 0.0 },
    highlights: { r: 0.2, g: 0.15, b: 0.0 },
    saturation: 1.3,
    contrast: 1.1
  },
  
  // Neutral - no color grading
  neutral: {
    size: 16,
    shadows: { r: 0.0, g: 0.0, b: 0.0 },
    midtones: { r: 0.0, g: 0.0, b: 0.0 },
    highlights: { r: 0.0, g: 0.0, b: 0.0 },
    saturation: 1.0,
    contrast: 1.0
  }
};

/**
 * LUT Cache and Manager
 */
class LUTManager {
  private cache = new Map<string, THREE.Data3DTexture>();
  private cubeLoader = new LUTCubeLoader();
  
  /**
   * Get a preset LUT by name
   */
  getPreset(name: keyof typeof LUTPresets): THREE.Data3DTexture {
    if (this.cache.has(name)) {
      return this.cache.get(name)!;
    }
    
    const preset = LUTPresets[name];
    const lut = generateLUT3D(preset);
    this.cache.set(name, lut);
    
    console.log(`✅ Generated LUT preset: ${name}`);
    return lut;
  }
  
  /**
   * Load a .cube LUT file
   */
  async loadCube(url: string): Promise<THREE.Data3DTexture> {
    return new Promise((resolve, reject) => {
      this.cubeLoader.load(
        url,
        (result) => {
          const lut3d = result.texture3D as THREE.Data3DTexture;
          console.log(`✅ Loaded .cube LUT from: ${url}`);
          resolve(lut3d);
        },
        undefined,
        (error) => {
          console.error(`❌ Failed to load .cube LUT:`, error);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Generate custom LUT from settings
   */
  generateCustom(settings: LUTSettings, cacheName?: string): THREE.Data3DTexture {
    const lut = generateLUT3D(settings);
    
    if (cacheName) {
      this.cache.set(cacheName, lut);
    }
    
    return lut;
  }
  
  /**
   * Clear cache
   */
  dispose() {
    this.cache.forEach(lut => lut.dispose());
    this.cache.clear();
  }
  
  /**
   * Get cache stats
   */
  getStats() {
    return {
      cachedLUTs: this.cache.size,
      names: Array.from(this.cache.keys())
    };
  }
}

export const lutManager = new LUTManager();
