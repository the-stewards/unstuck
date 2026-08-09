interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between font-heading text-base font-bold uppercase tracking-wide text-muted-light">
          <span>{label}</span>
          <span className="text-accent">{clamped}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-border">
        <div
          className="h-2 bg-accent transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
