import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  CATEGORIES,
  CURRENCY,
  PAYMENT_METHODS,
  STATIONS,
  type Category,
  type PaymentMethod
} from "../lib/constants";
import { downloadExpensesCsv } from "../lib/csv";
import {
  endOfMonthISO,
  formatMoney,
  formatShortDate,
  toISODate,
  validateNonNegativeAmount,
  validatePositiveAmount
} from "../lib/format";
import {
  useAnalytics,
  useBudgetSummary,
  useGoals,
  useInsights,
  useOverview,
  type Range
} from "../store/selectors";
import { useStore, type TxType } from "../store/useStore";
import { flyTo } from "../world/navigation";

/** Hidden semantic DOM mirror + aria-live announcements while in 3D mode. */
export function A11yMirror(): JSX.Element {
  const overview = useOverview();
  const budgets = useBudgetSummary();
  const goals = useGoals();
  const expenses = useStore((s) => s.expenses);
  const setupComplete = useStore((s) => s.profile.setupComplete);
  const lastAddedId = useStore((s) => s.lastAddedId);

  const lastTx = useMemo(
    () => (lastAddedId ? expenses.find((e) => e.id === lastAddedId) ?? null : null),
    [expenses, lastAddedId]
  );

  return (
    <div className="sr-only" aria-label="TrackMySpend 2.0 screen reader mirror">
      <div role="status" aria-live="polite" aria-atomic="true">
        {lastTx
          ? `${lastTx.type === "income" ? "Income added" : "Expense added"}: ${formatMoney(lastTx.amount)} in ${lastTx.category} (${lastTx.note})`
          : ""}
      </div>
      <h1>TrackMySpend 2.0 — Real student money, in 3D</h1>
      <nav aria-label="Quick station jump">
        <ul>
          {STATIONS.map((s, i) => (
            <li key={s.id}>
              <button type="button" onClick={() => flyTo(i)}>
                Jump to {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {setupComplete && (
        <section aria-label="Overview summary">
          <h2>Overview</h2>
          <p>Current balance: {formatMoney(overview.currentBalance)}</p>
          <p>Spent this period: {formatMoney(overview.spentInPeriod)}</p>
          <p>Safe daily spend: {formatMoney(overview.safeDailySpend)}</p>
        </section>
      )}
      <section aria-label="Budgets">
        <h2>Budgets</h2>
        <ul>
          {budgets.budgeted.map((u) => (
            <li key={u.category}>
              {u.category}: {formatMoney(u.spent)} of {formatMoney(u.limit)} ({Math.round(u.pct)}%)
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Goals">
        <h2>Savings Goals</h2>
        <ul>
          {goals.map((g) => (
            <li key={g.id}>
              {g.name}: {formatMoney(g.saved)} of {formatMoney(g.target)} ({Math.round(g.pct)}%)
            </li>
          ))}
        </ul>
      </section>
      <section aria-label="Recent transactions">
        <h2>History</h2>
        <ul>
          {expenses.map((e) => (
            <li key={e.id}>
              {e.date} · {e.category} · {e.type === "income" ? "+" : "-"}
              {formatMoney(e.amount)} · {e.note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Accessible flat dashboard with 100% parity with the 3D world, using the same store & selectors. */
export function SimpleView(): JSX.Element {
  const profile = useStore((s) => s.profile);
  const expenses = useStore((s) => s.expenses);
  const webglFailed = useStore((s) => s.webglFailed);
  const saveProfile = useStore((s) => s.saveProfile);
  const addExpense = useStore((s) => s.addExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const setBudget = useStore((s) => s.setBudget);
  const removeBudget = useStore((s) => s.removeBudget);
  const addGoal = useStore((s) => s.addGoal);
  const adjustGoal = useStore((s) => s.adjustGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const addSubscription = useStore((s) => s.addSubscription);
  const deleteSubscription = useStore((s) => s.deleteSubscription);
  const exportBackupJson = useStore((s) => s.exportBackupJson);
  const importBackupJson = useStore((s) => s.importBackupJson);
  const resetAllData = useStore((s) => s.resetAllData);
  const setSettings = useStore((s) => s.setSettings);

  const overview = useOverview();
  const budgets = useBudgetSummary();
  const goals = useGoals();
  const insights = useInsights();
  const [range, setRange] = useState<Range>("week");
  const analytics = useAnalytics(range);

  const todayIso = toISODate(new Date());
  const eomIso = endOfMonthISO(new Date());

  // Money setup form state
  const [startRaw, setStartRaw] = useState(profile.setupComplete ? String(profile.startingBalance) : "");
  const [incRaw, setIncRaw] = useState(profile.monthlyIncome > 0 ? String(profile.monthlyIncome) : "");
  const [endDate, setEndDate] = useState(profile.periodEnd || eomIso);
  const [limitRaw, setLimitRaw] = useState(profile.overallLimit ? String(profile.overallLimit) : "");
  const [moneyErr, setMoneyErr] = useState<string | null>(null);

  // Add entry form state
  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [date, setDate] = useState(todayIso);
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [note, setNote] = useState("");
  const [txErr, setTxErr] = useState<string | null>(null);

  // Budget form state
  const [budCat, setBudCat] = useState<Category>("Food");
  const [budAmt, setBudAmt] = useState("");
  const [budErr, setBudErr] = useState<string | null>(null);

  // Goal form state
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalTransfer, setGoalTransfer] = useState("");
  const [goalErr, setGoalErr] = useState<string | null>(null);

  // Subscription form state
  const [subName, setSubName] = useState("");
  const [subAmt, setSubAmt] = useState("");
  const [subDay, setSubDay] = useState("1");
  const [subCat, setSubCat] = useState<Category>("Entertainment");
  const [subErr, setSubErr] = useState<string | null>(null);

  // Reset confirmation
  const [resetText, setResetText] = useState("");
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const onSaveMoney = (e: FormEvent): void => {
    e.preventDefault();
    const sCheck = validateNonNegativeAmount(startRaw, false);
    if (!sCheck.ok) {
      setMoneyErr(sCheck.error);
      return;
    }
    const iCheck = validateNonNegativeAmount(incRaw, true);
    if (!iCheck.ok) {
      setMoneyErr(iCheck.error);
      return;
    }
    const lCheck = validateNonNegativeAmount(limitRaw, true);
    if (!lCheck.ok) {
      setMoneyErr(lCheck.error);
      return;
    }
    if (!endDate || endDate < todayIso) {
      setMoneyErr("End date must be today or later.");
      return;
    }
    setMoneyErr(null);
    saveProfile({
      startingBalance: sCheck.value,
      monthlyIncome: iCheck.value,
      periodEnd: endDate,
      overallLimit: limitRaw.trim() && lCheck.value > 0 ? lCheck.value : null
    });
  };

  const onAddTx = (e: FormEvent): void => {
    e.preventDefault();
    const check = validatePositiveAmount(amount);
    if (!check.ok) {
      setTxErr(check.error);
      return;
    }
    if (!date || date > todayIso) {
      setTxErr("Date cannot be in the future.");
      return;
    }
    setTxErr(null);
    addExpense({
      amount: check.value,
      category,
      date,
      method,
      type: txType,
      note: note.trim() || `${category} ${txType}`
    });
    setAmount("");
    setNote("");
  };

  const onAddBudget = (e: FormEvent): void => {
    e.preventDefault();
    const check = validatePositiveAmount(budAmt);
    if (!check.ok) {
      setBudErr(check.error);
      return;
    }
    setBudErr(null);
    setBudget(budCat, check.value);
    setBudAmt("");
  };

  const onCreateGoal = (e: FormEvent): void => {
    e.preventDefault();
    if (!goalName.trim()) {
      setGoalErr("Enter a goal name.");
      return;
    }
    const check = validatePositiveAmount(goalTarget);
    if (!check.ok) {
      setGoalErr(check.error);
      return;
    }
    setGoalErr(null);
    addGoal(goalName.trim(), check.value);
    setGoalName("");
    setGoalTarget("");
  };

  const onAddSub = (e: FormEvent): void => {
    e.preventDefault();
    if (!subName.trim()) {
      setSubErr("Enter a name.");
      return;
    }
    const check = validatePositiveAmount(subAmt);
    if (!check.ok) {
      setSubErr(check.error);
      return;
    }
    const dayNum = Math.round(Number(subDay));
    if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 31) {
      setSubErr("Day must be 1–31.");
      return;
    }
    setSubErr(null);
    addSubscription({
      name: subName.trim(),
      amount: check.value,
      dayOfMonth: dayNum,
      category: subCat,
      autoLog: true
    });
    setSubName("");
    setSubAmt("");
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importBackupJson(typeof reader.result === "string" ? reader.result : "");
      setBackupMsg(res.ok ? "Backup imported." : res.error);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <main className="simple-view">
      <header className="simple-header">
        <div>
          <h1>TrackMySpend 2.0 — Simple View</h1>
          <p>
            {webglFailed
              ? "WebGL was unavailable, so Simple View opened automatically."
              : "Same store, same formulas, real data only · Data: local only"}
          </p>
        </div>
        <div className="simple-actions">
          {!webglFailed && (
            <button
              type="button"
              className="submit-3d-btn is-compact"
              onClick={() => setSettings({ simpleView: false })}
            >
              Return to 3D World
            </button>
          )}
          <button
            type="button"
            className="ghost-3d-btn"
            onClick={() => downloadExpensesCsv(expenses)}
          >
            ⬇ Export CSV
          </button>
          <button
            type="button"
            className="ghost-3d-btn"
            onClick={() => {
              const blob = new Blob([exportBackupJson()], { type: "application/json" });
              const u = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = u;
              a.download = "trackmyspend-backup.json";
              a.click();
              URL.revokeObjectURL(u);
            }}
          >
            ⬇ Export JSON
          </button>
          <button type="button" className="ghost-3d-btn" onClick={() => importRef.current?.click()}>
            ⬆ Import JSON
          </button>
          <input ref={importRef} type="file" accept=".json" className="sr-only" onChange={handleImport} />
        </div>
      </header>

      {/* Step 2: Your Money */}
      <section className="simple-card simple-section" aria-label="Your Money Setup">
        <h2>Step 1 · Your Money</h2>
        <form onSubmit={onSaveMoney} className="world-form" noValidate>
          <div className="field-row">
            <label className="field">
              <span>Money I have now ({CURRENCY.symbol})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={startRaw}
                onChange={(e) => setStartRaw(e.target.value)}
                placeholder="0"
                required
              />
            </label>
            <label className="field">
              <span>Monthly income / allowance (optional)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={incRaw}
                onChange={(e) => setIncRaw(e.target.value)}
                placeholder="0"
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Last until date</span>
              <input
                type="date"
                min={todayIso}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Overall spending limit (optional)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={limitRaw}
                onChange={(e) => setLimitRaw(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>
          {moneyErr && <div className="form-error">{moneyErr}</div>}
          <button type="submit" className="submit-3d-btn">
            {profile.setupComplete ? "Update Money Setup" : "Save & Continue"}
          </button>
        </form>
      </section>

      {!profile.setupComplete ? (
        <div className="simple-card simple-section">
          <p>🔒 Enter your money above to unlock Expenses, Overview, Budgets, Analytics, Goals, and Insights.</p>
        </div>
      ) : (
        <>
          {/* Overview */}
          <section className="simple-kpis" aria-label="Overview">
            <div className="simple-card">
              <span>Current Balance</span>
              <strong>{formatMoney(overview.currentBalance)}</strong>
            </div>
            <div className="simple-card">
              <span>Spent This Period</span>
              <strong>{formatMoney(overview.spentInPeriod)}</strong>
            </div>
            <div className="simple-card">
              <span>Safe To Spend / Day</span>
              <strong>{formatMoney(overview.safeDailySpend)}</strong>
            </div>
          </section>

          <div className="simple-grid">
            {/* Add Expense */}
            <section className="simple-card" aria-label="Add Expense">
              <h2>Add Expense or Income</h2>
              <form onSubmit={onAddTx} className="world-form" noValidate>
                <div className="field-row">
                  <label className="field">
                    <span>Type</span>
                    <select value={txType} onChange={(e) => setTxType(e.target.value as TxType)}>
                      <option value="expense">Expense (−)</option>
                      <option value="income">Income (+)</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Amount ({CURRENCY.symbol})</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>Category</span>
                    <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Method</span>
                    <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>Date</span>
                    <input type="date" max={todayIso} value={date} onChange={(e) => setDate(e.target.value)} required />
                  </label>
                  <label className="field">
                    <span>Note (optional)</span>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
                  </label>
                </div>
                {txErr && <div className="form-error">{txErr}</div>}
                <button type="submit" className="submit-3d-btn">
                  Add Entry
                </button>
              </form>
            </section>

            {/* Budgets */}
            <section className="simple-card" aria-label="Budgets">
              <h2>Category Budgets</h2>
              {budgets.budgeted.length === 0 ? (
                <p className="mini-panel-sub">No budgets set yet.</p>
              ) : (
                <ul className="simple-list">
                  {budgets.budgeted.map((b) => (
                    <li key={b.category}>
                      <span>
                        <b>{b.category}</b>: {formatMoney(b.spent)} / {formatMoney(b.limit)} ({Math.round(b.pct)}%)
                      </span>
                      <button type="button" className="tiny-action-btn is-danger" onClick={() => removeBudget(b.category)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={onAddBudget} className="mini-panel-row" style={{ marginTop: 12 }} noValidate>
                <select value={budCat} onChange={(e) => setBudCat(e.target.value as Category)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Limit"
                  value={budAmt}
                  onChange={(e) => setBudAmt(e.target.value)}
                />
                <button type="submit" className="submit-3d-btn is-compact">
                  Set
                </button>
              </form>
              {budErr && <div className="form-error">{budErr}</div>}
            </section>

            {/* Analytics */}
            <section className="simple-card" aria-label="Analytics">
              <div className="mini-panel-head">
                <h2>Analytics ({range})</h2>
                <div className="mini-panel-actions" style={{ marginTop: 0 }}>
                  {(["week", "month", "semester"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`tiny-action-btn${range === r ? " is-active" : ""}`}
                      onClick={() => setRange(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {!analytics.hasData ? (
                <p className="mini-panel-sub">No expenses in this window yet.</p>
              ) : (
                <ul className="simple-list">
                  {analytics.donut.map((d) => (
                    <li key={d.category}>
                      <span>{d.category}</span>
                      <span>
                        {formatMoney(d.value)} ({d.pct.toFixed(2)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Goals */}
            <section className="simple-card" aria-label="Savings Goals">
              <h2>Savings Goals</h2>
              {goals.length === 0 ? (
                <p className="mini-panel-sub">No savings goals yet.</p>
              ) : (
                <>
                  <label className="field" style={{ marginBottom: 8 }}>
                    <span>Transfer amount ({CURRENCY.symbol})</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0"
                      value={goalTransfer}
                      onChange={(e) => setGoalTransfer(e.target.value)}
                    />
                  </label>
                  <ul className="simple-list">
                    {goals.map((g) => (
                      <li key={g.id}>
                        <span>
                          <b>{g.name}</b>: {formatMoney(g.saved)} / {formatMoney(g.target)} ({Math.round(g.pct)}%)
                        </span>
                        <div className="mini-panel-actions" style={{ marginTop: 0 }}>
                          <button
                            type="button"
                            className="tiny-action-btn"
                            onClick={() => {
                              const c = validatePositiveAmount(goalTransfer);
                              if (!c.ok) return setGoalErr(c.error);
                              const res = adjustGoal(g.id, c.value);
                              setGoalErr(res.ok ? null : res.error);
                            }}
                          >
                            + Add
                          </button>
                          <button
                            type="button"
                            className="tiny-action-btn"
                            onClick={() => {
                              const c = validatePositiveAmount(goalTransfer);
                              if (!c.ok) return setGoalErr(c.error);
                              const res = adjustGoal(g.id, -c.value);
                              setGoalErr(res.ok ? null : res.error);
                            }}
                          >
                            − Withdraw
                          </button>
                          <button type="button" className="tiny-action-btn is-danger" onClick={() => deleteGoal(g.id)}>
                            Del
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <form onSubmit={onCreateGoal} className="mini-panel-row" style={{ marginTop: 12 }} noValidate>
                <input placeholder="Goal name" value={goalName} onChange={(e) => setGoalName(e.target.value)} />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Target"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                />
                <button type="submit" className="submit-3d-btn is-compact">
                  Create
                </button>
              </form>
              {goalErr && <div className="form-error">{goalErr}</div>}
            </section>

            {/* Insights & Subscriptions */}
            <section className="simple-card" aria-label="Insights and Subscriptions">
              <h2>Insights</h2>
              <ul className="simple-list">
                <li>
                  <span>Biggest category</span>
                  <b>{insights.biggestCategory ? `${insights.biggestCategory.category} (${formatMoney(insights.biggestCategory.amount)})` : "No expenses yet"}</b>
                </li>
                <li>
                  <span>Week-over-week</span>
                  <b>{insights.hasWeekOverWeek && insights.weekOverWeekPct !== null ? `${insights.weekOverWeekPct}%` : "Need 14 days of data"}</b>
                </li>
                <li>
                  <span>Avg daily spend</span>
                  <b>{insights.avgDailySpend !== null ? formatMoney(insights.avgDailySpend) : "Need 3+ days of data"}</b>
                </li>
                <li>
                  <span>Runway</span>
                  <b>{insights.outOfMoney ? "Out of money" : insights.runwayDays !== null ? `${Math.floor(insights.runwayDays)} days` : "Need 3+ days of data"}</b>
                </li>
              </ul>
              {insights.savingTip && <p style={{ marginTop: 10, fontSize: 13 }}>💡 {insights.savingTip}</p>}

              <h3 style={{ marginTop: 14, fontSize: 15 }}>Subscriptions</h3>
              {insights.upcomingSubscriptions.length === 0 ? (
                <p className="mini-panel-sub">No subscriptions yet.</p>
              ) : (
                <ul className="simple-list">
                  {insights.upcomingSubscriptions.map((s) => (
                    <li key={s.id}>
                      <span>
                        <b>{s.name}</b> ({formatMoney(s.amount)}) · Due {formatShortDate(s.nextDate)}
                      </span>
                      <button type="button" className="tiny-action-btn is-danger" onClick={() => deleteSubscription(s.id)}>
                        Del
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={onAddSub} className="mini-panel-row" style={{ marginTop: 10 }} noValidate>
                <input placeholder="Name" value={subName} onChange={(e) => setSubName(e.target.value)} />
                <input type="number" min="1" placeholder="Amt" value={subAmt} onChange={(e) => setSubAmt(e.target.value)} />
                <input type="number" min="1" max="31" placeholder="Day" value={subDay} onChange={(e) => setSubDay(e.target.value)} style={{ width: 64 }} />
                <select value={subCat} onChange={(e) => setSubCat(e.target.value as Category)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button type="submit" className="submit-3d-btn is-compact">
                  Add
                </button>
              </form>
              {subErr && <div className="form-error">{subErr}</div>}
            </section>

            {/* History & Reset */}
            <section className="simple-card" aria-label="History and Reset">
              <h2>History ({expenses.length})</h2>
              {expenses.length === 0 ? (
                <p className="mini-panel-sub">No transactions yet.</p>
              ) : (
                <ul className="simple-list is-scroll">
                  {expenses.map((e) => (
                    <li key={e.id}>
                      <span>
                        {formatShortDate(e.date)} · <b>{e.category}</b> · {e.note}
                      </span>
                      <span>
                        <b>
                          {e.type === "income" ? "+" : "−"}
                          {formatMoney(e.amount)}
                        </b>{" "}
                        <button
                          type="button"
                          className="tiny-action-btn is-danger"
                          aria-label={`Delete ${e.note}`}
                          onClick={() => deleteExpense(e.id)}
                        >
                          Del
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="reset-confirm-box" style={{ marginTop: 14 }}>
                <p>
                  Type <strong>RESET</strong> to clear all local data:
                </p>
                <div className="mini-panel-row">
                  <input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="Type RESET" />
                  <button
                    type="button"
                    className="danger-3d-btn"
                    onClick={() => {
                      if (resetText.trim() !== "RESET") return;
                      setResetText("");
                      resetAllData();
                    }}
                  >
                    Reset All
                  </button>
                </div>
              </div>
              {backupMsg && <p className="mini-panel-sub">{backupMsg}</p>}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
