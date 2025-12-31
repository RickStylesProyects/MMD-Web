// @ts-nocheck
import { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { useStore } from '../store/useStore';
import * as THREE from 'three';

// Animated Gradient Background Shader Material
const GradientBackgroundMaterial = shaderMaterial(
  {
    uColor1: new THREE.Color('#1a1a2e'),
    uColor2: new THREE.Color('#16213e'),
    uTime: 0,
    uNoiseScale: 2.5,
    uAnimated: 1.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader with Simplex Noise
  `
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uTime;
    uniform float uNoiseScale;
    uniform float uAnimated;
    
    varying vec2 vUv;
    
    // Simplex 2D noise
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }
    
    void main() {
      // Animated noise
      float timeOffset = uTime * 0.1 * uAnimated;
      vec2 noiseCoord = vUv * uNoiseScale + vec2(timeOffset, timeOffset * 0.5);
      
      float noise = snoise(noiseCoord) * 0.5 + 0.5;
      
      // Create organic blend pattern
      float blend = vUv.y * 0.5 + noise * 0.5;
      blend = smoothstep(0.2, 0.8, blend);
      
      vec3 color = mix(uColor1, uColor2, blend);
      
      // Add subtle vignette
      vec2 center = vUv - 0.5;
      float vignette = 1.0 - dot(center, center) * 0.5;
      color *= vignette;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ GradientBackgroundMaterial });

// Declare for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      gradientBackgroundMaterial: any;
    }
  }
}

export function Environment() {
  const { backgroundColor1, backgroundColor2, backgroundAnimated } = useStore();
  
  const backgroundRef = useRef<any>(null);
  const particleMesh = useRef<THREE.InstancedMesh>(null);
  
  // Particles Logic
  const count = 200;
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Update background shader time
    if (backgroundRef.current) {
      backgroundRef.current.uTime = time;
      backgroundRef.current.uColor1.set(backgroundColor1);
      backgroundRef.current.uColor2.set(backgroundColor2);
      backgroundRef.current.uAnimated = backgroundAnimated ? 1.0 : 0.0;
    }
    
    // Update particles
    if (!particleMesh.current) return;
    
    particles.forEach((particle, i) => {
      let { t, speed, xFactor, yFactor, zFactor, factor } = particle;
      t = particle.t += speed / 2;
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.max(0.3, Math.cos(t) * 0.5 + 0.5);

      dummy.position.set(
        (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      dummy.scale.setScalar(s * 0.5);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      
      dummy.updateMatrix();
      particleMesh.current!.setMatrixAt(i, dummy.matrix);
    });
    particleMesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Animated Gradient Background */}
      <mesh position={[0, 0, -100]} renderOrder={-1}>
        <planeGeometry args={[500, 500]} />
        <gradientBackgroundMaterial 
          ref={backgroundRef}
          depthWrite={false}
        />
      </mesh>
      
      {/* Fog for depth */}
      <fog attach="fog" args={[backgroundColor1, 10, 50]} />
      
      {/* Floating Particles */}
      <instancedMesh ref={particleMesh} args={[undefined, undefined, count]}>
        <dodecahedronGeometry args={[0.05, 0]} />
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={0.5} 
          transparent 
          opacity={0.6} 
        />
      </instancedMesh>
    </>
  );
}
