import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Group } from "three";
import { GlassPanel } from "../components/GlassPanel";
import { GlassPill } from "../components/GlassPill";
import { Tooltip3D } from "../components/Tooltip3D";
import { WorldHtml } from "../components/WorldHtml";
import { CATEGORIES, COLORS, CURRENCY, type Category } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatMoney, validatePositiveAmount } from "../lib/format";
import type { BudgetUsageItem } from "../lib/calc";
import { useBudgetSummary } from "../store/selectors";
import { useStore } from "../store/useStore";
import { forwardWheel } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

function ringColor(health: BudgetUsageItem["health"]): string {
  if (health === "over") return COLORS.rose;
  if (health === "warn") return COLORS.amber;
  return COLORS.emerald;
}

interface RingItemProps {
  item: BudgetUsageItem;
  radius: number;
  selected: boolean;
  onHover: (item: BudgetUsageItem | null) => void;
  onSelect: (category: Category) => void;
}

function RingItem({ item, radius, selected, onHover, onSelect }: RingItemProps): JSX.Element {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const color = ringColor(item.health);
  const arc = Math.max(0.06, Math.min(1, item.ratio)) * Math.PI * 2;

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    if (!groupRef.current) return;
    const pulse = item.health === "over" ? 1 + Math.sin(state.clock.elapsedTime * 5) * 0.03 : 1;
    const s = (hovered || selected ? 1.04 : 1) * pulse;
    easing.damp3(groupRef.current.scale, [s, s, s], 0.15, dt);
  });

  return (
    <group
      ref={groupRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(item);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.category);
      }}
    >
      <mesh>
        <torusGeometry args={[radius, 0.055, 16, 96]} />
        <meshPhysicalMaterial color="#13233b" transparent opacity={0.35} roughness={0.25} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[radius, 0.064, 16, 96, arc]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || selected ? 2.1 : 1.3}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function BudgetRings(): JSX.Element {
  const isCurrent = useStore((s) => s.selectedStation === 4);
  const summary = useBudgetSummary();
  const setBudget = useStore((s) => s.setBudget);
  const removeBudget = useStore((s) => s.removeBudget);

  const [hoveredItem, setHoveredItem] = useState<BudgetUsageItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category>("Food");
  const [draftLimit, setDraftLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openEditor = (cat: Category): void => {
    const existing = summary.budgeted.find((b) => b.category === cat);
    setEditingCat(cat);
    setDraftLimit(existing ? String(existing.limit) : "");
    setError(null);
    setEditorOpen(true);
  };

  const onSaveBudget = (e: FormEvent): void => {
    e.preventDefault();
    const check = validatePositiveAmount(draftLimit);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    setBudget(editingCat, check.value);
    setEditorOpen(false);
  };

  const hasBudgets = summary.budgeted.length > 0;

  return (
    <StationGroup index={4}>
      <Text
        font={FONTS.heading}
        fontSize={0.38}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0]}
      >
        Category Budgets
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.16}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.15, 0]}
      >
        {hasBudgets
          ? "Click any ring to adjust its limit · Colors: <80% green, 80–100% amber, >100% red"
          : "No budgets set yet — create a ring for any category you want to cap"}
      </Text>

      {/* Left: Rings or Empty Ghost Ring Frame */}
      <group position={[-1.65, -0.05, 0]}>
        {hasBudgets ? (
          summary.budgeted.map((item, idx) => (
            <RingItem
              key={item.category}
              item={item}
              radius={0.75 + idx * 0.34}
              selected={editorOpen && editingCat === item.category}
              onHover={setHoveredItem}
              onSelect={openEditor}
            />
          ))
        ) : (
          <group>
            {[0.85, 1.25, 1.65].map((r, i) => (
              <mesh key={i}>
                <torusGeometry args={[r, 0.035, 12, 72]} />
                <meshBasicMaterial color="#1e293b" transparent opacity={0.45} />
              </mesh>
            ))}
            <Text
              font={FONTS.headingMedium}
              fontSize={0.2}
              color={COLORS.slate}
              anchorX="center"
              anchorY="middle"
              position={[0, 0.25, 0.1]}
            >
              No budget rings yet
            </Text>
            <GlassPill
              label="Set your first budget"
              position={[0, -0.35, 0.2]}
              width={2.5}
              height={0.5}
              fontSize={0.16}
              active
              accent={COLORS.emerald}
              onClick={() => openEditor(summary.unbudgetedWithSpend[0]?.category ?? "Food")}
            />
          </group>
        )}

        <Tooltip3D
          visible={Boolean(hoveredItem)}
          title={
            hoveredItem
              ? `${hoveredItem.category}: ${formatMoney(hoveredItem.spent)} / ${formatMoney(hoveredItem.limit)}`
              : ""
          }
          subtitle={hoveredItem ? `${Math.round(hoveredItem.pct)}% used` : undefined}
          accent={hoveredItem ? ringColor(hoveredItem.health) : COLORS.emerald}
          position={[0, 0, 0.4]}
        />
      </group>

      {/* Right: Budget Legend + Unbudgeted Spent List + "+ Budget" */}
      <group position={[2.25, -0.05, 0]}>
        <GlassPanel width={3.7} height={3.55} accent={COLORS.cyan}>
          <Text
            font={FONTS.headingMedium}
            fontSize={0.18}
            color={COLORS.white}
            anchorX="left"
            anchorY="middle"
            position={[-1.55, 1.4, 0.1]}
          >
            {hasBudgets ? "ACTIVE BUDGETS" : "SPENDING WITHOUT BUDGET"}
          </Text>

          {summary.budgeted.map((u, i) => {
            const y = 0.98 - i * 0.36;
            const col = ringColor(u.health);
            return (
              <group
                key={u.category}
                position={[0, y, 0.1]}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditor(u.category);
                }}
              >
                <mesh position={[-1.48, 0, 0]}>
                  <sphereGeometry args={[0.06, 12, 12]} />
                  <meshStandardMaterial color={col} emissive={col} emissiveIntensity={1.5} toneMapped={false} />
                </mesh>
                <Text
                  font={FONTS.headingMedium}
                  fontSize={0.155}
                  color={COLORS.white}
                  anchorX="left"
                  anchorY="middle"
                  position={[-1.3, 0, 0]}
                >
                  {u.category}
                </Text>
                <Text
                  font={FONTS.body}
                  fontSize={0.145}
                  color={col}
                  anchorX="right"
                  anchorY="middle"
                  position={[1.55, 0, 0]}
                >
                  {`${formatMoney(u.spent)} / ${formatMoney(u.limit)} (${Math.round(u.pct)}%)`}
                </Text>
              </group>
            );
          })}

          {summary.unbudgetedWithSpend.slice(0, 4).map((u, idx) => {
            const y = (hasBudgets ? 0.98 - summary.budgeted.length * 0.36 - 0.18 : 0.95) - idx * 0.38;
            return (
              <group
                key={u.category}
                position={[0, y, 0.1]}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditor(u.category);
                }}
              >
                <Text
                  font={FONTS.body}
                  fontSize={0.15}
                  color={COLORS.slate}
                  anchorX="left"
                  anchorY="middle"
                  position={[-1.55, 0, 0]}
                >
                  {`${u.category}: ${formatMoney(u.spent)}`}
                </Text>
                <Text
                  font={FONTS.headingMedium}
                  fontSize={0.14}
                  color={COLORS.cyan}
                  anchorX="right"
                  anchorY="middle"
                  position={[1.55, 0, 0]}
                >
                  Set budget →
                </Text>
              </group>
            );
          })}

          {!hasBudgets && summary.unbudgetedWithSpend.length === 0 && (
            <Text
              font={FONTS.body}
              fontSize={0.155}
              color={COLORS.slate}
              maxWidth={3.1}
              anchorX="left"
              anchorY="middle"
              position={[-1.55, 0.45, 0.1]}
            >
              Add expenses or click + Budget below to set your first category limit.
            </Text>
          )}

          <GlassPill
            label="+ Budget"
            position={[0, -1.35, 0.14]}
            width={1.75}
            height={0.44}
            fontSize={0.15}
            active
            accent={COLORS.emerald}
            onClick={() => openEditor(summary.unbudgetedCategories[0] ?? "Food")}
          />
        </GlassPanel>
      </group>

      {isCurrent && editorOpen && (
        <WorldHtml transform distanceFactor={4.4} position={[0, -0.05, 0.7]}>
          <form
            className="glass-mini-panel"
            onSubmit={onSaveBudget}
            noValidate
            onWheel={(e) => forwardWheel(e.deltaY)}
          >
            <div className="mini-panel-head">
              <strong>Set Category Budget</strong>
              <button
                type="button"
                className="icon-close-btn"
                aria-label="Close budget editor"
                onClick={() => setEditorOpen(false)}
              >
                ✕
              </button>
            </div>
            <label className="field">
              <span>Category</span>
              <select
                value={editingCat}
                onChange={(e) => {
                  const cat = e.target.value as Category;
                  setEditingCat(cat);
                  const found = summary.budgeted.find((b) => b.category === cat);
                  setDraftLimit(found ? String(found.limit) : "");
                }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Budget limit ({CURRENCY.symbol})</span>
              <input
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 500"
                value={draftLimit}
                onChange={(e) => setDraftLimit(e.target.value)}
                required
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <div className="mini-panel-actions">
              <button type="submit" className="submit-3d-btn is-compact" style={{ flex: 1 }}>
                Save Budget
              </button>
              {summary.budgeted.some((b) => b.category === editingCat) && (
                <button
                  type="button"
                  className="danger-3d-btn"
                  onClick={() => {
                    removeBudget(editingCat);
                    setEditorOpen(false);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </form>
        </WorldHtml>
      )}
    </StationGroup>
  );
}
