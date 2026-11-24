import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState, type FormEvent } from "react";
import { Group, Mesh } from "three";
import { Coin } from "../components/Coin";
import { GlassPanel } from "../components/GlassPanel";
import { WorldHtml } from "../components/WorldHtml";
import {
  CATEGORIES,
  COLORS,
  CURRENCY,
  PAYMENT_METHODS,
  type Category,
  type PaymentMethod
} from "../lib/constants";
import { FONTS } from "../lib/fonts";
import {
  formatMoney,
  formatShortDate,
  toISODate,
  validatePositiveAmount
} from "../lib/format";
import { useStore, type Expense, type TxType } from "../store/useStore";
import { flyTo, forwardWheel } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

interface CoinDropState {
  active: boolean;
  t: number;
}

export default function AddExpense(): JSX.Element {
  const isCurrent = useStore((s) => s.selectedStation === 2);
  const expenses = useStore((s) => s.expenses);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);

  const todayIso = toISODate(new Date());

  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [date, setDate] = useState(todayIso);
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dropState = useRef<CoinDropState>({ active: false, t: 0 });
  const coinRef = useRef<Group>(null);
  const rippleRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const st = dropState.current;
    if (!st.active) return;
    st.t += Math.min(delta, 0.08);
    const t = st.t;

    if (coinRef.current) {
      coinRef.current.visible = true;
      if (t < 0.65) {
        const u = t / 0.65;
        const bounce = Math.abs(Math.sin(u * Math.PI * 1.5)) * (1 - u) * 1.2;
        coinRef.current.position.set(-2.9, 3.0 * (1 - u) - 1.1 + bounce, 0.6);
      } else {
        const u = Math.min(1, (t - 0.65) / 1.0);
        const ease = u * u * (3 - 2 * u);
        coinRef.current.position.set(-2.9 - 10 * ease, -1.1 + 1.1 * ease, 0.6 - 20 * ease);
      }
    }

    if (rippleRef.current) {
      rippleRef.current.visible = t < 1.2;
      const s = 1 + t * 2.5;
      rippleRef.current.scale.set(s, s, 1);
    }

    if (t >= 1.7) {
      st.active = false;
      if (coinRef.current) coinRef.current.visible = false;
      if (rippleRef.current) rippleRef.current.visible = false;
    }
  });

  const startEdit = (tx: Expense): void => {
    setEditingId(tx.id);
    setTxType(tx.type);
    setAmount(String(tx.amount));
    setCategory(tx.category);
    setDate(tx.date);
    setMethod(tx.method);
    setNote(tx.note);
    setError(null);
  };

  const resetForm = (): void => {
    setEditingId(null);
    setAmount("");
    setNote("");
    setDate(todayIso);
    setError(null);
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    const amtCheck = validatePositiveAmount(amount);
    if (!amtCheck.ok) {
      setError(amtCheck.error);
      return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a valid date.");
      return;
    }
    if (date > todayIso) {
      setError("Date cannot be in the future.");
      return;
    }

    setError(null);
    const cleanNote = note.trim() || `${category} ${txType}`;

    if (editingId) {
      updateExpense(editingId, {
        amount: amtCheck.value,
        category,
        date,
        note: cleanNote,
        method,
        type: txType
      });
      setToast(`Updated ${formatMoney(amtCheck.value)} (${category})`);
      resetForm();
      return;
    }

    const created = addExpense({
      amount: amtCheck.value,
      category,
      date,
      note: cleanNote,
      method,
      type: txType
    });
    setAmount("");
    setNote("");
    setToast(`${txType === "income" ? "Added income" : "Logged"} ${formatMoney(created.amount)} (${created.category})`);
    dropState.current = { active: true, t: 0 };
  };

  return (
    <StationGroup index={2}>
      <Text
        font={FONTS.heading}
        fontSize={0.38}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0]}
      >
        Add Expenses &amp; Income
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.16}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.15, 0]}
      >
        {expenses.length > 0
          ? `${expenses.length} ${expenses.length === 1 ? "entry" : "entries"} added · Add more or scroll to see your results`
          : "Log your real expenses or income — everything updates live"}
      </Text>

      <GlassPanel width={7.0} height={3.85} position={[0, -0.32, 0]} accent={COLORS.emerald} />

      {isCurrent && (
        <WorldHtml transform distanceFactor={4.15} position={[0, -0.32, 0.22]}>
          <div className="add-station-grid">
            {/* Left column: Form */}
            <div
              className="glass-form-card"
              onWheel={(e) => {
                const target = e.target as HTMLElement | null;
                if (target && target.tagName === "SELECT") return;
                forwardWheel(e.deltaY);
              }}
            >
              <div className="form-toggle-row" role="tablist" aria-label="Entry type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={txType === "expense"}
                  className={`pill-toggle${txType === "expense" ? " is-active" : ""}`}
                  onClick={() => setTxType("expense")}
                >
                  Expense (−)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={txType === "income"}
                  className={`pill-toggle${txType === "income" ? " is-active is-cyan" : ""}`}
                  onClick={() => setTxType("income")}
                >
                  Income (+)
                </button>
              </div>

              <form onSubmit={onSubmit} className="world-form" noValidate>
                <div className="field-row">
                  <label className="field">
                    <span>Amount ({CURRENCY.symbol})</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Category</span>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Category)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="field-row">
                  <label className="field">
                    <span>Date (max today)</span>
                    <input
                      type="date"
                      max={todayIso}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </label>
                  <div className="field">
                    <span>Payment Method</span>
                    <div className="method-group" role="group" aria-label="Payment method">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`method-btn${method === m ? " is-active" : ""}`}
                          onClick={() => setMethod(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <label className="field">
                  <span>Note (optional)</span>
                  <input
                    type="text"
                    value={note}
                    maxLength={80}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What was this for?"
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
                  <button type="submit" className="submit-3d-btn" style={{ flex: 1 }}>
                    {editingId
                      ? "Save Changes"
                      : txType === "income"
                        ? "Add Income"
                        : "Add Expense"}
                  </button>
                  {editingId && (
                    <button type="button" className="ghost-3d-btn" onClick={resetForm}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Right column: Live entries list (newest first) */}
            <div className="glass-live-list">
              <div className="live-list-head">
                <strong>
                  {expenses.length} {expenses.length === 1 ? "entry" : "entries"} added
                </strong>
                {expenses.length > 0 && (
                  <button
                    type="button"
                    className="link-chip"
                    onClick={() => flyTo(3)}
                  >
                    View Results →
                  </button>
                )}
              </div>

              {expenses.length === 0 ? (
                <div className="empty-box">
                  <p>No entries yet. Add your first expense or income on the left.</p>
                </div>
              ) : (
                <ul className="live-entries-ul">
                  {expenses.map((tx) => (
                    <li key={tx.id} className="live-entry-item">
                      <div className="live-entry-info">
                        <span className="live-entry-title" title={tx.note}>
                          {tx.note}
                        </span>
                        <span className="live-entry-meta">
                          {tx.category} · {tx.method} · {formatShortDate(tx.date)}
                        </span>
                      </div>
                      <div className="live-entry-right">
                        <span
                          className={`live-entry-amt${tx.type === "income" ? " is-income" : ""}`}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {formatMoney(tx.amount)}
                        </span>
                        <button
                          type="button"
                          className="tiny-action-btn"
                          onClick={() => startEdit(tx)}
                          aria-label={`Edit ${tx.note}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="tiny-action-btn is-danger"
                          onClick={() => {
                            deleteExpense(tx.id);
                            if (editingId === tx.id) resetForm();
                          }}
                          aria-label={`Delete ${tx.note}`}
                        >
                          Del
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="live-list-hint">Add more or scroll to see your results</p>
            </div>
          </div>
        </WorldHtml>
      )}

      <group ref={coinRef} position={[-2.9, 3.0, 0.6]} visible={false}>
        <Coin scale={1.0} spinSpeed={4.5} />
      </group>

      <mesh ref={rippleRef} position={[0, -2.1, 0.15]} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.85, 1.0, 48]} />
        <meshBasicMaterial color={COLORS.emerald} transparent opacity={0.65} toneMapped={false} />
      </mesh>
    </StationGroup>
  );
}
