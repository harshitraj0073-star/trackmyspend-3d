import { Line, RoundedBox, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Vector3 } from "three";
import { GlassPanel } from "../components/GlassPanel";
import { GlassPill } from "../components/GlassPill";
import { Tooltip3D } from "../components/Tooltip3D";
import { CATEGORY_META, COLORS } from "../lib/constants";
import { FONTS } from "../lib/fonts";
import { formatMoney } from "../lib/format";
import type { DonutSlice, Range, SeriesBar } from "../lib/calc";
import { useAnalytics } from "../store/selectors";
import { flyTo } from "../world/navigation";
import { StationGroup } from "../world/StationGroup";

const RANGES: Array<{ id: Range; label: string }> = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "semester", label: "Semester" }
];

const CHART_WIDTH = 4.4;
const MAX_BAR_HEIGHT = 2.15;
const BASE_Y = -1.35;

interface BarItemProps {
  bar: SeriesBar;
  x: number;
  width: number;
  targetHeight: number;
  showLabel: boolean;
  onHover: (bar: SeriesBar | null, x: number, h: number) => void;
}

function BarItem({ bar, x, width, targetHeight, showLabel, onHover }: BarItemProps): JSX.Element {
  const barGroupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const isZero = bar.value <= 0;
  const targetH = isZero ? 0.04 : Math.max(0.1, targetHeight);
  const currentH = useRef(targetH);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    easing.damp(currentH, "current", targetH, 0.18, dt);
    if (barGroupRef.current) {
      barGroupRef.current.scale.y = currentH.current;
      barGroupRef.current.position.y = BASE_Y + currentH.current * 0.5;
      easing.damp(barGroupRef.current.scale, "x", hovered ? 1.15 : 1, 0.15, dt);
    }
  });

  return (
    <group position={[x, 0, 0]}>
      <group
        ref={barGroupRef}
        position={[0, BASE_Y + targetH * 0.5, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHover(bar, x, targetH);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null, x, targetH);
        }}
      >
        <RoundedBox args={[width, 1, width]} radius={Math.min(0.04, width * 0.25)} smoothness={3}>
          <meshStandardMaterial
            color={isZero ? "#1e293b" : hovered ? COLORS.cyan : COLORS.emerald}
            emissive={isZero ? "#0f172a" : hovered ? COLORS.cyan : COLORS.emerald}
            emissiveIntensity={isZero ? 0.1 : hovered ? 2.0 : 1.0}
            roughness={0.22}
            metalness={0.2}
            toneMapped={false}
          />
        </RoundedBox>
      </group>
      {showLabel && (
        <Text
          font={FONTS.body}
          fontSize={0.135}
          color={COLORS.slate}
          anchorX="center"
          anchorY="top"
          position={[0, BASE_Y - 0.14, 0.08]}
        >
          {bar.label}
        </Text>
      )}
    </group>
  );
}

export default function Analytics(): JSX.Element {
  const [range, setRange] = useState<Range>("week");
  const analytics = useAnalytics(range);

  const [hoveredBar, setHoveredBar] = useState<{ bar: SeriesBar; x: number; h: number } | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);

  const maxVal = useMemo(
    () => Math.max(1, ...analytics.bars.map((b) => b.value)),
    [analytics.bars]
  );

  const barStep = CHART_WIDTH / Math.max(1, analytics.bars.length);
  const barWidth = Math.min(0.36, barStep * 0.65);

  // 7-day moving average line plotted on the EXACT same vertical scale as the bars
  const trendPoints = useMemo(() => {
    if (!analytics.hasData) return [];
    return analytics.movingAverage.map((avg, idx) => {
      const x = -CHART_WIDTH * 0.5 + barStep * (idx + 0.5);
      const h = (avg / maxVal) * MAX_BAR_HEIGHT;
      return new Vector3(x, BASE_Y + Math.max(0.06, h) + 0.06, 0.24);
    });
  }, [analytics.hasData, analytics.movingAverage, maxVal, barStep]);

  const donutSegments = useMemo(() => {
    let cursor = Math.PI / 2;
    return analytics.donut.map((slice) => {
      const sweep = slice.share * Math.PI * 2;
      const gap = analytics.donut.length > 1 ? 0.035 : 0;
      const seg = {
        ...slice,
        startAngle: cursor,
        arc: Math.max(0.03, sweep - gap),
        color: CATEGORY_META[slice.category].color
      };
      cursor += sweep;
      return seg;
    });
  }, [analytics.donut]);

  return (
    <StationGroup index={5}>
      <Text
        font={FONTS.heading}
        fontSize={0.38}
        color={COLORS.white}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.55, 0]}
      >
        Analytics
      </Text>

      {/* Week / Month / Semester 3D Pill Toggles */}
      <group position={[0, 2.02, 0]}>
        {RANGES.map((r, i) => (
          <GlassPill
            key={r.id}
            label={r.label}
            position={[(i - 1) * 1.75, 0, 0]}
            width={1.55}
            height={0.44}
            fontSize={0.155}
            active={range === r.id}
            accent={COLORS.cyan}
            onClick={() => setRange(r.id)}
          />
        ))}
      </group>

      {!analytics.hasData ? (
        <group position={[0, -0.15, 0]}>
          <GlassPanel width={5.8} height={2.8} accent={COLORS.cyan}>
            <Text
              font={FONTS.headingMedium}
              fontSize={0.24}
              color={COLORS.white}
              anchorX="center"
              anchorY="middle"
              position={[0, 0.42, 0.1]}
            >
              No expenses in this window yet
            </Text>
            <Text
              font={FONTS.body}
              fontSize={0.16}
              color={COLORS.slate}
              anchorX="center"
              anchorY="middle"
              position={[0, -0.04, 0.1]}
            >
              {`Window: ${analytics.window.start} to ${analytics.window.end}`}
            </Text>
            <GlassPill
              label="+ Add an expense →"
              position={[0, -0.72, 0.14]}
              width={2.4}
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
          {/* Left: 3D Bar Chart + 7-Day Moving Average Line */}
          <group position={[-2.0, 0.1, 0]}>
            {analytics.bars.map((bar, idx) => {
              const x = -CHART_WIDTH * 0.5 + barStep * (idx + 0.5);
              const h = (bar.value / maxVal) * MAX_BAR_HEIGHT;
              const stride = range === "month" ? 5 : range === "semester" ? 4 : 1;
              return (
                <BarItem
                  key={bar.key}
                  bar={bar}
                  x={x}
                  width={barWidth}
                  targetHeight={h}
                  showLabel={idx % stride === 0}
                  onHover={(b, hx, hh) => setHoveredBar(b ? { bar: b, x: hx, h: hh } : null)}
                />
              );
            })}

            {trendPoints.length >= 2 && (
              <Line points={trendPoints} color={COLORS.cyan} lineWidth={2.5} />
            )}

            <Tooltip3D
              visible={Boolean(hoveredBar)}
              title={
                hoveredBar
                  ? `${hoveredBar.bar.startDate}: ${formatMoney(hoveredBar.bar.value)}`
                  : ""
              }
              accent={COLORS.cyan}
              position={
                hoveredBar
                  ? [hoveredBar.x, BASE_Y + Math.max(0.45, hoveredBar.h) + 0.55, 0.35]
                  : [0, 1.0, 0.35]
              }
            />
          </group>

          {/* Right: 3D Donut Chart + Exact 100%-Sum Legend */}
          <group position={[2.2, 0.05, 0]}>
            <group position={[-0.35, 0.1, 0]}>
              {donutSegments.map((seg) => (
                <mesh
                  key={seg.category}
                  rotation={[0, 0, seg.startAngle]}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredSlice(seg);
                  }}
                  onPointerOut={() => setHoveredSlice(null)}
                >
                  <torusGeometry args={[0.92, 0.19, 20, 64, seg.arc]} />
                  <meshStandardMaterial
                    color={seg.color}
                    emissive={seg.color}
                    emissiveIntensity={hoveredSlice?.category === seg.category ? 2.0 : 1.15}
                    roughness={0.22}
                    metalness={0.2}
                    toneMapped={false}
                  />
                </mesh>
              ))}
              <Text
                font={FONTS.heading}
                fontSize={0.22}
                color={COLORS.white}
                anchorX="center"
                anchorY="middle"
                position={[0, 0.08, 0.1]}
              >
                {formatMoney(analytics.totalSpent)}
              </Text>
              <Text
                font={FONTS.body}
                fontSize={0.135}
                color={COLORS.slate}
                anchorX="center"
                anchorY="middle"
                position={[0, -0.18, 0.1]}
              >
                {range.toUpperCase()}
              </Text>
              <Tooltip3D
                visible={Boolean(hoveredSlice)}
                title={
                  hoveredSlice
                    ? `${hoveredSlice.category}: ${formatMoney(hoveredSlice.value)}`
                    : ""
                }
                subtitle={hoveredSlice ? `${hoveredSlice.pct.toFixed(2)}% of window` : undefined}
                accent={hoveredSlice ? CATEGORY_META[hoveredSlice.category].color : COLORS.cyan}
                position={[0, 1.35, 0.35]}
              />
            </group>

            {/* Category Legend — readable >=14px equivalent, no overlap */}
            <group position={[1.05, 0.9, 0]}>
              {analytics.donut.map((slice, idx) => (
                <group key={slice.category} position={[0, -idx * 0.34, 0]}>
                  <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[0.13, 0.13, 0.13]} />
                    <meshStandardMaterial
                      color={CATEGORY_META[slice.category].color}
                      emissive={CATEGORY_META[slice.category].color}
                      emissiveIntensity={1.4}
                      toneMapped={false}
                    />
                  </mesh>
                  <Text
                    font={FONTS.body}
                    fontSize={0.15}
                    color={COLORS.white}
                    anchorX="left"
                    anchorY="middle"
                    position={[0.18, 0, 0]}
                  >
                    {`${slice.category} ${slice.pct.toFixed(2)}%`}
                  </Text>
                </group>
              ))}
            </group>
          </group>
        </>
      )}
    </StationGroup>
  );
}
