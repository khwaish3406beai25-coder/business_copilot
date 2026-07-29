"use client";

/**
 * AuthInput — labeled text input with error state.
 *
 * Props:
 *   id        — links <label> and <input>
 *   label     — visible label text
 *   type      — input type (text | email | password)
 *   value     — controlled value
 *   onChange  — change handler
 *   error     — optional error message; adds .error class + renders message
 *   placeholder
 *   disabled
 *   autoComplete
 */

interface AuthInputProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export function AuthInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  disabled,
  autoComplete,
}: AuthInputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          fontSize: "0.8125rem",
          fontWeight: 500,
          color: "var(--foreground-muted)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`auth-input${error ? " error" : ""}`}
      />

      {error && (
        <p
          role="alert"
          style={{
            fontSize: "0.8125rem",
            color: "var(--error-text)",
            marginTop: 2,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
