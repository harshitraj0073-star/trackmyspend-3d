import gsap from "gsap";
import { Vector3 } from "three";
import { FLY_DURATION, STATION_COUNT } from "../lib/constants";
import { prefersReducedMotion } from "../lib/device";
import { useStore } from "../store/useStore";
import { stationToOffset } from "./cameraPath";

let scrollEl: HTMLElement | null = null;
const tweenState = { top: 0 };

// Ensure camera flights always complete in real wall-clock duration even on slow GPUs
gsap.ticker.lagSmoothing(0);

function interrupt(): void {
  gsap.killTweensOf(tweenState);
}

export function registerScrollElement(el: HTMLElement | null): () => void {
  scrollEl = el;
  if (!el) return () => undefined;
  el.addEventListener("wheel", interrupt, { passive: true });
  el.addEventListener("touchstart", interrupt, { passive: true });
  return () => {
    el.removeEventListener("wheel", interrupt);
    el.removeEventListener("touchstart", interrupt);
    if (scrollEl === el) scrollEl = null;
  };
}

export function getScrollElement(): HTMLElement | null {
  return scrollEl;
}

function maxScroll(el: HTMLElement): number {
  return Math.max(0, el.scrollHeight - el.clientHeight);
}

/** Max station index allowed right now (locked to 1 = Money until setupComplete). */
export function maxAllowedStation(): number {
  const s = useStore.getState();
  return s.profile.setupComplete ? STATION_COUNT - 1 : 1;
}

/** Fly the camera to a station by tweening the real scroll position (respecting scroll lock). */
export function flyTo(station: number): void {
  const el = scrollEl;
  const allowed = maxAllowedStation();
  const i = Math.min(allowed, Math.max(0, station));
  useStore.getState().setFocus(null);
  if (!el) {
    useStore.getState().setSelectedStation(i);
    return;
  }
  const target = stationToOffset(i) * maxScroll(el);
  interrupt();
  if (prefersReducedMotion()) {
    el.scrollTop = target;
    return;
  }
  tweenState.top = el.scrollTop;
  gsap.to(tweenState, {
    top: target,
    duration: FLY_DURATION,
    ease: "power3.inOut",
    onUpdate: () => {
      el.scrollTop = tweenState.top;
    }
  });
}

export function flyBy(delta: number): void {
  flyTo(useStore.getState().selectedStation + delta);
}

export function forwardWheel(deltaY: number): void {
  const el = scrollEl;
  if (!el) return;
  interrupt();
  const max = maxScroll(el);
  const limit = stationToOffset(maxAllowedStation()) * max;
  const next = Math.min(limit, Math.max(0, el.scrollTop + deltaY));
  el.scrollTop = next;
}

/* ---------- Focus registry ---------- */

export interface FocusPose {
  position: Vector3;
  target: Vector3;
}

const focusPoses = new Map<string, FocusPose>();

export function registerFocusPose(key: string, pose: FocusPose): () => void {
  focusPoses.set(key, pose);
  return () => {
    if (focusPoses.get(key) === pose) focusPoses.delete(key);
  };
}

export function getFocusPose(key: string | null): FocusPose | undefined {
  return key ? focusPoses.get(key) : undefined;
}
