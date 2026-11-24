import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

interface EffectsProps {
  enabled: boolean;
}

/** Bloom 0.6 @ threshold 0.9, vignette 0.35, faint film noise. Fully disabled on the low tier. */
export function Effects({ enabled }: EffectsProps): JSX.Element | null {
  if (!enabled) return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.9} luminanceSmoothing={0.2} />
      <Vignette offset={0.3} darkness={0.35} eskil={false} />
      <Noise opacity={0.025} blendFunction={BlendFunction.SOFT_LIGHT} premultiply />
    </EffectComposer>
  );
}
