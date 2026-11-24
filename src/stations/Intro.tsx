import { Float, Line, MeshTransmissionMaterial, RoundedBox, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useMemo, useRef } from "react";
import { Color, Group, Mesh, ShaderMaterial, Vector3 } from "three";
import { CapsuleGetStarted } from "../components/CapsuleGetStarted";
import { Coin } from "../components/Coin";
import { COLORS } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatMoney } from "../lib/format";
import { useOverview } from "../store/selectors";
import { useStore } from "../store/useStore";
import { flyTo } from "../world/navigation";
import { useQuality } from "../world/quality";
import { StationGroup } from "../world/StationGroup";

const COIN_POSITIONS: Array<[number, number, number]> = [
  [-2.6, 0.75, 0.6],
  [2.65, 0.55, 0.5],
  [-2.2, -1.05, 0.85],
  [2.25, -1.0, 0.7],
  [1.9, 1.35, -0.3]
];

const SCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SCREEN_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uBot;
  varying vec2 vUv;
  void main() {
    vec3 c1 = mix(uBot, uMid, smoothstep(0.0, 0.65, vUv.y));
    vec3 col = mix(c1, uTop, smoothstep(0.55, 1.0, vUv.y));
    float glow = exp(-length(vUv - vec2(0.5, 0.62)) * 2.8) * 0.25;
    gl_FragColor = vec4(col + vec3(0.04, 0.28, 0.26) * glow, 1.0);
  }
`;

export default function Intro(): JSX.Element {
  const parallaxRef = useRef<Group>(null);
  const ring1Ref = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);
  const ring3Ref = useRef<Mesh>(null);
  const { transmission, reducedMotion } = useQuality();
  const setupComplete = useStore((s) => s.profile.setupComplete);
  const overview = useOverview();

  const screenMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTop: { value: new Color("#0b2c3d") },
          uMid: { value: new Color("#09242e") },
          uBot: { value: new Color("#06111e") }
        },
        vertexShader: SCREEN_VERT,
        fragmentShader: SCREEN_FRAG
      }),
    []
  );

  const faintCurve = useMemo(
    () => [
      new Vector3(-0.52, -0.35, 0.095),
      new Vector3(-0.26, -0.18, 0.095),
      new Vector3(0.0, -0.24, 0.095),
      new Vector3(0.28, 0.08, 0.095),
      new Vector3(0.52, 0.28, 0.095)
    ],
    []
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!reducedMotion) {
      if (ring1Ref.current) ring1Ref.current.rotation.z += dt * 0.22;
      if (ring2Ref.current) {
        ring2Ref.current.rotation.x += dt * 0.16;
        ring2Ref.current.rotation.y += dt * 0.2;
      }
      if (ring3Ref.current) ring3Ref.current.rotation.y -= dt * 0.14;
      if (parallaxRef.current) {
        easing.dampE(
          parallaxRef.current.rotation,
          [-state.pointer.y * 0.1, state.pointer.x * 0.15, 0],
          0.25,
          dt
        );
      }
    }
  });

  return (
    <StationGroup index={0}>
      {/* Clean title safe zone ABOVE all 3D objects & rings */}
      <Text
        font={FONTS.heading}
        fontSize={0.5}
        letterSpacing={-0.02}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0.7]}
        renderOrder={10}
      >
        TrackMySpend
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.19}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.08, 0.7]}
        renderOrder={10}
      >
        Your real student money, in 3D
      </Text>

      {/* 3D hero cluster positioned cleanly below title safe zone */}
      <group ref={parallaxRef} position={[0, -0.12, 0]}>
        <Float speed={reducedMotion ? 0 : 1.4} rotationIntensity={0.15} floatIntensity={0.22}>
          <group rotation={[0.04, -0.14, 0]}>
            <RoundedBox args={[1.45, 2.65, 0.15]} radius={0.2} smoothness={4}>
              {transmission ? (
                <MeshTransmissionMaterial
                  samples={4}
                  resolution={256}
                  thickness={0.5}
                  roughness={0.24}
                  chromaticAberration={0.03}
                  anisotropicBlur={0.2}
                  color="#0f2036"
                />
              ) : (
                <meshPhysicalMaterial color="#0f2036" transparent opacity={0.45} roughness={0.2} metalness={0.2} />
              )}
            </RoundedBox>

            {/* Soft emerald-cyan gradient phone screen */}
            <mesh position={[0, 0, 0.082]} material={screenMat}>
              <planeGeometry args={[1.28, 2.42]} />
            </mesh>

            {/* Faint minimalist line chart on screen */}
            <Line points={faintCurve} color={COLORS.cyan} lineWidth={1.6} transparent opacity={0.65} />

            {/* Real user balance shown ONLY once the user has completed Money setup */}
            {setupComplete ? (
              <>
                <Text
                  font={FONTS.body}
                  fontSize={0.11}
                  color={COLORS.slate}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, 0.72, 0.095]}
                >
                  CURRENT BALANCE
                </Text>
                <Text
                  font={FONTS.heading}
                  fontSize={0.23}
                  color={COLORS.emerald}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, 0.44, 0.095]}
                >
                  {formatMoney(overview.currentBalance)}
                </Text>
              </>
            ) : (
              <Text
                font={FONTS.body}
                fontSize={0.11}
                color={COLORS.slate}
                anchorX="center"
                anchorY="middle"
                position={[0, 0.62, 0.095]}
              >
                REAL DATA ONLY
              </Text>
            )}
          </group>
        </Float>

        {/* 3 Concentric glass rings — lowered & translucent so they never obscure title */}
        <mesh ref={ring1Ref} position={[0, 0, -0.45]} rotation={[0.45, 0.2, 0]} renderOrder={1}>
          <torusGeometry args={[1.55, 0.026, 14, 96]} />
          <meshStandardMaterial
            color={COLORS.emerald}
            emissive={COLORS.emerald}
            emissiveIntensity={0.95}
            transparent
            opacity={0.38}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={ring2Ref} position={[0, 0, -0.5]} rotation={[1.05, -0.3, 0.2]} renderOrder={1}>
          <torusGeometry args={[1.88, 0.022, 14, 96]} />
          <meshStandardMaterial
            color={COLORS.cyan}
            emissive={COLORS.cyan}
            emissiveIntensity={0.85}
            transparent
            opacity={0.32}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={ring3Ref} position={[0, 0, -0.55]} rotation={[0.3, 0.75, -0.35]} renderOrder={1}>
          <torusGeometry args={[2.18, 0.018, 14, 96]} />
          <meshStandardMaterial
            color={COLORS.emerald}
            emissive={COLORS.emerald}
            emissiveIntensity={0.7}
            transparent
            opacity={0.26}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Fanned translucent glass cards */}
        {[-0.2, 0, 0.2].map((angle, i) => (
          <Float key={i} speed={reducedMotion ? 0 : 1.3 + i * 0.2} floatIntensity={0.18}>
            <group
              position={[-2.0 + i * 0.16, -0.1 + i * 0.12, 0.25 - i * 0.1]}
              rotation={[0.06, 0.36, angle]}
            >
              <RoundedBox args={[1.15, 0.72, 0.045]} radius={0.07} smoothness={3}>
                <meshPhysicalMaterial
                  color="#0f2338"
                  transparent
                  opacity={0.48}
                  roughness={0.2}
                  metalness={0.25}
                  clearcoat={1}
                />
              </RoundedBox>
            </group>
          </Float>
        ))}

        {/* 5 Chrome Coins */}
        {COIN_POSITIONS.map((pos, idx) => (
          <Coin
            key={idx}
            position={pos}
            rotation={[0.2 * idx, 0.5 * idx, 0]}
            scale={0.76}
            spinSpeed={reducedMotion ? 0 : 0.45 + idx * 0.12}
          />
        ))}
      </group>

      {/* Capsule Glass "Get started" CTA Button -> flies to Step 2 (Money) */}
      <CapsuleGetStarted onClick={() => flyTo(1)} position={[0, -1.94, 0.85]} />
    </StationGroup>
  );
}
