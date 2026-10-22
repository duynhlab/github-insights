import { Check } from "lucide-react";

export function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="inline-flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
        <Check className="size-6" />
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
