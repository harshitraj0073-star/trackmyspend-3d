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
    <div className={`glass-tabs-root ${className}`}>
      <div role="tablist" aria-label={ariaLabel} className="glass-tabs-track">
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
              className={`glass-tab-btn${isActive ? " is-active" : ""}${
                tab.disabled ? " is-locked" : ""
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId={layoutId}
                  transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.85 }}
                  className="glass-tab-lens"
                  aria-hidden="true"
                />
              )}
              {tab.icon && <span className="glass-tab-icon">{tab.icon}</span>}
              <span className="glass-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {hasContent && (
        <div className="glass-tabs-panel">
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
