import { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";

interface StatCardProps {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subValue?: string;
  progress?: number;
  progressColor?: string;
}

const StatCard = ({
  icon,
  iconBg,
  label,
  value,
  subValue,
  progress,
  progressColor = "bg-primary",
}: StatCardProps) => {
  return (
    <div className="glass-card p-4 flex items-center gap-4">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-bold text-foreground">
          {value}
          {subValue && (
            <span className="text-muted-foreground text-base font-normal">
              {" "}
              {subValue}
            </span>
          )}
        </p>
      </div>
      {progress !== undefined && (
        <div className="w-24">
          <Progress
            value={progress}
            className="h-2 bg-muted"
            indicatorClassName={progressColor}
          />
        </div>
      )}
    </div>
  );
};

export default StatCard;
