import { useOutletContext } from "react-router-dom";
import type { SessionUser } from "@data-room/shared";

export function DataRoomPage() {
  const user = useOutletContext<SessionUser>();

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Your Data Room</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {user.email}. Folders and files arrive in the next slice.
      </p>
    </div>
  );
}
