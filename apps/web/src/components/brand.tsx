import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img src="/logo.png" alt="" className="size-7" />
      <span className="font-semibold">Bonadev Data Room</span>
    </span>
  );
}
