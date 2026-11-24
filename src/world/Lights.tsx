import { Environment, Lightformer } from "@react-three/drei";
import { COLORS } from "../lib/constants";

/** Emerald rim (left), cyan rim (right), soft white top key, plus a procedural Lightformer environment (no HDR download). */
export function Lights(): JSX.Element {
  return (
    <>
      <ambientLight intensity={0.18} color="#cbd5e1" />
      <directionalLight position={[0, 12, 3]} intensity={0.9} color={COLORS.white} />
      <directionalLight position={[-12, 3, -2]} intensity={2.2} color={COLORS.emerald} />
      <directionalLight position={[12, 3, -2]} intensity={2.2} color={COLORS.cyan} />
      <Environment resolution={256} frames={1} background={false}>
        <color attach="background" args={[COLORS.bg]} />
        <Lightformer form="ring" intensity={2} color={COLORS.white} position={[0, 6, -2]} scale={4} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={3} color={COLORS.emerald} position={[-6, 1, 0]} scale={[2, 8, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={3} color={COLORS.cyan} position={[6, 1, 0]} scale={[2, 8, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.6} color={COLORS.white} position={[0, 2, 6]} scale={[10, 2, 1]} />
      </Environment>
    </>
  );
}
