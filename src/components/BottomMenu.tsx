import { useRef, useEffect, useCallback, useState } from "react";
import { Dumbbell, Flame, Camera, Moon, User, ChevronRight, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BottomMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    id: "workout",
    category: "PLAN",
    title: "Workout Roster",
    icon: Dumbbell,
    iconBg: "bg-primary",
    path: "/workout-roster",
  },
  {
    id: "calorie",
    category: "LOG",
    title: "Calorie Tracker",
    icon: Flame,
    iconBg: "bg-fitlab-orange",
    path: "/calorie-tracker",
  },
  {
    id: "ai-form",
    category: "ANALYZE",
    title: "AI Form Checker",
    icon: Camera,
    iconBg: "bg-fitlab-blue",
    path: "/ai-form-checker",
    badge: "NEW",
  },
  {
    id: "sleep",
    category: "RECOVER",
    title: "Sleep Tracker",
    icon: Moon,
    iconBg: "bg-fitlab-purple",
    path: "/sleep-tracker",
  },
];

// ─── Constants ────────────────────────────────────────────────────────
const HANDLE_HEIGHT = 72;       // height of the grab bar area
const SHEET_HEIGHT_VH = 65;     // % of viewport the sheet content occupies
const SNAP_THRESHOLD = 80;      // px drag to trigger open/close
const SPRING_TENSION = 0.15;    // animation speed (0-1, lower = smoother)

const BottomMenu = ({ isOpen, onToggle }: BottomMenuProps) => {
  const navigate = useNavigate();
  const sheetRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const currentTranslateY = useRef(0);
  const animationRef = useRef<number>(0);
  const [sheetHeight, setSheetHeight] = useState(0);

  // Calculate full sheet height on mount
  useEffect(() => {
    const h = (window.innerHeight * SHEET_HEIGHT_VH) / 100 + HANDLE_HEIGHT;
    setSheetHeight(h);
  }, []);

  // The collapsed position: only show the handle bar
  const collapsedY = sheetHeight - HANDLE_HEIGHT;

  // Animate to target position using spring-like easing
  const animateTo = useCallback((targetY: number, onDone?: () => void) => {
    const animate = () => {
      const diff = targetY - currentTranslateY.current;
      if (Math.abs(diff) < 0.5) {
        currentTranslateY.current = targetY;
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(${targetY}px)`;
        }
        onDone?.();
        return;
      }
      currentTranslateY.current += diff * SPRING_TENSION;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${currentTranslateY.current}px)`;
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, []);

  // Snap to open or collapsed when isOpen changes
  useEffect(() => {
    if (sheetHeight === 0) return;
    const target = isOpen ? 0 : collapsedY;
    animateTo(target);
  }, [isOpen, sheetHeight, collapsedY, animateTo]);

  // ── Touch handlers ─────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY - currentTranslateY.current;
    cancelAnimationFrame(animationRef.current);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const y = e.touches[0].clientY - dragStartY.current;
    // Clamp: can't drag above fully open (0) or below collapsed
    const clamped = Math.max(0, Math.min(y, collapsedY + 20));
    currentTranslateY.current = clamped;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${clamped}px)`;
    }
  }, [collapsedY]);

  const onTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const currentY = currentTranslateY.current;
    const midpoint = collapsedY / 2;

    if (isOpen) {
      // If open and dragged down enough → close
      if (currentY > SNAP_THRESHOLD) {
        onToggle();
      } else {
        animateTo(0);
      }
    } else {
      // If closed and dragged up enough → open
      if (currentY < collapsedY - SNAP_THRESHOLD) {
        onToggle();
      } else {
        animateTo(collapsedY);
      }
    }
  }, [isOpen, collapsedY, animateTo, onToggle]);

  // ── Mouse handlers (for desktop testing) ────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartY.current = e.clientY - currentTranslateY.current;
    cancelAnimationFrame(animationRef.current);

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const y = ev.clientY - dragStartY.current;
      const clamped = Math.max(0, Math.min(y, collapsedY + 20));
      currentTranslateY.current = clamped;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${clamped}px)`;
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      const currentY = currentTranslateY.current;
      if (isOpen) {
        if (currentY > SNAP_THRESHOLD) {
          onToggle();
        } else {
          animateTo(0);
        }
      } else {
        if (currentY < collapsedY - SNAP_THRESHOLD) {
          onToggle();
        } else {
          animateTo(collapsedY);
        }
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [isOpen, collapsedY, animateTo, onToggle]);

  const handleNavigate = (path: string) => {
    navigate(path);
    onToggle();
  };

  // Content opacity based on position
  const contentOpacity = sheetHeight > 0
    ? Math.max(0, 1 - (currentTranslateY.current / collapsedY))
    : 0;

  return (
    <>
      {/* Overlay — opacity tracks sheet position */}
      <div
        className="fixed inset-0 bg-black z-40 transition-opacity duration-150"
        style={{
          opacity: isOpen ? 0.7 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onToggle}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 gpu"
        style={{
          height: `${sheetHeight}px`,
          transform: `translateY(${sheetHeight - HANDLE_HEIGHT}px)`,
          touchAction: "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="h-full bg-card rounded-t-2xl border-t border-border shadow-[0_-4px_30px_rgba(0,0,0,0.5)] flex flex-col">

          {/* ── Handle Bar ── */}
          <div
            className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
            onMouseDown={onMouseDown}
            onClick={() => { if (!isDragging.current) onToggle(); }}
          >
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mb-2" />
            <ChevronUp
              className="w-5 h-5 text-primary transition-transform duration-300"
              style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mt-0.5">
              {isOpen ? "Drag to close" : "Menu"}
            </span>
          </div>

          {/* ── Menu Content (always rendered, opacity controlled) ── */}
          <div
            className="flex-1 px-5 pb-8 overflow-hidden"
            style={{ opacity: isOpen ? 1 : 0, transition: "opacity 0.15s ease" }}
          >
            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.path)}
                  className="solid-card p-4 text-left relative overflow-hidden group active:scale-[0.97] transition-transform"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.iconBg} mb-8`}
                  >
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  {item.badge && (
                    <span className="absolute top-4 right-4 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold">
                      {item.badge}
                    </span>
                  )}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] mb-0.5">
                    {item.category}
                  </p>
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {item.title}
                  </p>
                </button>
              ))}
            </div>

            {/* Profile Row */}
            <button
              onClick={() => handleNavigate("/profile")}
              className="w-full solid-card p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left text-sm font-semibold text-foreground">
                Profile & Settings
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BottomMenu;
