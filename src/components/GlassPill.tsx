import { RoundedBox, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useRef, useState } from "react";
import { Group } from "three";
import { COLORS } from "../lib/constants";
import { FONTS } from "../lib/fonts";

interface GlassPillProps {
  label: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  height?: number;
  active?: boolean;
  accent?: string;
  fontSize?: number;
  onClick?: () => void;
}

export function GlassPill({
  label,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.9,
  height = 0.52,
  active = false,
  accent = COLORS.emerald,
  fontSize = 0.17,
  onClick
}: GlassPillProps): JSX.Element {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const s = hovered ? 1.06 : active ? 1.03 : 1;
    easing.damp3(ref.current.scale, [s, s, s], 0.14, Math.min(delta, 0.1));
  });

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <RoundedBox args={[width, height, 0.08]} radius={height * 0.48} smoothness={6}>
        <meshPhysicalMaterial
          color={active ? "#0d2622" : "#0b1424"}
          emissive={active || hovered ? accent : "#050a14"}
          emissiveIntensity={active ? 0.45 : hovered ? 0.3 : 0.05}
          transparent
          opacity={0.86}
          roughness={0.18}
          metalness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.15}
        />
      </RoundedBox>
      <mesh position={[0, height * 0.5 - 0.015, 0.042]}>
        <boxGeometry args={[width * 0.65, 0.014, 0.01]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={active || hovered ? 1.6 : 0.75}
          toneMapped={false}
        />
      </mesh>
      <Text
        font={FONTS.headingMedium}
        fontSize={fontSize}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.052]}
      >
        {label}
      </Text>
    </group>
  );
}
