import { MeshTransmissionMaterial, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Group, Vector3 } from "three";
import { COLORS } from "../lib/constants";
import { useStore } from "../store/useStore";
import { registerFocusPose } from "../world/navigation";
import { useQuality } from "../world/quality";

interface GlassPanelProps {
  width?: number;
  height?: number;
  depth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  accent?: string;
  focusKey?: string;
  focusDistance?: number;
  interactive?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

export function GlassPanel({
  width = 3.2,
  height = 2.1,
  depth = 0.14,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  accent = COLORS.emerald,
  focusKey,
  focusDistance = 4.6,
  interactive = false,
  onClick,
  children
}: GlassPanelProps): JSX.Element {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const { transmission } = useQuality();
  const focus = useStore((s) => s.focus);
  const setFocus = useStore((s) => s.setFocus);

  const isFocused = Boolean(focusKey && focus === focusKey);
  const isDimmed = Boolean(focus && (!focusKey || focus !== focusKey));

  useEffect(() => {
    if (!focusKey || !groupRef.current) return;
    const worldPos = new Vector3();
    groupRef.current.getWorldPosition(worldPos);
    const camPos = worldPos.clone().add(new Vector3(0, 0.2, focusDistance));
    return registerFocusPose(focusKey, { position: camPos, target: worldPos });
  }, [focusKey, focusDistance, position[0], position[1], position[2]]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetScale = hovered || isFocused ? 1.04 : 1;
    easing.damp3(groupRef.current.scale, [targetScale, targetScale, targetScale], 0.15, Math.min(delta, 0.1));
  });

  const handleClick = (e: { stopPropagation: () => void }): void => {
    if (!interactive && !focusKey && !onClick) return;
    e.stopPropagation();
    if (onClick) onClick();
    if (focusKey) setFocus(isFocused ? null : focusKey);
  };

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        if (interactive || focusKey || onClick) {
          e.stopPropagation();
          setHovered(true);
        }
      }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <RoundedBox args={[width, height, depth]} radius={0.14} smoothness={4}>
        {transmission ? (
          <MeshTransmissionMaterial
            backside={false}
            samples={4}
            resolution={256}
            thickness={0.5}
            roughness={0.25}
            chromaticAberration={0.03}
            anisotropicBlur={0.2}
            ior={1.45}
            color={isDimmed ? "#060a12" : "#0e1a2f"}
            transmission={isDimmed ? 0.45 : 0.88}
          />
        ) : (
          <meshPhysicalMaterial
            color="#0d1729"
            transparent
            opacity={isDimmed ? 0.2 : 0.42}
            roughness={0.22}
            metalness={0.15}
            clearcoat={0.8}
          />
        )}
      </RoundedBox>

      {/* Dark backing plate for high-contrast text legibility (4.5:1+) */}
      <mesh position={[0, 0, -depth * 0.15]}>
        <planeGeometry args={[width * 0.94, height * 0.92]} />
        <meshBasicMaterial color="#060b14" transparent opacity={isDimmed ? 0.28 : 0.62} />
      </mesh>

      {/* Subtle glowing accent bar along top edge */}
      <mesh position={[0, height * 0.5 - 0.04, depth * 0.52]}>
        <boxGeometry args={[width * 0.72, 0.025, 0.02]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={hovered || isFocused ? 2.2 : 1.1}
          toneMapped={false}
        />
      </mesh>

      {children}
    </group>
  );
}
