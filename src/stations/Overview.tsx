import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useRef, useState } from "react";
import { Mesh } from "three";
import { GlassPanel } from "../components/GlassPanel";
import { GlassPill } from "../components/GlassPill";
import { COLORS } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatLongDate, formatMoney } from "../lib/format";
import type { Health } from "../lib/calc";
import { useOverview } from "../store/selectors";
import { useStore } from "../store/useStore";
import { flyTo } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

function healthColor(h: Health): string {
  if (h === "over") return COLORS.rose;
  if (h === "warn") return COLORS.amber;
  return COLORS.emerald;
}

interface MetricCardProps {
  title: string;
  targetValue: number;
  subtitle: string;
  health: Health;
  position: [number, number, number];
  rotation: [number, number, number];
  focusKey: string;
}

function MetricCard({
  title,
  targetValue,
  subtitle,
  health,
  position,
  rotation,
  focusKey
}: MetricCardProps): JSX.Element {
  const animatedVal = useRef(targetValue);
  const [displayVal, setDisplayVal] = useState(targetValue);
  const orbRef = useRef<Mesh>(null);
  const color = healthColor(health);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    easing.damp(animatedVal, "current", targetValue, 0.2, dt);
    if (Math.abs(animatedVal.current - targetValue) < 0.5) {
      animatedVal.current = targetValue;
      if (displayVal !== targetValue) setDisplayVal(targetValue);
    } else {
      const rounded = Math.round(animatedVal.current);
      if (rounded !== displayVal) setDisplayVal(rounded);
    }

    if (orbRef.current) {
      const speed = health === "over" ? 5 : health === "warn" ? 3 : 1.6;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * speed) * 0.12;
      orbRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <GlassPanel width={3.25} height={2.25} accent={color} focusKey={focusKey} interactive>
        <Text
          font={FONTS.headingMedium}
          fontSize={0.17}
          letterSpacing={0.07}
          color={COLORS.slate}
          anchorX="center"
          anchorY="middle"
          position={[0, 0.65, 0.1]}
        >
          {title.toUpperCase()}
        </Text>
        <Text
          font={FONTS.heading}
          fontSize={0.48}
          color={COLORS.white}
          anchorX="center"
          anchorY="middle"
          position={[0, 0.08, 0.11]}
        >
          {formatMoney(displayVal)}
        </Text>
        <Text
          font={FONTS.body}
          fontSize={0.145}
          color={color}
          maxWidth={2.9}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          position={[0, -0.56, 0.1]}
        >
          {subtitle}
        </Text>
      </GlassPanel>

      <mesh ref={orbRef} position={[0, -1.48, 0.1]}>
        <sphereGeometry args={[0.17, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          roughness={0.18}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function Overview(): JSX.Element {
  const overview = useOverview();
  const expenses = useStore((s) => s.expenses);
  const hasEntries = expenses.length > 0;

  const balanceSub =
    overview.netGoalTransfers > 0
      ? `Started ${formatMoney(overview.startingBalance)} · +${formatMoney(overview.incomeInPeriod)} · −${formatMoney(overview.spentInPeriod)} · goals ${formatMoney(overview.netGoalTransfers)}`
      : `Started with ${formatMoney(overview.startingBalance)} · income ${formatMoney(overview.incomeInPeriod)} · spent ${formatMoney(overview.spentInPeriod)}`;

  const spentSub =
    overview.expenseCountInPeriod > 0
      ? `${overview.expenseCountInPeriod} ${overview.expenseCountInPeriod === 1 ? "expense" : "expenses"} since ${formatLongDate(overview.periodStart)}`
      : `No expenses logged yet since ${formatLongDate(overview.periodStart)}`;

  const safeSub =
    overview.outOfMoney
      ? "Out of money for this period"
      : `${overview.daysLeft} ${overview.daysLeft === 1 ? "day" : "days"} left until ${formatLongDate(overview.periodEnd)}`;

  return (
    <StationGroup index={3}>
      <Text
        font={FONTS.heading}
        fontSize={0.38}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0]}
      >
        Overview
      </Text>
      <Text
        font={FONTS.body}
        fontSize={0.16}
        color={COLORS.slate}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.15, 0]}
      >
        {hasEntries
          ? "Computed live from your money setup and entries"
          : "No expenses yet — add your first entry to see live spending"}
      </Text>

      <MetricCard
        title="Current Balance"
        targetValue={overview.currentBalance}
        subtitle={balanceSub}
        health={overview.orbHealth}
        position={[-3.55, 0.15, 0.35]}
        rotation={[0, 0.2, 0]}
        focusKey="overview-balance"
      />

      <MetricCard
        title="Spent This Period"
        targetValue={overview.spentInPeriod}
        subtitle={spentSub}
        health={overview.orbHealth}
        position={[0, 0.2, 0]}
        rotation={[0, 0, 0]}
        focusKey="overview-spent"
      />

      <MetricCard
        title="Safe To Spend / Day"
        targetValue={overview.safeDailySpend}
        subtitle={safeSub}
        health={overview.orbHealth}
        position={[3.55, 0.15, 0.35]}
        rotation={[0, -0.2, 0]}
        focusKey="overview-safe"
      />

      {!hasEntries && (
        <GlassPill
          label="+ Add your first expense →"
          position={[0, -1.95, 0.5]}
          width={2.8}
          height={0.5}
          fontSize={0.16}
          active
          accent={COLORS.emerald}
          onClick={() => flyTo(2)}
        />
      )}
    </StationGroup>
  );
}
