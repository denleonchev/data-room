import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/features/auth/use-session";
import { AppHeader } from "./app-header";
import { LandingPage } from "./landing-page";

export function ProtectedLayout() {
  const { user, isPending } = useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  // The root has to stay a public page that names the app and says what it does —
  // Google's OAuth branding review checks exactly that before allowing sign-in.
  if (!user) {
    return location.pathname === "/" ? (
      <LandingPage />
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl p-6">
        <Outlet context={user} />
      </main>
    </div>
  );
}
