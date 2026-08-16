import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInSchema, signUpSchema } from "@data-room/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useRefreshSession } from "./use-session";

type Mode = "sign-in" | "sign-up";
type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

const NETWORK_ERROR = "Can't reach the server. Check your connection and retry.";

export function AuthForm({ mode }: { mode: Mode }) {
  const isSignUp = mode === "sign-up";
  const navigate = useNavigate();
  const location = useLocation();
  const refreshSession = useRefreshSession();

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  function set(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = isSignUp
      ? signUpSchema.safeParse(values)
      : signInSchema.safeParse({ email: values.email, password: values.password });

    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    const { error } = isSignUp
      ? await authClient.signUp.email({
          name: values.name,
          email: values.email,
          password: values.password,
        })
      : await authClient.signIn.email({
          email: values.email,
          password: values.password,
        });
    setPending(false);

    if (error) {
      setFormError(error.message ?? NETWORK_ERROR);
      return;
    }

    await refreshSession();
    navigate(from, { replace: true });
  }

  async function onGoogle() {
    setFormError(null);
    setPending(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${from}`,
    });
    if (error) {
      setPending(false);
      setFormError(error.message ?? NETWORK_ERROR);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      {isSignUp && (
        <Field
          id="name"
          label="Name"
          value={values.name}
          error={fieldErrors.name}
          onChange={(value) => set("name", value)}
        />
      )}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={values.email}
        error={fieldErrors.email}
        onChange={(value) => set("email", value)}
      />

      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        value={values.password}
        error={fieldErrors.password}
        onChange={(value) => set("password", value)}
      />

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={onGoogle}
      >
        Continue with Google
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
