import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ErrorLike = {
  status?: unknown;
  code?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    code?: unknown;
    message?: unknown;
    error?: unknown;
  };
};

export function maskError(error: unknown, fallback: string = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const errorLike = (typeof error === "string" ? { message: error } : error) as ErrorLike;
  const status = Number(errorLike.status || errorLike.code || errorLike.response?.status || errorLike.response?.code || 0);
  const msg = String(errorLike.response?.message || errorLike.response?.error || errorLike.message || "").toLowerCase();

  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to complete this action.";
  if (status === 404) return "The requested item is no longer available. Refresh the page and try again.";
  if (status === 409) return "This item changed while you were editing it. Refresh the page and try again.";
  if (status === 413) return "The uploaded file is too large.";
  if (status === 429) return "Too many requests. Wait a moment and try again.";

  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed")) {
    return "We couldn't reach Linktery. Check your connection and try again.";
  }

  if (
    status >= 500 ||
    msg.includes("clientresponseerror") ||
    msg.includes("goerror") ||
    msg.includes("sql:") ||
    msg.includes("sqlite") ||
    msg.includes("database") ||
    msg.includes("stack") ||
    msg.includes("github.com") ||
    msg.includes("repository") ||
    msg.includes("server responded with a status of") ||
    msg.includes("stripe error") ||
    msg.includes("raw response") ||
    msg.includes("internal server")
  ) {
    return `${fallback} Linktery is temporarily unavailable; try again in a moment.`;
  }

  // Never render an arbitrary exception or server response in a toast. Raw
  // errors stay in diagnostic logs; users receive action-oriented copy only.
  return fallback;
}
