import { useMemo, useState } from "react";
import { STATIONS } from "../lib/constants";
import { useStore } from "../store/useStore";
import { flyTo } from "../world/navigation";
import { GlassTabs, type GlassTabItem } from "./GlassTabs";

/** Floating glass navigation dock powered by GlassTabs (Framer Motion spring pill + keyboard a11y). */
export function Dock(): JSX.Element {
  const current = useStore((s) => s.selectedStation);
  const setupComplete = useStore((s) => s.profile.setupComplete);
  const simpleView = useStore((s) => s.settings.simpleView);
  const setSettings = useStore((s) => s.setSettings);
  const [lockNotice, setLockNotice] = useState(false);

  const tabs: GlassTabItem[] = useMemo(() => {
    const stationTabs: GlassTabItem[] = STATIONS.map((s, i) => {
      const locked = !setupComplete && i > 1;
      return {
        id: s.id,
        label: s.label,
        disabled: locked,
        ariaLabel: locked
          ? `${s.label} (locked — enter your money first)`
          : `Go to station ${i}: ${s.label}`,
        icon: locked ? (
          <span className="text-[11px] leading-none" aria-hidden="true">
            🔒
          </span>
        ) : undefined
      };
    });

    stationTabs.push({
      id: "simple-view",
      label: simpleView ? "3D View" : "Simple View",
      ariaLabel: "Toggle Simple view"
    });

    return stationTabs;
  }, [setupComplete, simpleView]);

  const activeTabId = simpleView ? "simple-view" : STATIONS[current]?.id ?? "intro";

  const handleTabChange = (id: string): void => {
    if (id === "simple-view") {
      setSettings({ simpleView: !simpleView });
      return;
    }

    const index = STATIONS.findIndex((s) => s.id === id);
    if (index === -1) return;

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
      <GlassTabs
        tabs={tabs}
        activeTab={activeTabId}
        onChange={handleTabChange}
        ariaLabel="Stations"
      />
    </div>
  );
}
