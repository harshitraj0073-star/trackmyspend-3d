import { Text } from "@react-three/drei";
import { useState, type FormEvent } from "react";
import { GlassPanel } from "../components/GlassPanel";
import { GlassPill } from "../components/GlassPill";
import { LiquidJar } from "../components/LiquidJar";
import { WorldHtml } from "../components/WorldHtml";
import { COLORS, CURRENCY } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatMoney, toISODate, validatePositiveAmount } from "../lib/format";
import { useGoals, useOverview } from "../store/selectors";
import { useStore } from "../store/useStore";
import { forwardWheel } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

export default function Goals(): JSX.Element {
  const isCurrent = useStore((s) => s.selectedStation === 6);
  const goals = useGoals();
  const overview = useOverview();
  const adjustGoal = useStore((s) => s.adjustGoal);
  const addGoal = useStore((s) => s.addGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deltaRaw, setDeltaRaw] = useState("");
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeGoal = goals.find((g) => g.id === selectedId) ?? goals[0] ?? null;

  const onCreateGoal = (e: FormEvent): void => {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Enter a goal name.");
      return;
    }
    const targetCheck = validatePositiveAmount(newTarget);
    if (!targetCheck.ok) {
      setError(targetCheck.error);
      return;
    }
    setError(null);
    addGoal(newName.trim(), targetCheck.value, newDeadline || undefined);
    setNewName("");
    setNewTarget("");
    setNewDeadline("");
    setCreating(false);
    setToast("Goal jar created!");
  };

  const handleTransfer = (direction: 1 | -1): void => {
    if (!activeGoal) return;
    const check = validatePositiveAmount(deltaRaw);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    const res = adjustGoal(activeGoal.id, check.value * direction);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setDeltaRaw("");
    setToast(
      direction > 0
        ? `Transferred ${formatMoney(check.value)} into ${activeGoal.name}`
        : `Returned ${formatMoney(check.value)} to balance`
    );
  };

  const count = goals.length;
  const spacing = Math.min(2.1, 5.4 / Math.max(1, count));

  return (
    <StationGroup index={6}>
      <Text
        font={FONTS.heading}
        fontSize={0.38}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0]}
      >
        Savings Goals
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.16}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.15, 0]}
      >
        {count > 0
          ? `Available balance to transfer: ${formatMoney(overview.currentBalance)} · Click any jar to add or withdraw`
          : "Create savings jars — transfers move real money from your Current Balance"}
      </Text>

      {count === 0 && !creating ? (
        <group position={[0, -0.1, 0]}>
          <GlassPanel width={5.6} height={2.6} accent={COLORS.emerald}>
            <Text
              font={FONTS.headingMedium}
              fontSize={0.23}
              color={COLORS.white}
              anchorX="center"
              anchorY="middle"
              position={[0, 0.38, 0.1]}
            >
              No savings goals yet
            </Text>
            <Text
              font={FONTS.body}
              fontSize={0.16}
              color={COLORS.slate}
              anchorX="center"
              anchorY="middle"
              position={[0, -0.04, 0.1]}
            >
              Start a jar for a laptop, trip, or emergency buffer.
            </Text>
            <GlassPill
              label="+ Create goal"
              position={[0, -0.68, 0.14]}
              width={2.2}
              height={0.48}
              fontSize={0.155}
              active
              accent={COLORS.emerald}
              onClick={() => {
                setError(null);
                setCreating(true);
              }}
            />
          </GlassPanel>
        </group>
      ) : (
        <>
          <group position={[-1.55, -0.15, 0]}>
            {goals.map((g, idx) => {
              const x = (idx - (count - 1) * 0.5) * spacing;
              return (
                <LiquidJar
                  key={g.id}
                  name={g.name}
                  saved={g.saved}
                  target={g.target}
                  ratio={g.ratio}
                  done={g.done}
                  selected={activeGoal?.id === g.id}
                  position={[x, 0, 0]}
                  onClick={() => {
                    setSelectedId(g.id);
                    setCreating(false);
                    setConfirmDelete(false);
                    setError(null);
                  }}
                />
              );
            })}
          </group>

          {isCurrent && (
            <WorldHtml
              transform
              distanceFactor={4.4}
              position={[count === 0 ? 0 : 2.75, -0.05, 0.25]}
            >
              <div className="glass-mini-panel" onWheel={(e) => forwardWheel(e.deltaY)}>
                {!creating && activeGoal ? (
                  <>
                    <div className="mini-panel-head">
                      <strong>{activeGoal.name}</strong>
                      <button
                        type="button"
                        className="link-chip"
                        onClick={() => {
                          setCreating(true);
                          setError(null);
                          setConfirmDelete(false);
                        }}
                      >
                        + Create goal
                      </button>
                    </div>
                    <p className="mini-panel-sub">
                      Saved <b>{formatMoney(activeGoal.saved)}</b> of{" "}
                      <b>{formatMoney(activeGoal.target)}</b>
                      {activeGoal.deadline ? ` · Target ${activeGoal.deadline}` : ""}
                    </p>
                    <p className="mini-panel-sub">
                      Current Balance: <b>{formatMoney(overview.currentBalance)}</b>
                    </p>
                    <label className="field">
                      <span>Transfer amount ({CURRENCY.symbol})</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        value={deltaRaw}
                        onChange={(e) => setDeltaRaw(e.target.value)}
                      />
                    </label>
                    {error && (
                      <div className="form-error" role="alert">
                        {error}
                      </div>
                    )}
                    {toast && (
                      <div className="form-toast" role="status" aria-live="polite">
                        {toast}
                      </div>
                    )}
                    <div className="mini-panel-actions">
                      <button
                        type="button"
                        className="submit-3d-btn is-compact"
                        style={{ flex: 1 }}
                        onClick={() => handleTransfer(1)}
                      >
                        + Add money
                      </button>
                      <button
                        type="button"
                        className="ghost-3d-btn"
                        style={{ flex: 1 }}
                        onClick={() => handleTransfer(-1)}
                      >
                        − Withdraw
                      </button>
                    </div>
                    {confirmDelete ? (
                      <div className="mini-panel-actions">
                        <button
                          type="button"
                          className="danger-3d-btn"
                          style={{ flex: 1 }}
                          onClick={() => {
                            deleteGoal(activeGoal.id);
                            setConfirmDelete(false);
                            setSelectedId(null);
                            setToast("Goal deleted — saved amount returned to balance.");
                          }}
                        >
                          Confirm Delete (returns {formatMoney(activeGoal.saved)})
                        </button>
                        <button
                          type="button"
                          className="ghost-3d-btn"
                          onClick={() => setConfirmDelete(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="mini-panel-actions">
                        <button
                          type="button"
                          className="danger-3d-btn"
                          style={{ width: "100%" }}
                          onClick={() => setConfirmDelete(true)}
                        >
                          Delete goal
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <form onSubmit={onCreateGoal} className="world-form" noValidate>
                    <div className="mini-panel-head">
                      <strong>Create Savings Goal</strong>
                      <button
                        type="button"
                        className="icon-close-btn"
                        aria-label="Close goal creator"
                        onClick={() => {
                          setCreating(false);
                          setError(null);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <label className="field">
                      <span>Goal Name</span>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Laptop"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Target ({CURRENCY.symbol})</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        inputMode="decimal"
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Deadline (optional)</span>
                      <input
                        type="date"
                        min={toISODate(new Date())}
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                      />
                    </label>
                    {error && (
                      <div className="form-error" role="alert">
                        {error}
                      </div>
                    )}
                    <button type="submit" className="submit-3d-btn is-compact">
                      Create Goal Jar
                    </button>
                  </form>
                )}
              </div>
            </WorldHtml>
          )}
        </>
      )}
    </StationGroup>
  );
}
