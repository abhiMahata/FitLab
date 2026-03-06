import { Plus } from "lucide-react";

interface FoodItemProps {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onAdd?: () => void;
}

const FoodItem = ({ name, calories, protein, carbs, fat, onAdd }: FoodItemProps) => {
  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-foreground">{name}</h3>
        <div className="flex gap-2 mt-2">
          <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-medium">
            {protein}g P
          </span>
          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
            {carbs}g C
          </span>
          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
            {fat}g F
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-foreground font-semibold">{calories} kcal</span>
        <button
          onClick={onAdd}
          className="w-10 h-10 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default FoodItem;
