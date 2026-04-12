import type { UserCardProps } from "./types";

export function SidebarUserCard({ avatar, name, subtitle }: UserCardProps) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-xl bg-zinc-900 text-white px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
          <span className="text-sm font-semibold">{avatar}</span>
        </div>
        <div className="text-sm font-medium">{name}</div>
      </div>
      {subtitle ? (
        <span className="text-xs text-white/70">{subtitle}</span>
      ) : (
        <span className="text-xs text-white/70"> </span>
      )}
    </div>
  );
}
