import { useState } from "react";
import { STATIONS } from "../lib/constants";
import { useStore } from "../store/useStore";
import { flyTo } from "../world/navigation";

/** Floating glass navigation dock: 10 stations with lock indicator until Money setup is saved + Simple View toggle. */
export function Dock(): JSX.Element {
  const current = useStore((s) => s.selectedStation);
  const setupComplete = useStore((s) => s.profile.setupComplete);
  const simpleView = useStore((s) => s.settings.simpleView);
  const setSettings = useStore((s) => s.setSettings);
  const [lockNotice, setLockNotice] = useState(false);

  const handleStationClick = (index: number): void => {
    if (!setupComplete && index > 1) {
      setLockNotice(true);
      if (simpleView) setSettings({ simpleView: false });
      flyTo(1);
      window.setTimeout(() => setLockNotice(false), 2600);
      return;
    }
    if (simpleView) setSettings({ simpleView: false });
    flyTo(index);
  };

  return (
    <div className="dock-container">
      {!setupComplete && (current === 1 || lockNotice) && !simpleView && (
        <div className="dock-lock-hint" role="status" aria-live="polite">
          🔒 Enter your money to continue
        </div>
      )}
      <nav className="dock" aria-label="Stations">
        <ol className="dock__list">
          {STATIONS.map((s, i) => {
            const active = !simpleView && i === current;
            const locked = !setupComplete && i > 1;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`dock__btn${active ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                  aria-current={active ? "step" : undefined}
                  aria-disabled={locked || undefined}
                  aria-label={
                    locked
                      ? `${s.label} (locked — enter your money first)`
                      : `Go to station ${i}: ${s.label}`
                  }
                  onClick={() => handleStationClick(i)}
                >
                  {locked ? (
                    <span className="dock__lock" aria-hidden="true">
                      🔒
                    </span>
                  ) : (
                    <span className="dock__dot" aria-hidden="true" />
                  )}
                  <span className="dock__label">{s.label}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={`dock__btn dock__simple${simpleView ? " is-active" : ""}`}
              aria-pressed={simpleView}
              aria-label="Toggle Simple view"
              onClick={() => setSettings({ simpleView: !simpleView })}
            >
              <span className="dock__label">{simpleView ? "3D View" : "Simple View"}</span>
            </button>
          </li>
        </ol>
      </nav>
    </div>
  );
}
