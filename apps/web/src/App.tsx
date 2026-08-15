import { useQuery } from "@tanstack/react-query";
import type { Health } from "@data-room/shared";
import { Button } from "@/components/ui/button";

const API_URL = import.meta.env.VITE_API_URL;

async function fetchHealth(): Promise<Health> {
  const res = await fetch(`${API_URL}/health`, { credentials: "include" });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export default function App() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Data Room</h1>
      <p className="text-sm text-neutral-500">
        {isLoading && "Checking API..."}
        {isError && "API unreachable"}
        {data && `API says: ${data.status} (${data.service})`}
      </p>
      <Button onClick={() => refetch()}>Recheck</Button>
    </main>
  );
}
