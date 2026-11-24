import { RoundedBox, Text } from "@react-three/drei";
import { COLORS } from "../lib/constants";
import { FONTS } from "../lib/fonts";

interface Tooltip3DProps {
  title: string;
  subtitle?: string;
  position?: [number, number, number];
  accent?: string;
  visible?: boolean;
}

export function Tooltip3D({
  title,
  subtitle,
  position = [0, 1.4, 0.3],
  accent = COLORS.emerald,
  visible = true
}: Tooltip3DProps): JSX.Element | null {
  if (!visible) return null;
  const width = Math.max(2.1, Math.min(4.2, Math.max(title.length, (subtitle ?? "").length) * 0.11 + 0.5));
  const height = subtitle ? 0.72 : 0.48;

  return (
    <group position={position}>
      <RoundedBox args={[width, height, 0.08]} radius={0.12} smoothness={3}>
        <meshStandardMaterial
          color="#070e1b"
          emissive={accent}
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.2}
        />
      </RoundedBox>
      <Text
        font={FONTS.heading}
        fontSize={0.15}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, subtitle ? 0.12 : 0, 0.05]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          font={FONTS.body}
          fontSize={0.12}
          color={accent}
          anchorX="center"
          anchorY="middle"
          position={[0, -0.13, 0.05]}
        >
          {subtitle}
        </Text>
      )}
    </group>
  );
}
