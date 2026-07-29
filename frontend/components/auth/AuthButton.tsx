"use client";

/**
 * AuthButton — primary submit button with loading spinner.
 *
 * Props:
 *   isLoading  — shows spinner + disables button
 *   children   — button label
 *   type       — "submit" | "button" (default: "submit")
 *   disabled
 *   onClick
 */

interface AuthButtonProps {
  isLoading?: boolean;
  children: React.ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
}

export function AuthButton({
  isLoading,
  children,
  type = "submit",
  disabled,
  onClick,
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className="auth-btn-primary"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {isLoading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
