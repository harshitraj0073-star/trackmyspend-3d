import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D } from "three";
import { COLORS } from "../lib/constants";

const BOX = { x: 34, y: 18, z: 44 } as const;
const geometry = new IcosahedronGeometry(0.035, 0);
const material = new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.85 });

function wrap(value: number, center: number, size: number): number {
  const half = size / 2;
  const rel = (((value - center + half) % size) + size) % size;
  return center + rel - half;
}

interface ParticlesProps {
  count: number;
}

/** Soft ambient dust that drifts upward and stays wrapped in a box around the camera. */
export function Particles({ count }: ParticlesProps): JSX.Element | null {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const speed = new Float32Array(count);
    const scale = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOX.x;
      pos[i * 3 + 1] = (Math.random() - 0.5) * BOX.y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
      speed[i] = 0.08 + Math.random() * 0.22;
      scale[i] = 0.5 + Math.random() * 1.4;
    }
    return { pos, speed, scale };
  }, [count]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const emerald = new Color(COLORS.emerald);
    const cyan = new Color(COLORS.cyan);
    const white = new Color("#cffafe");
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      m.setColorAt(i, r < 0.45 ? emerald : r < 0.85 ? cyan : white);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const cam = state.camera.position;
    const dt = Math.min(delta, 0.1);
    const { pos, speed, scale } = data;
    for (let i = 0; i < count; i++) {
      const iy = i * 3 + 1;
      pos[iy] += speed[i] * dt;
      dummy.position.set(wrap(pos[i * 3], cam.x, BOX.x), wrap(pos[iy], cam.y, BOX.y), wrap(pos[i * 3 + 2], cam.z - BOX.z * 0.35, BOX.z));
      dummy.scale.setScalar(scale[i]);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  if (count <= 0) return null;
  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}
