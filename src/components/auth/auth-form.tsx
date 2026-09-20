"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth/client";

type AuthFormProps = { mode: "sign-in" | "sign-up" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result = isSignUp
      ? await authClient.signUp.email({
          email,
          password,
          name: String(form.get("name") ?? ""),
        })
      : await authClient.signIn.email({ email, password });

    setPending(false);
    if (result.error) {
      setMessage(result.error.message ?? "Unable to continue. Check your details and try again.");
      return;
    }

    if (isSignUp) {
      router.push("/sign-in?created=1");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="auth-screen">
      <Link className="auth-brand" href="/">AuthFlow</Link>
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="eyebrow">Owner workspace</p>
        <h1 id="auth-title">{isSignUp ? "Create your workspace" : "Welcome back"}</h1>
        <p>{isSignUp ? "Start building a secure authentication experience." : "Sign in to manage your authentication projects."}</p>
        <form onSubmit={submit}>
          {isSignUp ? (
            <label>
              Full name
              <input name="name" autoComplete="name" required maxLength={100} />
            </label>
          ) : null}
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={12}
              maxLength={128}
              required
              aria-describedby={isSignUp ? "password-help" : undefined}
            />
          </label>
          {isSignUp ? <small id="password-help">Use at least 12 characters.</small> : null}
          {message ? <p className="form-error" role="alert">{message}</p> : null}
          <button className="button primary auth-submit" type="submit" disabled={pending}>
            {pending ? "Please wait…" : isSignUp ? "Create workspace" : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          {isSignUp ? "Already have a workspace?" : "New to AuthFlow?"}{" "}
          <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create one"}</Link>
        </p>
      </section>
    </main>
  );
}

