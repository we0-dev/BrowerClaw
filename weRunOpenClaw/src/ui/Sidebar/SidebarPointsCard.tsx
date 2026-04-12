import type { PointsCardProps } from "./types";

export function SidebarPointsCard({
  title,
  subtitle,
  icon = "◎",
}: PointsCardProps) {
  return (
    <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/20 flex items-center justify-center">
          <span className="text-indigo-700 font-semibold">{icon}</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-zinc-900">{title}</div>
          <div className="text-xs text-zinc-400 mt-1">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}
