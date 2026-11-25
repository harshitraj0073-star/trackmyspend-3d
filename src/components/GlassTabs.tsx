import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface GlassTabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface GlassTabsProps {
  tabs: GlassTabItem[];
  defaultTab?: string;
  /** Optional controlled active tab id (e.g. synced with 3D scroll progress). */
  activeTab?: string;
  onChange?: (id: string) => void;
  layoutId?: string;
  ariaLabel?: string;
  className?: string;
}

export function GlassTabs({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onChange,
  layoutId = "glass-tab-pill",
  ariaLabel = "Navigation tabs",
  className = ""
}: GlassTabsProps): JSX.Element {
  const [internalTab, setInternalTab] = useState<string>(
    defaultTab ?? tabs[0]?.id ?? ""
  );
  const activeId = controlledTab ?? internalTab;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectTab = (id: string): void => {
    if (controlledTab === undefined) {
      setInternalTab(id);
    }
    onChange?.(id);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number): void => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const nextIdx = (idx + dir + tabs.length) % tabs.length;
    const nextTab = tabs[nextIdx];
    if (!nextTab) return;
    tabRefs.current[nextIdx]?.focus();
    selectTab(nextTab.id);
  };

  const activeItem = tabs.find((t) => t.id === activeId);
  const hasContent = Boolean(activeItem?.content);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex items-center gap-0.5 overflow-x-auto max-w-[calc(100vw-24px)] rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_18px_50px_rgba(0,0,0,0.45)] p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled || undefined}
              aria-label={tab.ariaLabel ?? tab.label}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`relative flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap cursor-pointer select-none border-0 bg-transparent ${
                isActive
                  ? "text-white font-medium"
                  : "text-white/60 hover:text-white/90 transition-colors"
              } ${tab.disabled ? "opacity-50" : ""}`}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-white/15 backdrop-blur-md border border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]"
                  aria-hidden="true"
                />
              )}
              {tab.icon && <span className="relative z-10 flex items-center">{tab.icon}</span>}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {hasContent && (
        <div className="mt-3 w-full rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem?.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeItem?.content}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
