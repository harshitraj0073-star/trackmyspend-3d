import { Text } from "@react-three/drei";
import { useRef, useState, type ChangeEvent } from "react";
import { GlassPanel } from "../components/GlassPanel";
import { WorldHtml } from "../components/WorldHtml";
import { COLORS } from "../lib/constants";
import { downloadExpensesCsv } from "../lib/csv";
import { FONTS } from "../lib/fonts";
import { useStore } from "../store/useStore";
import { flyTo, forwardWheel } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

export default function Outro(): JSX.Element {
  const isCurrent = useStore((s) => s.selectedStation === 9);
  const expenses = useStore((s) => s.expenses);
  const effects = useStore((s) => s.settings.effects);
  const setSettings = useStore((s) => s.setSettings);
  const exportBackupJson = useStore((s) => s.exportBackupJson);
  const importBackupJson = useStore((s) => s.importBackupJson);
  const resetAllData = useStore((s) => s.resetAllData);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetBox, setShowResetBox] = useState(false);
  const [resetText, setResetText] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleExportJson = (): void => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trackmyspend-backup.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMsg("Downloaded JSON backup.");
    setErrorMsg(null);
  };

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const res = importBackupJson(text);
      if (res.ok) {
        setStatusMsg("Backup imported successfully!");
        setErrorMsg(null);
      } else {
        setErrorMsg(res.error);
        setStatusMsg(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmReset = (): void => {
    if (resetText.trim() !== "RESET") {
      setErrorMsg('Type "RESET" in all caps to confirm.');
      return;
    }
    setResetText("");
    setShowResetBox(false);
    setErrorMsg(null);
    resetAllData();
    flyTo(1);
  };

  return (
    <StationGroup index={9}>
      <group position={[0, 61.5, 19.2]} rotation={[-0.58, 0, 0]}>
        <GlassPanel width={6.8} height={3.5} accent={COLORS.cyan}>
          <Text
            font={FONTS.heading}
            fontSize={0.34}
            color={COLORS.white}
            anchorX="center"
            anchorY="middle"
            position={[0, 1.32, 0.1]}
          >
            TrackMySpend 2.0 — Backup &amp; Controls
          </Text>
          <Text
            font={FONTS.body}
            fontSize={0.145}
            color={COLORS.slate}
            anchorX="center"
            anchorY="middle"
            position={[0, -1.42, 0.1]}
          >
            Data: local only · Nothing leaves your browser · Built by Harshit Raj
          </Text>
        </GlassPanel>

        {isCurrent && (
          <WorldHtml transform distanceFactor={4.6} position={[0, -0.02, 0.24]}>
            <div className="outro-controls-card" onWheel={(e) => forwardWheel(e.deltaY)}>
              <div className="outro-badge-row">
                <span className="local-only-badge">🔒 Data: local only</span>
                <button
                  type="button"
                  className="ghost-3d-btn"
                  onClick={() => setSettings({ effects: effects === "high" ? "low" : "high" })}
                >
                  Effects: {effects === "high" ? "High" : "Low"}
                </button>
              </div>

              <div className="outro-btn-grid">
                <button
                  type="button"
                  className="submit-3d-btn is-compact"
                  onClick={() => {
                    downloadExpensesCsv(expenses);
                    setStatusMsg("Downloaded CSV.");
                    setErrorMsg(null);
                  }}
                >
                  ⬇ Export CSV
                </button>
                <button type="button" className="ghost-3d-btn" onClick={handleExportJson}>
                  ⬇ Export JSON Backup
                </button>
                <button
                  type="button"
                  className="ghost-3d-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  ⬆ Import JSON Backup
                </button>
                <button
                  type="button"
                  className="danger-3d-btn"
                  onClick={() => {
                    setShowResetBox((v) => !v);
                    setErrorMsg(null);
                  }}
                >
                  ↺ Reset All Data
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={handleImportFile}
                aria-label="Import JSON backup file"
              />

              {showResetBox && (
                <div className="reset-confirm-box">
                  <p>
                    This permanently clears all local entries, budgets, goals, and subscriptions.
                    Type <strong>RESET</strong> to confirm:
                  </p>
                  <div className="mini-panel-row">
                    <input
                      type="text"
                      value={resetText}
                      onChange={(e) => setResetText(e.target.value)}
                      placeholder="Type RESET"
                      aria-label="Type RESET to confirm clearing all data"
                    />
                    <button
                      type="button"
                      className="danger-3d-btn"
                      onClick={handleConfirmReset}
                    >
                      Confirm Reset
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="form-error" role="alert">
                  {errorMsg}
                </div>
              )}
              {statusMsg && (
                <div className="form-toast" role="status" aria-live="polite">
                  {statusMsg}
                </div>
              )}

              <div className="outro-footer-row">
                <button type="button" className="ghost-3d-btn" onClick={() => flyTo(1)}>
                  Edit Your Money
                </button>
                <button type="button" className="ghost-3d-btn" onClick={() => flyTo(0)}>
                  ↑ Fly Back to Intro
                </button>
              </div>
            </div>
          </WorldHtml>
        )}
      </group>
    </StationGroup>
  );
}
