import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// BoxGeometry material order: [+x, -x, +y, -y, +z, -z]
const FACE_VALUES = [3, 4, 2, 5, 1, 6];
const FACE_NORMALS = [
  new THREE.Vector3( 1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3( 0, 1, 0),
  new THREE.Vector3( 0,-1, 0),
  new THREE.Vector3( 0, 0, 1),
  new THREE.Vector3( 0, 0,-1),
];

/** quaternion to show value V toward camera (+Z) */
const FRONT_QUATS: THREE.Quaternion[] = [
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),           // 1 → face index 4 (+z)
  new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), // 2 → face index 2 (+y)
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)), // 3 → face index 0 (+x)
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0,  Math.PI / 2, 0)), // 4 → face index 1 (-x)
  new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI / 2, 0, 0)), // 5 → face index 3 (-y)
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0,  Math.PI, 0)),     // 6 → face index 5 (-z)
];

// pip positions (normalized 0-1)
const PIPS: [number, number][][] = [
  [[0.5, 0.5]],
  [[0.72, 0.28], [0.28, 0.72]],
  [[0.72, 0.28], [0.5, 0.5], [0.28, 0.72]],
  [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  [[0.28, 0.2],  [0.72, 0.2],  [0.28, 0.5], [0.72, 0.5], [0.28, 0.8], [0.72, 0.8]],
];

let texCache = new Map<number, THREE.CanvasTexture>();
function getTex(value: number): THREE.CanvasTexture {
  if (texCache.has(value)) return texCache.get(value)!;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, S, S);
  const r = 36;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(r,0); ctx.lineTo(S-r,0); ctx.arcTo(S,0,S,r,r);
  ctx.lineTo(S,S-r); ctx.arcTo(S,S,S-r,S,r);
  ctx.lineTo(r,S); ctx.arcTo(0,S,0,S-r,r);
  ctx.lineTo(0,r); ctx.arcTo(0,0,r,0,r);
  ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0,0,S*0.7,S*0.7);
  g.addColorStop(0,'rgba(255,255,255,0.5)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fill();
  const dotR = S * 0.085;
  const isRed = value === 1;
  for (const [nx, ny] of PIPS[value-1]) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(nx*S+3, ny*S+4, dotR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = isRed ? '#cc1a1a' : '#1a0a0a';
    ctx.beginPath(); ctx.arc(nx*S, ny*S, dotR, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.arc(nx*S-dotR*0.28, ny*S-dotR*0.28, dotR*0.45, 0, Math.PI*2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  texCache.set(value, tex);
  return tex;
}

// Reset caches on hot reload
texCache = new Map();
let sharedMats: THREE.MeshStandardMaterial[] | null = null;
sharedMats = null;
function getMats() {
  if (!sharedMats) {
    sharedMats = FACE_VALUES.map(v => new THREE.MeshStandardMaterial({
      map: getTex(v), roughness: 0.3, metalness: 0.05,
    }));
  }
  return sharedMats;
}

interface DieProps {
  value: number;
  rolling: boolean;
}

function Die({ value, rolling }: DieProps) {
  const mats = useMemo(getMats, []);
  const meshRef = useRef<THREE.Mesh>(null!);
  const spinRef = useRef(new THREE.Euler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  ));

  useFrame((_, delta) => {
    if (rolling) {
      spinRef.current.x += delta * 8;
      spinRef.current.y += delta * 11;
      spinRef.current.z += delta * 6;
      meshRef.current.rotation.set(spinRef.current.x, spinRef.current.y, spinRef.current.z);
    } else {
      const target = FRONT_QUATS[value - 1];
      meshRef.current.quaternion.slerp(target, 0.12);
    }
  });

  return (
    <mesh ref={meshRef} material={mats}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
    </mesh>
  );
}

interface Props {
  value: number;
  rolling: boolean;
  size: number;
}

export function DiceCanvas({ value, rolling, size }: Props) {
  return (
    <Canvas
      style={{ width: size, height: size }}
      camera={{ position: [0, 0, 3.5], fov: 42 }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <ambientLight intensity={1.8} />
      <pointLight position={[-4, 6, 4]} intensity={1.0} />
      <pointLight position={[3, -1, 3]} intensity={0.5} color="#ffffff" />
      <Die value={value} rolling={rolling} />
    </Canvas>
  );
}
