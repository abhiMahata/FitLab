import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { checkForNewBadges, type Badge } from "@/lib/badgeUtils";

/**
 * Global badge checker — place in App.tsx.
 * Periodically checks for newly unlocked badges and shows a celebration popup.
 */
const BadgeNotifier = () => {
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  useEffect(() => {
    // Check immediately on mount
    const freshBadges = checkForNewBadges();
    if (freshBadges.length > 0) {
      showBadge(freshBadges, 0);
    }

    // Re-check every 5 seconds (picks up badges from other pages)
    const interval = setInterval(() => {
      const fresh = checkForNewBadges();
      if (fresh.length > 0) {
        showBadge(fresh, 0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const showBadge = (badges: Badge[], index: number) => {
    if (index >= badges.length) return;
    setNewBadge(badges[index]);

    // Auto-dismiss after 3.5s, then show next badge if any
    setTimeout(() => {
      setNewBadge(null);
      if (index + 1 < badges.length) {
        setTimeout(() => showBadge(badges, index + 1), 400);
      }
    }, 3500);
  };

  return (
    <AnimatePresence>
      {newBadge && (
        <motion.div
          key={newBadge.id}
          initial={{ opacity: 0, y: -80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-12 left-1/2 -translate-x-1/2 z-[150] pointer-events-none"
        >
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-card border border-primary/30 shadow-2xl shadow-primary/20 min-w-[260px]">
            {/* Animated emoji */}
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.2, damping: 10, stiffness: 400 }}
              className="text-4xl"
            >
              {newBadge.emoji}
            </motion.span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                Achievement Unlocked!
              </p>
              <p className="text-base font-bold text-foreground truncate">
                {newBadge.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {newBadge.description}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BadgeNotifier;
