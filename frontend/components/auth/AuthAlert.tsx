"use client";

/**
 * AuthAlert — error or success banner for form-level feedback.
 *
 * Props:
 *   type    — "error" | "success"
 *   message — text to display
 */

interface AuthAlertProps {
  type: "error" | "success";
  message: string;
}

const ICONS = {
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 5v3M8 10.5v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function AuthAlert({ type, message }: AuthAlertProps) {
  return (
    <div
      className={type === "error" ? "auth-alert-error" : "auth-alert-success"}
      role="alert"
      style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
    >
      <span style={{ flexShrink: 0, marginTop: 1 }}>{ICONS[type]}</span>
      <span>{message}</span>
    </div>
  );
}
