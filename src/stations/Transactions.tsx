import { RoundedBox, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Group } from "three";
import { GlassPanel } from "../components/GlassPanel";
import { GlassPill } from "../components/GlassPill";
import { Tooltip3D } from "../components/Tooltip3D";
import { WorldHtml } from "../components/WorldHtml";
import { CATEGORY_META, COLORS, CURRENCY, type Category } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatMoney, formatShortDate, validatePositiveAmount } from "../lib/format";
import { useStore, type Expense } from "../store/useStore";
import { flyTo, forwardWheel } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

const CARD_WIDTH = 2.45;
const CARD_SPACING = CARD_WIDTH * 1.26; // >= 1.2x card width so cards never overlap

function truncateNote(note: string, max = 26): string {
  return note.length > max ? `${note.slice(0, max - 1)}…` : note;
}

function CategoryShape3D({ category }: { category: Category }): JSX.Element {
  const meta = CATEGORY_META[category];
  return (
    <mesh position={[-0.92, 0.45, 0.09]}>
      {meta.shape === "sphere" && <sphereGeometry args={[0.15, 20, 20]} />}
      {meta.shape === "box" && <boxGeometry args={[0.22, 0.22, 0.22]} />}
      {meta.shape === "cone" && <coneGeometry args={[0.15, 0.26, 20]} />}
      {meta.shape === "torus" && <torusGeometry args={[0.12, 0.045, 12, 24]} />}
      {meta.shape === "octa" && <octahedronGeometry args={[0.17, 0]} />}
      {meta.shape === "cylinder" && <cylinderGeometry args={[0.12, 0.12, 0.24, 20]} />}
      {meta.shape === "dodeca" && <dodecahedronGeometry args={[0.16, 0]} />}
      {meta.shape === "ico" && <icosahedronGeometry args={[0.16, 0]} />}
      <meshStandardMaterial
        color={meta.color}
        emissive={meta.color}
        emissiveIntensity={1.45}
        roughness={0.2}
        toneMapped={false}
      />
    </mesh>
  );
}

interface TxCard3DProps {
  tx: Expense;
  relIndex: number;
  flipped: boolean;
  isCurrentStation: boolean;
  onSelectCenter: () => void;
  onToggleFlip: () => void;
  onUpdate: (id: string, note: string, amount: number) => void;
  onDelete: (id: string) => void;
}

function TxCard3D({
  tx,
  relIndex,
  flipped,
  isCurrentStation,
  onSelectCenter,
  onToggleFlip,
  onUpdate,
  onDelete
}: TxCard3DProps): JSX.Element {
  const ref = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const [editNote, setEditNote] = useState(tx.note);
  const [editAmt, setEditAmt] = useState(String(tx.amount));
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = CATEGORY_META[tx.category];
  const accent = tx.type === "income" ? COLORS.cyan : meta.color;
  const isCentered = relIndex === 0;

  useEffect(() => {
    setEditNote(tx.note);
    setEditAmt(String(tx.amount));
  }, [tx.note, tx.amount]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!ref.current) return;
    const targetX = relIndex * CARD_SPACING;
    const targetZ = isCentered ? 0.35 : -0.45 * Math.abs(relIndex);
    const targetScale = isCentered ? 1.06 : 0.86;
    const targetRotY = -relIndex * 0.12 + (flipped && isCentered ? Math.PI : 0);

    easing.damp3(ref.current.position, [targetX, -0.25, targetZ], 0.18, dt);
    easing.damp3(ref.current.scale, [targetScale, targetScale, targetScale], 0.18, dt);
    easing.damp(ref.current.rotation, "y", targetRotY, 0.2, dt);
  });

  const handleSave = (e: FormEvent): void => {
    e.preventDefault();
    const check = validatePositiveAmount(editAmt);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    onUpdate(tx.id, editNote.trim() || tx.note, check.value);
    onToggleFlip();
  };

  return (
    <group
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        if (!isCentered) {
          onSelectCenter();
        } else {
          setConfirmDel(false);
          onToggleFlip();
        }
      }}
    >
      <RoundedBox args={[CARD_WIDTH, 1.62, 0.1]} radius={0.12} smoothness={3}>
        <meshPhysicalMaterial
          color={isCentered ? "#0f2038" : "#0a1324"}
          transparent
          opacity={isCentered ? 0.88 : 0.48}
          roughness={0.22}
          metalness={0.2}
          clearcoat={0.9}
        />
      </RoundedBox>

      <mesh position={[0, 0.74, 0.06]}>
        <boxGeometry args={[2.0, 0.025, 0.02]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={isCentered ? 1.6 : 0.6} toneMapped={false} />
      </mesh>

      <CategoryShape3D category={tx.category} />

      <Text
        font={FONTS.headingMedium}
        fontSize={0.145}
        color={accent}
        anchorX="left"
        anchorY="middle"
        position={[-0.62, 0.45, 0.065]}
      >
        {`${tx.category} · ${tx.method}`}
      </Text>

      <Text
        font={FONTS.heading}
        fontSize={0.32}
        color={tx.type === "income" ? COLORS.cyan : COLORS.white}
        anchorX="left"
        anchorY="middle"
        position={[-1.02, 0.04, 0.065]}
      >
        {`${tx.type === "income" ? "+" : "−"}${formatMoney(tx.amount)}`}
      </Text>

      <Text
        font={FONTS.body}
        fontSize={0.145}
        color={COLORS.white}
        anchorX="left"
        anchorY="middle"
        position={[-1.02, -0.34, 0.065]}
      >
        {truncateNote(tx.note)}
      </Text>

      <Text
        font={FONTS.body}
        fontSize={0.135}
        color={COLORS.slate}
        anchorX="right"
        anchorY="middle"
        position={[1.02, -0.6, 0.065]}
      >
        {isCentered ? `${formatShortDate(tx.date)} · Click to edit` : formatShortDate(tx.date)}
      </Text>

      {/* Full note tooltip on hover if note was truncated */}
      <Tooltip3D
        visible={hovered && isCentered && !flipped && tx.note.length > 26}
        title={tx.note}
        accent={accent}
        position={[0, 1.15, 0.25]}
      />

      {isCurrentStation && flipped && isCentered && (
        <WorldHtml
          transform
          distanceFactor={3.9}
          position={[0, 0, -0.14]}
          rotation={[0, Math.PI, 0]}
        >
          <form
            className="glass-mini-panel is-card-back"
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            noValidate
          >
            <div className="mini-panel-head">
              <strong>Edit Entry</strong>
              <button type="button" className="icon-close-btn" onClick={onToggleFlip}>
                ✕
              </button>
            </div>
            <label className="field">
              <span>Note</span>
              <input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </label>
            <label className="field">
              <span>Amount ({CURRENCY.symbol})</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editAmt}
                onChange={(e) => setEditAmt(e.target.value)}
              />
            </label>
            {error && <div className="form-error">{error}</div>}
            {confirmDel ? (
              <div className="mini-panel-actions">
                <button
                  type="button"
                  className="danger-3d-btn"
                  style={{ flex: 1 }}
                  onClick={() => onDelete(tx.id)}
                >
                  Confirm Delete
                </button>
                <button type="button" className="ghost-3d-btn" onClick={() => setConfirmDel(false)}>
                  Keep
                </button>
              </div>
            ) : (
              <div className="mini-panel-actions">
                <button type="submit" className="submit-3d-btn is-compact" style={{ flex: 1 }}>
                  Save
                </button>
                <button
                  type="button"
                  className="danger-3d-btn"
                  onClick={() => setConfirmDel(true)}
                >
                  Delete
                </button>
              </div>
            )}
          </form>
        </WorldHtml>
      )}
    </group>
  );
}

export default function Transactions(): JSX.Element {
  const isCurrent = useStore((s) => s.selectedStation === 7);
  const expenses = useStore((s) => s.expenses);
  const updateExpense = useStore((s) => s.updateExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<Category | "All">("All");
  const [scrollIdx, setScrollIdx] = useState(0);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const dragStartX = useRef<number | null>(null);

  // Only show filter chips for categories that actually exist in user's data
  const activeCategories = useMemo(() => {
    const present = new Set<Category>();
    for (const e of expenses) present.add(e.category);
    return Array.from(present);
  }, [expenses]);

  const sortedAndFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...expenses]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .filter((e) => {
        if (catFilter !== "All" && e.category !== catFilter) return false;
        if (q && !e.note.toLowerCase().includes(q) && !e.category.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [expenses, query, catFilter]);

  const maxIdx = Math.max(0, sortedAndFiltered.length - 1);
  const clampedIdx = Math.min(maxIdx, Math.max(0, scrollIdx));

  // Keyboard Left/Right arrows navigate cards while inside History station
  useEffect(() => {
    if (!isCurrent) return;
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setScrollIdx((c) => Math.max(0, c - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setScrollIdx((c) => Math.min(maxIdx, c + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isCurrent, maxIdx]);

  // Only mount active card + immediate left/right neighbors so text never overlaps
  const startSlice = Math.max(0, clampedIdx - 1);
  const endSlice = Math.min(sortedAndFiltered.length, clampedIdx + 2);
  const visibleCards = sortedAndFiltered.slice(startSlice, endSlice);

  const chips: Array<Category | "All"> = ["All", ...activeCategories];

  return (
    <StationGroup index={7}>
      <group
        onPointerDown={(e) => {
          dragStartX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (dragStartX.current === null) return;
          const dx = e.clientX - dragStartX.current;
          dragStartX.current = null;
          if (Math.abs(dx) > 30) {
            setScrollIdx((curr) => Math.min(maxIdx, Math.max(0, curr + (dx < 0 ? 1 : -1))));
          }
        }}
      >
        <Text
          font={FONTS.heading}
          fontSize={0.38}
          color={COLORS.white}
          anchorX="center"
          anchorY="middle"
          position={[0, 2.55, 0]}
        >
          Transaction History
        </Text>

        {expenses.length === 0 ? (
          <group position={[0, -0.1, 0]}>
            <GlassPanel width={5.6} height={2.6} accent={COLORS.emerald}>
              <Text
                font={FONTS.headingMedium}
                fontSize={0.23}
                color={COLORS.white}
                anchorX="center"
                anchorY="middle"
                position={[0, 0.35, 0.1]}
              >
                No transactions yet
              </Text>
              <Text
                font={FONTS.body}
                fontSize={0.16}
                color={COLORS.slate}
                anchorX="center"
                anchorY="middle"
                position={[0, -0.05, 0.1]}
              >
                Log expenses or income in Add to see them here.
              </Text>
              <GlassPill
                label="+ Add your first entry →"
                position={[0, -0.68, 0.14]}
                width={2.6}
                height={0.48}
                fontSize={0.155}
                active
                accent={COLORS.emerald}
                onClick={() => flyTo(2)}
              />
            </GlassPanel>
          </group>
        ) : (
          <>
            {isCurrent && (
              <WorldHtml transform distanceFactor={4.6} position={[0, 1.92, 0.22]}>
                <div className="tx-search-bar" onWheel={(e) => forwardWheel(e.deltaY)}>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setScrollIdx(0);
                    }}
                    placeholder="Search notes or categories…"
                    aria-label="Search transactions"
                  />
                  <button
                    type="button"
                    className="ghost-3d-btn"
                    onClick={() => setScrollIdx((c) => Math.max(0, c - 1))}
                    aria-label="Previous transaction"
                  >
                    ← Prev
                  </button>
                  <span className="tx-counter">
                    {sortedAndFiltered.length > 0
                      ? `${clampedIdx + 1} / ${sortedAndFiltered.length}`
                      : "0 / 0"}
                  </span>
                  <button
                    type="button"
                    className="ghost-3d-btn"
                    onClick={() => setScrollIdx((c) => Math.min(maxIdx, c + 1))}
                    aria-label="Next transaction"
                  >
                    Next →
                  </button>
                </div>
              </WorldHtml>
            )}

            {/* Dynamic Category Filter Pills (only categories present in real data) */}
            <group position={[0, 1.18, 0]}>
              {chips.map((chip, i) => {
                const spacing = 1.18;
                const x = (i - (chips.length - 1) * 0.5) * spacing;
                return (
                  <GlassPill
                    key={chip}
                    label={chip}
                    position={[x, 0, 0]}
                    width={1.08}
                    height={0.38}
                    fontSize={0.135}
                    active={catFilter === chip}
                    accent={COLORS.emerald}
                    onClick={() => {
                      setCatFilter(chip);
                      setScrollIdx(0);
                    }}
                  />
                );
              })}
            </group>

            {/* Non-overlapping 3-card window */}
            <group>
              {visibleCards.map((tx, localIdx) => {
                const realIdx = startSlice + localIdx;
                return (
                  <TxCard3D
                    key={tx.id}
                    tx={tx}
                    relIndex={realIdx - clampedIdx}
                    flipped={flippedId === tx.id}
                    isCurrentStation={isCurrent}
                    onSelectCenter={() => {
                      setFlippedId(null);
                      setScrollIdx(realIdx);
                    }}
                    onToggleFlip={() => setFlippedId((cur) => (cur === tx.id ? null : tx.id))}
                    onUpdate={(id, note, amount) => updateExpense(id, { note, amount })}
                    onDelete={(id) => {
                      deleteExpense(id);
                      setFlippedId(null);
                    }}
                  />
                );
              })}
              {sortedAndFiltered.length === 0 && (
                <Text
                  font={FONTS.body}
                  fontSize={0.2}
                  color={COLORS.slate}
                  anchorX="center"
                  anchorY="middle"
                  position={[0, -0.25, 0]}
                >
                  No entries match your search.
                </Text>
              )}
            </group>
          </>
        )}
      </group>
    </StationGroup>
  );
}
