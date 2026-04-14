interface CharacterCountProps {
  current: number;
  max: number;
}

export function CharacterCount({ current, max }: CharacterCountProps) {
  const remaining = max - current;
  const isWarning = remaining < 20;
  const isOver = remaining < 0;

  return (
    <span className={`text-[10px] ${isOver ? "text-destructive" : isWarning ? "text-orange-500" : "text-muted-foreground"}`}>
      {current}/{max}
    </span>
  );
}
