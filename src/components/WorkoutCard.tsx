import { Dumbbell, GripVertical } from "lucide-react";

interface WorkoutCardProps {
  name: string;
  sets: number;
  reps: number;
  focus: string;
  hasAI?: boolean;
}

const WorkoutCard = ({ name, sets, reps, focus, hasAI = false }: WorkoutCardProps) => {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
        <Dumbbell className="w-7 h-7 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground text-lg">{name}</h3>
          {hasAI && (
            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded font-medium">
              AI
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {sets} sets × {reps} reps
        </p>
        <p className="text-primary text-sm font-medium">{focus}</p>
      </div>
      <button className="p-2 rounded-lg hover:bg-muted transition-colors">
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
};

export default WorkoutCard;
