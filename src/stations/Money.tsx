import { Text } from "@react-three/drei";
import { useEffect, useState, type FormEvent } from "react";
import { GlassPanel } from "../components/GlassPanel";
import { WorldHtml } from "../components/WorldHtml";
import { COLORS, CURRENCY } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import {
  endOfMonthISO,
  toISODate,
  validateNonNegativeAmount
} from "../lib/format";
import { useStore } from "../store/useStore";
import { flyTo, forwardWheel } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

export default function Money(): JSX.Element {
  const isCurrent = useStore((s) => s.selectedStation === 1);
  const profile = useStore((s) => s.profile);
  const saveProfile = useStore((s) => s.saveProfile);

  const todayIso = toISODate(new Date());
  const eomIso = endOfMonthISO(new Date());

  const [startingRaw, setStartingRaw] = useState(
    profile.setupComplete ? String(profile.startingBalance) : ""
  );
  const [incomeRaw, setIncomeRaw] = useState(
    profile.monthlyIncome > 0 ? String(profile.monthlyIncome) : ""
  );
  const [periodMode, setPeriodMode] = useState<"month" | "custom">(
    profile.periodEnd === eomIso ? "month" : "custom"
  );
  const [periodEnd, setPeriodEnd] = useState(profile.periodEnd || eomIso);
  const [limitRaw, setLimitRaw] = useState(
    profile.overallLimit ? String(profile.overallLimit) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile.setupComplete) {
      setStartingRaw(String(profile.startingBalance));
      setIncomeRaw(profile.monthlyIncome > 0 ? String(profile.monthlyIncome) : "");
      setPeriodEnd(profile.periodEnd);
      setLimitRaw(profile.overallLimit ? String(profile.overallLimit) : "");
    } else {
      setStartingRaw("");
      setIncomeRaw("");
      setPeriodEnd(endOfMonthISO(new Date()));
      setLimitRaw("");
    }
  }, [profile.setupComplete, profile.startingBalance, profile.monthlyIncome, profile.periodEnd, profile.overallLimit]);

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const startCheck = validateNonNegativeAmount(startingRaw, false);
    if (!startCheck.ok) {
      setError(startCheck.error);
      return;
    }
    const incCheck = validateNonNegativeAmount(incomeRaw, true);
    if (!incCheck.ok) {
      setError(`Monthly income: ${incCheck.error}`);
      return;
    }
    const limCheck = validateNonNegativeAmount(limitRaw, true);
    if (!limCheck.ok) {
      setError(`Spending limit: ${limCheck.error}`);
      return;
    }
    const chosenEnd = periodMode === "month" ? eomIso : periodEnd;
    if (!chosenEnd || chosenEnd < todayIso) {
      setError("End date must be today or in the future.");
      return;
    }

    setError(null);
    saveProfile({
      startingBalance: startCheck.value,
      monthlyIncome: incCheck.value,
      periodEnd: chosenEnd,
      overallLimit: limitRaw.trim() && limCheck.value > 0 ? limCheck.value : null
    });
    setSavedMsg("Saved! Unlocking all stations…");
    window.setTimeout(() => {
      setSavedMsg(null);
      flyTo(2);
    }, 350);
  };

  return (
    <StationGroup index={1}>
      <Text
        font={FONTS.heading}
        fontSize={0.38}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0]}
      >
        Your Money Setup
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.16}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.15, 0]}
      >
        {profile.setupComplete
          ? "Update your starting balance or target date anytime"
          : "Enter your real money to unlock the rest of the 3D world"}
      </Text>

      <GlassPanel width={5.0} height={3.65} position={[0, -0.26, 0]} accent={COLORS.emerald} />

      {isCurrent && (
        <WorldHtml transform distanceFactor={4.2} position={[0, -0.26, 0.22]}>
          <form
            className="glass-money-card"
            onSubmit={onSubmit}
            noValidate
            onWheel={(e) => forwardWheel(e.deltaY)}
          >
            <label className="money-hero-label" htmlFor="money-now-input">
              How much money do you have right now?
            </label>
            <div className="money-big-input-wrap">
              <span className="currency-prefix" aria-hidden="true">
                {CURRENCY.symbol}
              </span>
              <input
                id="money-now-input"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                value={startingRaw}
                onChange={(e) => setStartingRaw(e.target.value)}
                required
              />
            </div>

            <div className="field-row">
              <label className="field">
                <span>Monthly income / allowance (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={incomeRaw}
                  onChange={(e) => setIncomeRaw(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Overall spending limit (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Optional"
                  value={limitRaw}
                  onChange={(e) => setLimitRaw(e.target.value)}
                />
              </label>
            </div>

            <div className="field">
              <span>How long should this money last?</span>
              <div className="form-toggle-row">
                <button
                  type="button"
                  className={`pill-toggle${periodMode === "month" ? " is-active" : ""}`}
                  onClick={() => {
                    setPeriodMode("month");
                    setPeriodEnd(eomIso);
                  }}
                >
                  This month ({eomIso})
                </button>
                <button
                  type="button"
                  className={`pill-toggle${periodMode === "custom" ? " is-active is-cyan" : ""}`}
                  onClick={() => setPeriodMode("custom")}
                >
                  Until a date I choose
                </button>
              </div>
              {periodMode === "custom" && (
                <input
                  type="date"
                  min={todayIso}
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  aria-label="Choose end date"
                  required
                />
              )}
            </div>

            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {savedMsg && (
              <div className="form-toast" role="status" aria-live="polite">
                {savedMsg}
              </div>
            )}

            <button type="submit" className="submit-3d-btn">
              {profile.setupComplete ? "Save & Continue →" : "Continue →"}
            </button>
          </form>
        </WorldHtml>
      )}
    </StationGroup>
  );
}
