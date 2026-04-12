export interface SidebarBrandProps {
  letter?: string;
  name: string;
  className?: string;
}

export function SidebarBrand({ letter = "W", name, className = "" }: SidebarBrandProps) {
  return (
    <div className={`px-4 pt-4 pb-2 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 overflow-hidden rounded-xl shadow-sm ring-1 ring-zinc-200 bg-zinc-900 flex items-center justify-center">
          <img
            src="/favicon.png"
            alt="BrowserClaw icon"
            className="h-full w-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLSpanElement | null;
              if (fallback) fallback.style.display = "inline";
            }}
          />
          <span className="hidden text-white font-bold text-lg leading-none">{letter}</span>
        </div>
        <div className="font-bold text-zinc-900 tracking-tight text-[15px]">{name}</div>
      </div>
    </div>
  );
}
