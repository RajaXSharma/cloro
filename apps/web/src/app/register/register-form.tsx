"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LoaderCircle } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { FormError, TextField } from "@/components/ui/field";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Mirrors the backend's zod schema: name >= 3, password >= 6. */
const NAME_MIN = 3;
const PASSWORD_MIN = 6;

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"register" | "signin" | null>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending("register");
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        setError(res.status === 409 ? "email already registered" : "invalid fields");
        setPending(null);
        return;
      }
      setPending("signin");
      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        setError("sign-in failed, try logging in");
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

  return (
    <AuthShell
      title="Create an account"
      subtitle="Your projects, files and collaborators are tied to this account."
      footer={
        <>
          Have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={NAME_MIN}
          hint={`At least ${NAME_MIN} characters.`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          hint={`At least ${PASSWORD_MIN} characters.`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <FormError>{error}</FormError>}
        <Button
          type="submit"
          className="h-9 w-full"
          disabled={pending !== null}
          aria-busy={pending !== null}
        >
          {pending !== null && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending === "register"
            ? "Creating account…"
            : pending === "signin"
              ? "Signing in…"
              : "Register"}
        </Button>
      </form>
    </AuthShell>
  );
}
