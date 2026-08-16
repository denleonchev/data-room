import { Link, Navigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthForm } from "@/features/auth/auth-form";
import { useSession } from "@/features/auth/use-session";

export function AuthPage({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const { user, isPending } = useSession();
  const location = useLocation();

  if (isPending) return null;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/";
    return <Navigate to={from} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create your account" : "Sign in"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Your Data Room is private until you share it."
              : "Welcome back to your Data Room."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuthForm mode={mode} />
          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account? " : "No account yet? "}
            <Link
              to={isSignUp ? "/login" : "/signup"}
              state={location.state}
              className="underline underline-offset-4"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
