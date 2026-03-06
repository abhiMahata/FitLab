import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExerciseCardProps {
  name: string;
  category: string;
  icon: LucideIcon;
  isSelected?: boolean;
  isDashed?: boolean;
  onClick?: () => void;
}

const ExerciseCard = ({
  name,
  category,
  icon: Icon,
  isSelected = false,
  isDashed = false,
  onClick,
}: ExerciseCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl flex flex-col items-start transition-all",
        isDashed
          ? "border-2 border-dashed border-muted-foreground/30 bg-transparent hover:border-primary/50"
          : "glass-card hover:border-primary/50",
        isSelected && "border-primary bg-primary/10"
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
          isSelected ? "bg-primary" : "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "w-6 h-6",
            isSelected ? "text-primary-foreground" : "text-muted-foreground"
          )}
        />
      </div>
      <h3 className="font-bold text-foreground text-lg">{name}</h3>
      <p className="text-sm text-muted-foreground uppercase tracking-wider">
        {category}
      </p>
    </button>
  );
};

export default ExerciseCard;
