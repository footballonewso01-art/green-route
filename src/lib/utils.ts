import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ErrorLike = {
  message?: unknown;
  response?: {
    message?: unknown;
    error?: unknown;
  };
};

export function maskError(error: unknown, fallback: string = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const errorLike = error as ErrorLike;
  const msg = String(errorLike.response?.message || errorLike.response?.error || errorLike.message || "");

  if (
    msg.includes("ClientResponseError") ||
    msg.includes("Failed to fetch") ||
    msg.includes("GoError") ||
    msg.includes("sql:") ||
    msg.includes("sqlite") ||
    msg.includes("database") ||
    msg.includes("server responded with a status of") ||
    msg.includes("500") ||
    msg.includes("405")
  ) {
    return fallback;
  }

  return msg || fallback;
}
