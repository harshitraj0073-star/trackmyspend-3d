import { useScroll } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import { Group, Material, Mesh } from "three";
import { STATION_COUNT } from "../lib/constants";
import { STATION_CENTERS } from "./cameraPath";

interface StationGroupProps {
  index: number;
  children: ReactNode;
}

/**
 * Isolates each station so ghost overlaps NEVER occur:
 * - Full opacity when camera is near this station along the spline
 * - Smoothly fades out as camera moves away and sets `visible = false` once faded
 * - During Station 9 (Outro aerial view), keeps all stations visible at subtle scale/opacity.
 */
export function StationGroup({ index, children }: StationGroupProps): JSX.Element {
  const groupRef = useRef<Group>(null);
  const scroll = useScroll();
  const baseOpacity = useRef(new WeakMap<Material, number>());

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const progress = scroll.offset * (STATION_COUNT - 1);
    const isOutroView = progress >= STATION_COUNT - 1.45;
    const distSteps = Math.abs(progress - index);

    let alpha = 1;
    if (index === STATION_COUNT - 1) {
      // Outro deck only appears when arriving at Outro
      alpha = Math.min(1, Math.max(0, (progress - (STATION_COUNT - 1.6)) / 0.5));
    } else if (isOutroView) {
      alpha = 0.85;
    } else if (distSteps <= 0.35) {
      alpha = 1;
    } else if (distSteps >= 0.78) {
      alpha = 0;
    } else {
      alpha = 1 - (distSteps - 0.35) / (0.78 - 0.35);
    }

    g.visible = alpha > 0.02;
    if (!g.visible) return;

    g.traverse((obj) => {
      if (obj instanceof Mesh) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (!m || !("opacity" in m)) continue;
          const mat = m as Material & { opacity: number; transparent: boolean };
          if (!baseOpacity.current.has(mat)) {
            baseOpacity.current.set(mat, mat.opacity);
          }
          const orig = baseOpacity.current.get(mat) ?? 1;
          if (alpha < 0.99) {
            mat.transparent = true;
            mat.opacity = orig * alpha;
          } else {
            mat.opacity = orig;
          }
        }
      }
    });
  });

  const center = STATION_CENTERS[index];
  return (
    <group ref={groupRef} position={index === STATION_COUNT - 1 ? [0, 0, 0] : center}>
      {children}
    </group>
  );
}
