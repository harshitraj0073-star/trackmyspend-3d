import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  ShaderMaterial,
  TorusGeometry
} from "three";
import { COLORS } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatMoney, formatPercent } from "../lib/format";

const JAR_RADIUS = 0.62;
const JAR_HEIGHT = 2.1;

const outerGlassGeo = new CylinderGeometry(JAR_RADIUS, JAR_RADIUS, JAR_HEIGHT, 32, 1, true);
const rimGeo = new TorusGeometry(JAR_RADIUS, 0.03, 12, 32);
const baseGeo = new CylinderGeometry(JAR_RADIUS * 1.04, JAR_RADIUS * 1.08, 0.12, 32);
const liquidGeo = new CylinderGeometry(JAR_RADIUS * 0.9, JAR_RADIUS * 0.9, 1, 32, 16);

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform float uFill;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float isTop = step(0.45, pos.y);
    float wave = sin(pos.x * 5.0 + uTime * 3.0) * 0.035 + cos(pos.z * 5.0 + uTime * 2.4) * 0.035;
    pos.y += isTop * wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vec3 col = mix(uColorA, uColorB, clamp(vUv.y + vWave * 3.0, 0.0, 1.0));
    float rim = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 0.4);
    gl_FragColor = vec4(col * (0.95 + 0.35 * rim), 0.92);
  }
`;

interface LiquidJarProps {
  name: string;
  saved: number;
  target: number;
  ratio: number;
  done: boolean;
  selected?: boolean;
  position?: [number, number, number];
  onClick?: () => void;
}

export function LiquidJar({
  name,
  saved,
  target,
  ratio,
  done,
  selected = false,
  position = [0, 0, 0],
  onClick
}: LiquidJarProps): JSX.Element {
  const groupRef = useRef<Group>(null);
  const liquidRef = useRef<Mesh>(null);
  const burstRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const shaderMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uFill: { value: ratio },
          uColorA: { value: new Color("#059669") },
          uColorB: { value: new Color(done ? COLORS.cyan : COLORS.emerald) }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        side: DoubleSide
      }),
    [done]
  );

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    shaderMat.uniforms.uTime.value = state.clock.elapsedTime;
    if (groupRef.current) {
      const s = hovered || selected ? 1.05 : 1;
      easing.damp3(groupRef.current.scale, [s, s, s], 0.15, dt);
    }
    if (liquidRef.current) {
      const clamped = Math.max(0.05, Math.min(1, ratio));
      const targetH = clamped * (JAR_HEIGHT - 0.18);
      easing.damp(liquidRef.current.scale, "y", targetH, 0.2, dt);
      liquidRef.current.position.y = -JAR_HEIGHT * 0.5 + 0.08 + liquidRef.current.scale.y * 0.5;
    }
    if (burstRef.current && done) {
      burstRef.current.rotation.y += dt * 1.4;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
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
      {/* Metallic base */}
      <mesh geometry={baseGeo} position={[0, -JAR_HEIGHT * 0.5 - 0.04, 0]}>
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* Top and bottom glowing rims */}
      <mesh geometry={rimGeo} position={[0, JAR_HEIGHT * 0.5, 0]} rotation-x={Math.PI / 2}>
        <meshStandardMaterial
          color={selected || hovered ? COLORS.cyan : COLORS.emerald}
          emissive={selected || hovered ? COLORS.cyan : COLORS.emerald}
          emissiveIntensity={selected || hovered ? 2 : 1.1}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={rimGeo} position={[0, -JAR_HEIGHT * 0.5, 0]} rotation-x={Math.PI / 2}>
        <meshStandardMaterial color={COLORS.emerald} emissive={COLORS.emerald} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>

      {/* Animated emerald liquid interior */}
      <mesh ref={liquidRef} geometry={liquidGeo} material={shaderMat} position={[0, -JAR_HEIGHT * 0.25, 0]} />

      {/* Frosted glass cylinder wall */}
      <mesh geometry={outerGlassGeo}>
        <meshPhysicalMaterial
          color="#d1fae5"
          transparent
          opacity={0.22}
          roughness={0.12}
          metalness={0.05}
          clearcoat={1}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Celebratory particle halo when goal reaches 100% */}
      {done && (
        <group ref={burstRef} position={[0, JAR_HEIGHT * 0.55, 0]}>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.78, Math.sin(a * 3) * 0.14, Math.sin(a) * 0.78]}>
                <octahedronGeometry args={[0.06, 0]} />
                <meshBasicMaterial color={i % 2 === 0 ? COLORS.emerald : COLORS.cyan} blending={AdditiveBlending} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Labels above & below jar */}
      <Text
        font={FONTS.heading}
        fontSize={0.2}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, JAR_HEIGHT * 0.5 + 0.36, 0]}
      >
        {name}
      </Text>
      <Text
        font={FONTS.heading}
        fontSize={0.22}
        color={done ? COLORS.cyan : COLORS.emerald}
        anchorX="center"
        anchorY="middle"
        position={[0, 0.1, JAR_RADIUS + 0.08]}
      >
        {formatPercent(ratio)}
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.14}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, -JAR_HEIGHT * 0.5 - 0.32, 0]}
      >
        {`${formatMoney(saved)} / ${formatMoney(target)}`}
      </Text>
    </group>
  );
}
