"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth/auth-shell";
import { GitHubMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FormError, TextField } from "@/components/ui/field";

export function LoginForm({ showGithub }: { showGithub: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("invalid credentials");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          >
            <GitHubMark className="size-4" />
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
        <Button type="submit" className="h-9 w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
