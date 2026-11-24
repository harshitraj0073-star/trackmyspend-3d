import { useStore } from "../store/useStore";
import { useIsMobile, useReducedMotion } from "../lib/device";

export interface Quality {
  /** Full effects tier: transmission glass, bloom, full particles. */
  high: boolean;
  transmission: boolean;
  bloom: boolean;
  particles: number;
  dpr: [number, number];
  reducedMotion: boolean;
  mobile: boolean;
}

export function useQuality(): Quality {
  const effects = useStore((s) => s.settings.effects);
  const perfLow = useStore((s) => s.perfLow);
  const mobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const high = effects === "high" && !perfLow;
  const baseParticles = mobile ? 50 : 150;
  return {
    high,
    transmission: high,
    bloom: high,
    particles: reducedMotion ? 0 : high ? baseParticles : Math.round(baseParticles / 3),
    dpr: perfLow ? [1, 1] : mobile ? [1, 1.25] : [1, 1.75],
    reducedMotion,
    mobile
  };
}
