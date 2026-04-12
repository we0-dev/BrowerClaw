import type { AssistantStepItem } from "./types";

export interface AssistantStepProps {
  step: AssistantStepItem;
  className?: string;
}

export function AssistantStep({ step, className = "" }: AssistantStepProps) {
  return (
    <div className={`text-sm text-zinc-700 leading-6 ${className}`}>
      {step.text}
      {step.subtitle && (
        <div className="text-xs text-zinc-400 mt-2">{step.subtitle}</div>
      )}
    </div>
  );
}
