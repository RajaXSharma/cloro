"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * One field style for the whole app. There were three ad-hoc input styles before
 * and none of them had a focus ring; this is the single place that decides what a
 * text control looks like.
 *
 * `--input` is deliberately lighter than `--border`: it is the visible boundary of
 * a control, so it has to clear 3:1 against the page background (WCAG 1.4.11).
 */
const fieldBase =
  "w-full rounded-md border border-input bg-secondary/40 text-sm text-foreground " +
  "transition-colors placeholder:text-muted-foreground " +
  "focus-visible:border-ring focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring/70 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-9 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "px-3 py-2", className)} {...props} />;
}

/**
 * Label above the control, hint or error below it, and the message wired to the
 * control through `aria-describedby`. The label is a real `<label>`; a placeholder
 * never stands in for one.
 */
export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: {
  label: string;
  hint?: string;
  error?: string | null;
} & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={messageId}
        aria-invalid={error ? true : undefined}
        className={cn(fieldBase, "h-9 px-3", className)}
        {...props}
      />
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A group of form fields with one shared error line above them, for forms whose
 * error is not attributable to a single field (sign-in rejection, invite failure).
 */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-xs text-destructive"
    >
      {children}
    </p>
  );
}
