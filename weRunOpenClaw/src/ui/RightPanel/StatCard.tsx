export interface StatCardProps {
  label: string;
  value: string;
  className?: string;
}

export function StatCard({ label, value, className = "" }: StatCardProps) {
  return (
    <div
      className={`rounded-xl bg-white ring-1 ring-zinc-200 p-3 ${className}`}
    >
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}
