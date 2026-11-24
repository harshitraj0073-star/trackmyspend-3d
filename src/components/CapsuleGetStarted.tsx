import { useEffect, useState } from "react";
import { useStore } from "../store/useStore";
import { forwardWheel } from "../world/navigation";
import { WorldHtml } from "./WorldHtml";

interface CapsuleGetStartedProps {
  onClick: () => void;
  position?: [number, number, number];
}

const GET_STARTED_CHARS = ["G", "e", "t", "s", "t", "a", "r", "t", "e", "d"];

export function CapsuleGetStarted({
  onClick,
  position = [0, -1.92, 0.85]
}: CapsuleGetStartedProps): JSX.Element | null {
  const selectedStation = useStore((s) => s.selectedStation);
  const [checked, setChecked] = useState(true);
  const [isHover, setIsHover] = useState(false);

  useEffect(() => {
    if (selectedStation !== 0) return;
    let t1: number | undefined;
    let t2: number | undefined;

    const runIdle = (): void => {
      setIsHover(false);
      setChecked(true);
      t1 = window.setTimeout(runGlow, 1500);
    };
    const runGlow = (): void => {
      setIsHover(true);
      t2 = window.setTimeout(runIdle, 2800);
    };

    t1 = window.setTimeout(runGlow, 1200);
    return () => {
      if (t1) window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
  }, [selectedStation]);

  if (selectedStation !== 0) return null;

  return (
    <WorldHtml transform distanceFactor={4.6} position={position}>
      <div className="capsule-cta-root" onWheel={(e) => forwardWheel(e.deltaY)}>
        <label
          className={`capsule-area-wrapper${isHover ? " is-hover" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onClick();
          }}
        >
          <div className="capsule-wrapper">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => setChecked((c) => !c)}
              aria-label="Get started"
            />
            <button className="capsule-button" type="button" tabIndex={-1} aria-hidden="true">
              <div className="part-1">
                <div className="case">
                  <div className="mask" />
                  <div className="line" />
                </div>
                <div className="screw">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 115 126"
                    height="126"
                    width="115"
                    aria-hidden="true"
                  >
                    <g style={{ "--i": 1 } as React.CSSProperties} className="g-1">
                      <path
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                        stroke="#262626"
                        fill="url(#paint_linear_steel)"
                        d="M91.4371 119V7C91.4371 3.686 94.1231 1 97.4371 1H107.617C110.931 1 113.617 3.686 113.617 7V119C113.617 122.314 110.931 125 107.617 125H97.4371C94.1231 125 91.4371 122.314 91.4371 119Z"
                      />
                    </g>
                    <g style={{ "--i": 2 } as React.CSSProperties} className="g-2">
                      <path
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                        stroke="#262626"
                        fill="url(#paint_linear_steel)"
                        d="M69.256 119V7C69.256 3.686 71.942 1 75.256 1H85.436C88.75 1 91.436 3.686 91.436 7V119C91.436 122.314 88.75 125 85.436 125H75.256C71.943 125 69.256 122.314 69.256 119Z"
                      />
                    </g>
                    <g style={{ "--i": 3 } as React.CSSProperties} className="g-3">
                      <path
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeMiterlimit="10"
                        strokeWidth="2"
                        stroke="#262626"
                        fill="url(#paint_linear_steel)"
                        d="M47.076 119V7C47.076 3.686 49.762 1 53.076 1H63.256C66.57 1 69.256 3.686 69.256 7V119C69.256 122.314 66.57 125 63.256 125H53.076C49.762 125 47.076 122.314 47.076 119Z"
                      />
                    </g>
                    <defs>
                      <linearGradient
                        gradientUnits="userSpaceOnUse"
                        y2="125"
                        x2="105.425"
                        y1="1"
                        x1="105.425"
                        id="paint_linear_steel"
                      >
                        <stop stopColor="#7A7A7A" offset="0.1" />
                        <stop stopColor="#EEEEEE" offset="0.32" />
                        <stop stopColor="#787878" offset="0.6" />
                        <stop stopColor="#9E9E9E" offset="1" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div className="part-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 190 76"
                  height="76"
                  width="190"
                  className="path-glass"
                  aria-hidden="true"
                >
                  <path
                    stroke="currentColor"
                    d="M0 0.5C0 0.5 149 0.5 156.5 0.5C164 0.5 189 8.5 189 37.5C189 66.5 164 75.5 157.5 75.5C151 75.5 1 75.5 1 75.5"
                  />
                </svg>

                <div className="glass">
                  <div className="glass-reflex" />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 49 52"
                    height="52"
                    width="49"
                    className="filament filament-on"
                    aria-hidden="true"
                  >
                    <path
                      stroke="#6ee7b7"
                      d="M32.5 26.1085C32.5 26.1085 32 5.90019 38.5 2.10852C45 -1.68315 49 5.10852 47.5 9.60852C46 14.1085 39.5 17.1085 21 18.1085C13.667 18.5049 6.49118 18.0371 0.5 17.328"
                    />
                    <path
                      stroke="#6ee7b7"
                      d="M32.5 26C32.5 26 32 46.2083 38.5 50C45 53.7917 49 47 47.5 42.5C46 38 39.5 35 21 34C13.667 33.6036 6.49118 34.0714 0.5 34.7805"
                    />
                  </svg>

                  <span className="content">
                    <span className="text state-1">
                      {GET_STARTED_CHARS.map((ch, idx) => (
                        <span
                          key={idx}
                          data-label={ch}
                          style={{ "--i": idx + 1 } as React.CSSProperties}
                        >
                          {ch}
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              </div>
            </button>
          </div>
        </label>
      </div>
    </WorldHtml>
  );
}
