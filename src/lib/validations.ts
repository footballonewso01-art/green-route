import { z } from "zod";

// Helper to ensure URL has http:// or https://
export const urlSchema = z.string()
    .min(1, "URL is required")
    .refine((val) => {
        if (!val) return false;
        try {
            new URL(val.startsWith('http') ? val : `https://${val}`);
            return true;
        } catch {
            return false;
        }
    }, { message: "Invalid URL format" })
    .transform((val) => {
        if (!val.startsWith('http://') && !val.startsWith('https://')) {
            return `https://${val}`;
        }
        return val;
    });

export const baseLinkSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title is too long"),
    destination_url: urlSchema,
});
