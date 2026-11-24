import { Text } from "@react-three/drei";
import { useState, type FormEvent } from "react";
import { GlassPanel } from "../components/GlassPanel";
import { WorldHtml } from "../components/WorldHtml";
import { CATEGORIES, COLORS, CURRENCY, type Category } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatMoney, formatShortDate, validatePositiveAmount } from "../lib/format";
import { useInsights } from "../store/selectors";
import { useStore } from "../store/useStore";
import { forwardWheel } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

export default function Insights(): JSX.Element {
  const isCurrent = useStore((s) => s.selectedStation === 8);
  const insights = useInsights();
  const addSubscription = useStore((s) => s.addSubscription);
  const toggleSubAutoLog = useStore((s) => s.toggleSubscriptionAutoLog);
  const deleteSubscription = useStore((s) => s.deleteSubscription);

  const [addingSub, setAddingSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subDay, setSubDay] = useState("1");
  const [subCat, setSubCat] = useState<Category>("Entertainment");
  const [subAutoLog, setSubAutoLog] = useState(true);
  const [subError, setSubError] = useState<string | null>(null);

  const onAddSub = (e: FormEvent): void => {
    e.preventDefault();
    if (!subName.trim()) {
      setSubError("Enter a subscription name.");
      return;
    }
    const amtCheck = validatePositiveAmount(subAmount);
    if (!amtCheck.ok) {
      setSubError(amtCheck.error);
      return;
    }
    const dayNum = Math.round(Number(subDay));
    if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 31) {
      setSubError("Day of month must be between 1 and 31.");
      return;
    }
    setSubError(null);
    addSubscription({
      name: subName.trim(),
      amount: amtCheck.value,
      dayOfMonth: dayNum,
      category: subCat,
      autoLog: subAutoLog
    });
    setSubName("");
    setSubAmount("");
    setSubDay("1");
    setAddingSub(false);
  };

  const runwayLabel = insights.outOfMoney
    ? "Out of money"
    : insights.runwayDays !== null
      ? `${Math.floor(insights.runwayDays)} days`
      : "Need 3+ days of data";

  const stats = [
    {
      label: "BIGGEST CATEGORY",
      value: insights.biggestCategory
        ? `${insights.biggestCategory.category} (${formatMoney(insights.biggestCategory.amount)})`
        : "No expenses yet",
      color: COLORS.emerald
    },
    {
      label: "WEEK-OVER-WEEK",
      value:
        insights.hasWeekOverWeek && insights.weekOverWeekPct !== null
          ? `${insights.weekOverWeekPct >= 0 ? "+" : ""}${insights.weekOverWeekPct}%`
          : "Need 14 days of data",
      color:
        insights.weekOverWeekPct !== null && insights.weekOverWeekPct > 15
          ? COLORS.amber
          : COLORS.cyan
    },
    {
      label: "AVG DAILY SPEND",
      value:
        insights.avgDailySpend !== null
          ? formatMoney(insights.avgDailySpend)
          : "Need 3+ days of data",
      color: COLORS.white
    },
    {
      label: "PROJECTED END BALANCE",
      value:
        insights.projectedBalanceAtEnd !== null
          ? formatMoney(insights.projectedBalanceAtEnd)
          : "Need 3+ days of data",
      color:
        insights.projectedBalanceAtEnd !== null && insights.projectedBalanceAtEnd < 0
          ? COLORS.rose
          : COLORS.cyan
    },
    {
      label: "BUDGET RUNWAY",
      value: runwayLabel,
      color: insights.outOfMoney ? COLORS.rose : COLORS.emerald
    }
  ];

  return (
    <StationGroup index={8}>
      <Text
        font={FONTS.heading}
        fontSize={0.38}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0]}
      >
        Insights &amp; Subscriptions
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.16}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.15, 0]}
      >
        Rule-based insights from your real data · Saving tips only target flexible categories
      </Text>

      {/* Left: Readable Insights Glass Panel */}
      <GlassPanel width={4.8} height={3.5} position={[-1.95, -0.05, 0]} accent={COLORS.emerald}>
        {stats.map((st, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const x = col === 0 ? -1.12 : 1.12;
          const y = 1.15 - row * 0.82;
          return (
            <group key={st.label} position={[x, y, 0.1]}>
              <Text
                font={FONTS.headingMedium}
                fontSize={0.135}
                letterSpacing={0.06}
                color={COLORS.slate}
                anchorX="center"
                anchorY="middle"
                position={[0, 0.2, 0]}
              >
                {st.label}
              </Text>
              <Text
                font={FONTS.heading}
                fontSize={0.2}
                color={st.color}
                maxWidth={2.05}
                textAlign="center"
                anchorX="center"
                anchorY="middle"
                position={[0, -0.1, 0]}
              >
                {st.value}
              </Text>
            </group>
          );
        })}

        <Text
          font={FONTS.body}
          fontSize={0.15}
          color={insights.savingTip ? COLORS.emerald : COLORS.slate}
          maxWidth={4.2}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          position={[0, -1.28, 0.1]}
        >
          {insights.savingTip
            ? `💡 ${insights.savingTip}`
            : "Log spending in flexible categories (Food, Transport, Shopping, Entertainment, Other) to see saving suggestions."}
        </Text>
      </GlassPanel>

      {/* Right: Readable Glass Subscriptions Cards Panel (replaces tiny unreadable tokens) */}
      <GlassPanel width={3.65} height={3.5} position={[2.55, -0.05, 0]} accent={COLORS.cyan} />

      {isCurrent && (
        <WorldHtml transform distanceFactor={4.6} position={[2.55, -0.05, 0.22]}>
          <div className="glass-subs-panel" onWheel={(e) => forwardWheel(e.deltaY)}>
            <div className="mini-panel-head">
              <strong>Recurring Subscriptions</strong>
              <button
                type="button"
                className="link-chip"
                onClick={() => {
                  setAddingSub((v) => !v);
                  setSubError(null);
                }}
              >
                {addingSub ? "Cancel" : "+ Add subscription"}
              </button>
            </div>

            {addingSub ? (
              <form onSubmit={onAddSub} className="world-form" noValidate>
                <label className="field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Mobile plan, Cloud storage"
                    required
                  />
                </label>
                <div className="field-row">
                  <label className="field">
                    <span>Amount ({CURRENCY.symbol})</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={subAmount}
                      onChange={(e) => setSubAmount(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Day of month (1–31)</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={subDay}
                      onChange={(e) => setSubDay(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Category</span>
                  <select value={subCat} onChange={(e) => setSubCat(e.target.value as Category)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={subAutoLog}
                    onChange={(e) => setSubAutoLog(e.target.checked)}
                  />
                  <span>Auto-log expense on due date</span>
                </label>
                {subError && (
                  <div className="form-error" role="alert">
                    {subError}
                  </div>
                )}
                <button type="submit" className="submit-3d-btn is-compact">
                  Save Subscription
                </button>
              </form>
            ) : insights.upcomingSubscriptions.length === 0 ? (
              <div className="empty-box">
                <p>No subscriptions added yet. Track recurring monthly bills and optionally auto-log them on their due date.</p>
              </div>
            ) : (
              <ul className="subs-card-list">
                {insights.upcomingSubscriptions.map((sub) => (
                  <li key={sub.id} className="sub-card">
                    <div className="sub-card-top">
                      <strong>{sub.name}</strong>
                      <span className="sub-amt">{formatMoney(sub.amount)}</span>
                    </div>
                    <div className="sub-card-meta">
                      <span>
                        {sub.category} · Due {formatShortDate(sub.nextDate)} (
                        {sub.daysAway === 0 ? "today" : `in ${sub.daysAway}d`})
                      </span>
                    </div>
                    <div className="sub-card-actions">
                      <label className="checkbox-row is-compact">
                        <input
                          type="checkbox"
                          checked={sub.autoLog}
                          onChange={() => toggleSubAutoLog(sub.id)}
                        />
                        <span>Auto-log</span>
                      </label>
                      <button
                        type="button"
                        className="tiny-action-btn is-danger"
                        onClick={() => deleteSubscription(sub.id)}
                        aria-label={`Delete subscription ${sub.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </WorldHtml>
      )}
    </StationGroup>
  );
}
