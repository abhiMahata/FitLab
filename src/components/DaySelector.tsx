import { cn } from "@/lib/utils";

interface Day {
  day: string;
  date: number;
  isActive?: boolean;
  hasWorkout?: boolean;
}

interface DaySelectorProps {
  days: Day[];
  onSelect: (index: number) => void;
}

const DaySelector = ({ days, onSelect }: DaySelectorProps) => {
  return (
    <div className="flex justify-between gap-2">
      {days.map((day, index) => (
        <button
          key={day.day}
          onClick={() => onSelect(index)}
          className={cn(
            "flex-1 py-3 px-2 rounded-2xl flex flex-col items-center transition-all",
            day.isActive
              ? "bg-primary text-primary-foreground"
              : "bg-card hover:bg-muted"
          )}
        >
          <span className="text-xs uppercase font-medium opacity-80">
            {day.day}
          </span>
          <span className="text-lg font-bold">{day.date}</span>
          {day.hasWorkout && !day.isActive && (
            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1" />
          )}
          {day.hasWorkout && day.isActive && (
            <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full mt-1" />
          )}
        </button>
      ))}
    </div>
  );
};

export default DaySelector;
