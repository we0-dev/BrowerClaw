export interface ChatTagsProps {
  tags: string[];
  className?: string;
}

export function ChatTags({ tags, className = "" }: ChatTagsProps) {
  return (
    <div className={`flex items-center gap-3 text-xs text-zinc-400 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
