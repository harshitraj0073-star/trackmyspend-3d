import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { CylinderGeometry, Group, MeshStandardMaterial, TorusGeometry } from "three";
import { COLORS, CURRENCY } from "../lib/constants";
import { FONTS } from "../lib/fonts";

const coinBodyGeo = new CylinderGeometry(0.32, 0.32, 0.08, 32);
const coinRimGeo = new TorusGeometry(0.32, 0.025, 12, 32);
const chromeMat = new MeshStandardMaterial({
  color: "#1e293b",
  metalness: 0.94,
  roughness: 0.14
});
const emeraldRimMat = new MeshStandardMaterial({
  color: COLORS.emerald,
  emissive: COLORS.emerald,
  emissiveIntensity: 1.4,
  metalness: 0.8,
  roughness: 0.2,
  toneMapped: false
});

interface CoinProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  spinSpeed?: number;
}

export function Coin({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  spinSpeed = 0.6
}: CoinProps): JSX.Element {
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!ref.current || spinSpeed === 0) return;
    ref.current.rotation.y += delta * spinSpeed;
  });

  return (
    <group ref={ref} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={coinBodyGeo} material={chromeMat} rotation-x={Math.PI / 2} />
      <mesh geometry={coinRimGeo} material={emeraldRimMat} />
      <Text
        font={FONTS.heading}
        fontSize={0.24}
        color={COLORS.emerald}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.048]}
      >
        {CURRENCY.symbol}
      </Text>
    </group>
  );
}
