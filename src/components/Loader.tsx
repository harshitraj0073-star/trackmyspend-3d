import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

interface LoaderProps {
  firstFrame: boolean;
}

const MIN_VISIBLE_MS = 700;

/** 3D-styled glass progress bar driven by drei's asset loading progress plus the first rendered frame. */
export function Loader({ firstFrame }: LoaderProps): JSX.Element | null {
  const { active, progress } = useProgress();
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => window.clearTimeout(t);
  }, []);

  const done = firstFrame && minElapsed && !active;
  const shown = done ? 100 : Math.min(99, Math.max(firstFrame ? 90 : 8, Math.round(progress * 0.9)));

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setGone(true), 650);
    return () => window.clearTimeout(t);
  }, [done]);

  if (gone) return null;

  return (
    <div className={`loader${done ? " is-done" : ""}`} role="status" aria-live="polite" aria-busy={!done}>
      <div className="loader__card">
        <div className="loader__brand">
          TrackMySpend <span>2.0</span>
        </div>
        <div className="loader__track" aria-hidden="true">
          <div className="loader__fill" style={{ transform: `scaleX(${shown / 100})` }} />
          <div className="loader__shine" />
        </div>
        <div className="loader__text">{done ? "Entering your money world…" : `Building the 3D world… ${shown}%`}</div>
      </div>
    </div>
  );
}
