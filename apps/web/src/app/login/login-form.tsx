"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LoaderCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { GitHubMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FormError, TextField } from "@/components/ui/field";

export function LoginForm({ showGithub }: { showGithub: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"github" | "credentials" | null>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending("credentials");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("invalid credentials");
        setPending(null);
        return;
      }
      // keep the button busy: navigation to /dashboard is still in flight
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("something went wrong, try again");
      setPending(null);
    }
  }

  function handleGithub() {
    setError("");
    setPending("github");
    void signIn("github", { callbackUrl: "/dashboard" }).catch(() => {
      setError("something went wrong, try again");
      setPending(null);
    });
  }

  return (
    <AuthShell
      title="Sign in to Cloro"
      subtitle="Use GitHub, or the email and password on your account."
      footer={
        <>
          No account?{" "}
          <Link href="/register" className="text-foreground underline underline-offset-4">
            Register
          </Link>
        </>
      }
    >
      {showGithub && (
        <div className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full"
            disabled={pending !== null}
            aria-busy={pending === "github"}
            onClick={handleGithub}
          >
            {pending === "github" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <GitHubMark className="size-4" />
            )}
            Continue with GitHub
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <FormError>{error}</FormError>}
        <Button
          type="submit"
          className="h-9 w-full"
          disabled={pending !== null}
          aria-busy={pending === "credentials"}
        >
          {pending === "credentials" && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          {pending === "credentials" ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
