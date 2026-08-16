import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Bonadev Data Room</h1>
        <p className="text-muted-foreground">
          Bonadev Data Room is a virtual data room for due diligence: a private place to
          keep the documents a deal depends on. Upload PDFs, organise them into
          nested folders, and rename, move or delete them as the deal moves.
        </p>
        <p className="text-muted-foreground">
          Everything you upload stays private to your account until you decide
          otherwise. When you need to let someone in, share the whole room, a
          single folder or one file — either through a link that anyone can open
          or with named people only, and revoke that access at any time.
        </p>
        <p className="text-muted-foreground">
          Signing in — with an email and password, or with Google — gives Data
          Room your name, email address and, from Google, your profile picture.
          They identify your account and label the things you share; nothing else
          is requested from Google, and nothing is passed on to anyone else.
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link to="/signup">Create account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        <a href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </a>{" "}
        ·{" "}
        <a href="/terms" className="underline underline-offset-4">
          Terms of Service
        </a>
      </p>
    </main>
  );
}
