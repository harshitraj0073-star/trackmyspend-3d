import { CatmullRomCurve3, Vector3 } from "three";
import { STATION_COUNT } from "../lib/constants";

type V3 = [number, number, number];

/**
 * 10 stations spaced 24 units apart along -Z with wide alternating X offsets
 * so each station has its own clean 3D footprint with zero overlap.
 */
export const STATION_CENTERS: V3[] = [
  [0, 0, 0],        // 0: Intro
  [16, 0, -24],     // 1: Money
  [0, 0, -48],      // 2: Add
  [-16, 0, -72],    // 3: Overview
  [0, 0, -96],      // 4: Budgets
  [16, 0, -120],    // 5: Analytics
  [0, 0, -144],     // 6: Goals
  [-16, 0, -168],   // 7: History
  [0, 0, -192],     // 8: Insights
  [0, 0, -96]       // 9: Outro (aerial view over world)
];

const CAMERA_OFFSET: V3 = [0, 1.0, 9.2];
const TARGET_OFFSET: V3 = [0, 0.25, 0];

/** Outro: wide aerial pull-back over the whole 3D world. */
const OUTRO_CAMERA: V3 = [0, 68, 28];
const OUTRO_TARGET: V3 = [0, -4, -96];

const add = (a: V3, b: V3): Vector3 => new Vector3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);

export const CAMERA_POINTS: Vector3[] = STATION_CENTERS.map((c, i) =>
  i === STATION_COUNT - 1 ? new Vector3(...OUTRO_CAMERA) : add(c, CAMERA_OFFSET)
);

export const TARGET_POINTS: Vector3[] = STATION_CENTERS.map((c, i) =>
  i === STATION_COUNT - 1 ? new Vector3(...OUTRO_TARGET) : add(c, TARGET_OFFSET)
);

export const cameraCurve = new CatmullRomCurve3(CAMERA_POINTS, false, "centripetal", 0.5);
export const targetCurve = new CatmullRomCurve3(TARGET_POINTS, false, "centripetal", 0.5);

export function stationToOffset(i: number): number {
  return i / (STATION_COUNT - 1);
}

export function offsetToStation(offset: number): number {
  return Math.min(STATION_COUNT - 1, Math.max(0, Math.round(offset * (STATION_COUNT - 1))));
}

export function offsetToCurveT(offset: number): number {
  const segs = STATION_COUNT - 1;
  const p = Math.min(segs, Math.max(0, offset * segs));
  const i = Math.min(segs - 1, Math.floor(p));
  const f = p - i;
  const smooth = f * f * (3 - 2 * f);
  const eased = f * 0.35 + smooth * 0.65;
  return (i + eased) / segs;
}

export function samplePath(offset: number, outPos: Vector3, outTarget: Vector3): void {
  const t = offsetToCurveT(offset);
  cameraCurve.getPoint(t, outPos);
  targetCurve.getPoint(t, outTarget);
}
