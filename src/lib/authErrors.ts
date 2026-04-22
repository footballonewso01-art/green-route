/**
 * Parse PocketBase ClientResponseError into user-friendly messages.
 * PocketBase returns errors in format: { data: { fieldName: { code: "...", message: "..." } } }
 */

interface PBFieldError {
  code: string;
  message: string;
}

interface PBError {
  status?: number;
  message?: string;
  data?: Record<string, PBFieldError>;
  response?: {
    data?: Record<string, PBFieldError>;
    message?: string;
  };
}

const fieldLabels: Record<string, string> = {
  email: "Email",
  password: "Password",
  passwordConfirm: "Password confirmation",
  name: "Name",
  username: "Username",
};

const codeMessages: Record<string, string> = {
  validation_required: "is required.",
  validation_is_email: "must be a valid email address.",
  validation_length_out_of_range: "length is outside the allowed range.",
  validation_not_unique: "is already in use. Try another one.",
  validation_invalid_value: "contains invalid characters.",
  validation_min_text_constraint: "is too short.",
  validation_max_text_constraint: "is too long.",
  validation_length_too_long: "is too long (max 72 characters).",
  validation_match_invalid: "contains characters that are not allowed.",
};

export function parseAuthError(error: unknown, context: "register" | "login"): string {
  const err = error as PBError;

  // Extract field-level validation errors from PocketBase response
  const data = err?.response?.data || err?.data;

  if (data && typeof data === "object") {
    const messages: string[] = [];

    for (const [field, fieldErr] of Object.entries(data)) {
      if (!fieldErr || typeof fieldErr !== "object") continue;

      const label = fieldLabels[field] || field;
      const code = fieldErr.code || "";
      const friendly = codeMessages[code];

      if (friendly) {
        messages.push(`${label} ${friendly}`);
      } else if (fieldErr.message) {
        // Fallback: use PocketBase's message but prefix with field name
        messages.push(`${label}: ${fieldErr.message}`);
      }
    }

    if (messages.length > 0) {
      return messages.join("\n");
    }
  }

  // Handle common HTTP status codes
  if (err?.status === 400) {
    if (context === "login") {
      return "Invalid email or password. Please check your credentials.";
    }
    return err?.message || "Invalid data. Please check your input.";
  }

  if (err?.status === 403) {
    return "Your account has been suspended. Contact support for help.";
  }

  if (err?.status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Generic fallback
  const rawMessage = err?.message || "";
  if (rawMessage.toLowerCase().includes("failed to create")) {
    return context === "register"
      ? "Could not create account. Please check your email and password."
      : "Something went wrong. Please try again.";
  }

  return rawMessage || (context === "register" ? "Registration failed. Please try again." : "Login failed. Please try again.");
}
