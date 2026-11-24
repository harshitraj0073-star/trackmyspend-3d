import { PerformanceMonitor, Preload, ScrollControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, lazy, useRef } from "react";
import { COLORS, STATION_COUNT } from "../lib/constants";
import Intro from "../stations/Intro";
import Money from "../stations/Money";
import { useStore } from "../store/useStore";
import { Floor, StationBeacons } from "./Beacons";
import { CameraRig, FOG_FAR, FOG_NEAR } from "./CameraRig";
import { Effects } from "./Effects";
import { Lights } from "./Lights";
import { Particles } from "./Particles";
import type { Quality } from "./quality";

const AddExpense = lazy(() => import("../stations/AddExpense"));
const Overview = lazy(() => import("../stations/Overview"));
const BudgetRings = lazy(() => import("../stations/BudgetRings"));
const Analytics = lazy(() => import("../stations/Analytics"));
const Goals = lazy(() => import("../stations/Goals"));
const Transactions = lazy(() => import("../stations/Transactions"));
const Insights = lazy(() => import("../stations/Insights"));
const Outro = lazy(() => import("../stations/Outro"));

interface SceneProps {
  quality: Quality;
  onReady: () => void;
}

function FirstFrame({ onReady }: { onReady: () => void }): null {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      onReady();
    }
  });
  return null;
}

/**
 * Only mounts the active station and its immediate neighbors (distance <= 1),
 * combined with StationGroup distance fading so ghost overlap never happens.
 * At Station 9 (Outro aerial view), mounts all stations for the full world overview.
 */
function ActiveStations(): JSX.Element {
  const current = useStore((s) => s.selectedStation);
  const setupComplete = useStore((s) => s.profile.setupComplete);
  const isOutro = current === STATION_COUNT - 1;
  const near = (idx: number): boolean => {
    if (!setupComplete && idx > 1) return false;
    return isOutro || Math.abs(current - idx) <= 1;
  };

  return (
    <>
      {near(0) && <Intro />}
      {near(1) && <Money />}
      <Suspense fallback={null}>
        {near(2) && <AddExpense />}
        {near(3) && <Overview />}
        {near(4) && <BudgetRings />}
        {near(5) && <Analytics />}
        {near(6) && <Goals />}
        {near(7) && <Transactions />}
        {near(8) && <Insights />}
        {near(9) && <Outro />}
      </Suspense>
    </>
  );
}

export function Scene({ quality, onReady }: SceneProps): JSX.Element {
  const setPerfLow = useStore((s) => s.setPerfLow);

  return (
    <>
      <color attach="background" args={[COLORS.bg]} />
      <fog attach="fog" args={[COLORS.bg, FOG_NEAR, FOG_FAR]} />
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setPerfLow(true)}
        onIncline={() => setPerfLow(false)}
        onFallback={() => setPerfLow(true)}
      />
      <Lights />
      <ScrollControls pages={STATION_COUNT} damping={0.25} distance={1}>
        <CameraRig reducedMotion={quality.reducedMotion} />
        <Floor />
        <StationBeacons />
        <ActiveStations />
      </ScrollControls>
      <Particles key={quality.particles} count={quality.particles} />
      <Effects enabled={quality.bloom} />
      <FirstFrame onReady={onReady} />
      <Preload all />
    </>
  );
}
