import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useState } from "react";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";
import { Dock } from "./components/Dock";
import { Loader } from "./components/Loader";
import { A11yMirror, SimpleView } from "./components/SimpleView";
import { htmlPortalRef } from "./components/WorldHtml";
import { COLORS, STATION_COUNT } from "./lib/constants";
import { detectWebGL } from "./lib/device";
import { useStore } from "./store/useStore";
import { flyBy, flyTo } from "./world/navigation";
import { useQuality } from "./world/quality";
import { Scene } from "./world/Scene";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function useStationKeys(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        useStore.getState().setFocus(null);
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        flyBy(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        flyBy(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        flyTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        flyTo(STATION_COUNT - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export default function App(): JSX.Element {
  const quality = useQuality();
  const simpleView = useStore((s) => s.settings.simpleView);
  const webglFailed = useStore((s) => s.webglFailed);
  const setWebglFailed = useStore((s) => s.setWebglFailed);
  const runAutoLogSubscriptions = useStore((s) => s.runAutoLogSubscriptions);
  const [firstFrame, setFirstFrame] = useState(false);
  const onReady = useCallback(() => setFirstFrame(true), []);
  useStationKeys();

  useEffect(() => {
    if (!detectWebGL()) {
      setWebglFailed(true);
    }
    runAutoLogSubscriptions();
  }, [setWebglFailed, runAutoLogSubscriptions]);

  const showSimple = simpleView || webglFailed;

  return (
    <>
      {showSimple ? (
        <SimpleView />
      ) : (
        <>
          <div className="stage">
            <Canvas
              dpr={quality.dpr}
              camera={{ fov: 45, near: 0.1, far: 400, position: [0, 1.0, 9.2] }}
              gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false }}
              onCreated={({ gl }) => {
                gl.toneMapping = ACESFilmicToneMapping;
                gl.outputColorSpace = SRGBColorSpace;
                gl.setClearColor(COLORS.bg);
              }}
              onPointerMissed={() => useStore.getState().setFocus(null)}
            >
              <Scene quality={quality} onReady={onReady} />
            </Canvas>
          </div>
          <div ref={htmlPortalRef} className="html-portal" />
          <A11yMirror />
          <Loader firstFrame={firstFrame} />
        </>
      )}
      <Dock />
    </>
  );
}
