import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { ChevronUp, Dumbbell, Flame, Camera, Moon, User, ChevronRight } from "lucide-react";
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

const BottomMenu = ({ isOpen, onToggle }: BottomMenuProps) => {
  const navigate = useNavigate();
  const dragControls = useDragControls();

  const handleNavigate = (path: string) => {
    navigate(path);
    onToggle();
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Bottom Bar / Menu */}
      <motion.div
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y < -50 && !isOpen) onToggle();
          if (info.offset.y > 50 && isOpen) onToggle();
        }}
        animate={{
          y: isOpen ? 0 : "calc(100% - 80px)",
        }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="bg-card/95 backdrop-blur-xl rounded-t-3xl border-t border-border/50 min-h-[80vh] shadow-2xl">
          {/* Handle */}
          <div
            className="flex flex-col items-center py-4 cursor-grab active:cursor-grabbing"
            onClick={onToggle}
          >
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-2" />
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronUp className="w-6 h-6 text-primary" />
            </motion.div>
            <span className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
              {isOpen ? "Swipe down to close" : "Swipe for tools"}
            </span>
          </div>

          {/* Menu Content */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="px-4 pb-8"
              >
                <h2 className="text-center text-lg font-semibold text-foreground mb-6 uppercase tracking-wider">
                  Menu
                </h2>

                {/* Feature Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {menuItems.map((item, index) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05, type: "spring" }}
                      onClick={() => handleNavigate(item.path)}
                      className="glass-card p-5 text-left relative overflow-hidden group hover:border-primary/50 transition-colors"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.iconBg} mb-16`}
                      >
                        <item.icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      {item.badge && (
                        <span className="absolute top-5 right-14 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                          {item.badge}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {item.category}
                      </p>
                      <p className="text-lg font-semibold text-foreground">
                        {item.title}
                      </p>
                    </motion.button>
                  ))}
                </div>

                {/* Profile Section */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => handleNavigate("/profile")}
                  className="w-full glass-card p-4 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fitlab-orange to-fitlab-yellow flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground">Profile & Settings</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default BottomMenu;
