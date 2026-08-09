interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-border">
        <div
          className="h-2 rounded-full bg-accent transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
