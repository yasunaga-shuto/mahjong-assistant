import React, { useCallback, useEffect, useRef } from 'react';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import * as THREE from 'three';

// BoxGeometry face order: [+x, -x, +y, -y, +z, -z]
const FACE_VALUES = [3, 4, 2, 5, 1, 6];

const FRONT_QUATS: THREE.Quaternion[] = [
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0)),             // 1 → +z
  new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), // 2 → +y
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)), // 3 → +x
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0,  Math.PI / 2, 0)), // 4 → -x
  new THREE.Quaternion().setFromEuler(new THREE.Euler( Math.PI / 2, 0, 0)), // 5 → -y
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0,  Math.PI, 0)),     // 6 → -z
];

const PIPS: [number, number][][] = [
  [[0.5, 0.5]],
  [[0.72, 0.28], [0.28, 0.72]],
  [[0.72, 0.28], [0.5, 0.5], [0.28, 0.72]],
  [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  [[0.28, 0.2],  [0.72, 0.2],  [0.28, 0.5], [0.72, 0.5], [0.28, 0.8], [0.72, 0.8]],
];

function createDieTexture(value: number): THREE.DataTexture {
  const S = 128;
  const data = new Uint8Array(4 * S * S);

  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    if (x < 0 || x >= S || y < 0 || y >= S) return;
    const i = (y * S + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };

  const R = 14;
  const inFace = (x: number, y: number) => {
    const dx = Math.max(R - x, 0, x - (S - 1 - R));
    const dy = Math.max(R - y, 0, y - (S - 1 - R));
    return dx * dx + dy * dy <= R * R;
  };

  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (inFace(x, y)) setPixel(x, y, 255, 255, 255);
      else              setPixel(x, y, 220, 220, 220);

  const pipR = S * 0.082;
  const isRed = value === 1;
  for (const [nx, ny] of PIPS[value - 1]) {
    const cx = nx * (S - 1);
    const cy = ny * (S - 1);
    for (let y = Math.floor(cy - pipR - 1); y <= Math.ceil(cy + pipR + 1); y++)
      for (let x = Math.floor(cx - pipR - 1); x <= Math.ceil(cx + pipR + 1); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= pipR * pipR)
          setPixel(x, y, isRed ? 204 : 26, isRed ? 26 : 10, isRed ? 26 : 10);
  }

  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function DiceCanvas({ value, rolling, size }: { value: number; rolling: boolean; size: number }) {
  const valueRef   = useRef(value);
  const rollingRef = useRef(rolling);
  const rafRef     = useRef<number>(0);

  useEffect(() => { valueRef.current = value; },   [value]);
  useEffect(() => { rollingRef.current = rolling; }, [rolling]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;

    // Minimal canvas-like object Three.js needs when given an existing context
    const fakeCanvas = {
      width: W, height: H,
      style: { width: `${W}px`, height: `${H}px` },
      addEventListener: () => {},
      removeEventListener: () => {},
      clientWidth: W, clientHeight: H,
      getContext: () => gl,
    } as unknown as HTMLCanvasElement;

    const renderer = new THREE.WebGLRenderer({
      canvas: fakeCanvas,
      context: gl as unknown as WebGLRenderingContext,
      alpha: true,
      antialias: false,
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    const geometry  = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const materials = FACE_VALUES.map(v =>
      new THREE.MeshBasicMaterial({ map: createDieTexture(v) })
    );
    const mesh = new THREE.Mesh(geometry, materials);
    scene.add(mesh);

    const spin = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      0,
    );
    let lastT = 0;

    const animate = (t: number) => {
      rafRef.current = requestAnimationFrame(animate);
      const dt = Math.min((t - lastT) / 1000, 0.1);
      lastT = t;

      if (rollingRef.current) {
        spin.x += dt * 8;
        spin.y += dt * 11;
        mesh.rotation.set(spin.x, spin.y, spin.z);
      } else {
        mesh.quaternion.slerp(FRONT_QUATS[valueRef.current - 1], 0.12);
      }

      renderer.render(scene, camera);
      (gl as ExpoWebGLRenderingContext).endFrameEXP();
    };
    rafRef.current = requestAnimationFrame(animate);
  }, []); // runs once; value/rolling accessed via refs

  return (
    <GLView
      style={{ width: size, height: size }}
      onContextCreate={onContextCreate}
    />
  );
}
