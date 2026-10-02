// Zod schemas for auth endpoints.

import { z } from "zod";
import { env } from "../config/env";

const ALLOWED_DOMAIN = env.ALLOWED_DOMAIN;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters.").max(120),
  email: z
    .string()
    .email("Enter a valid email address.")
    .refine((e) => e.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`), {
      message: `Registration is restricted to @${ALLOWED_DOMAIN} email addresses.`,
    }),
  password: z.string().min(8, "Password must be at least 8 characters.").max(120),
  gender: z.enum(["male", "female", "other"], {
    errorMap: () => ({ message: "Select a valid gender option." }),
  }),
  yearOfStudy: z.number().int().min(1).max(6),
  school: z.string().min(2, "School is required.").max(120),
  program: z.string().min(2, "Program is required.").max(120),
  phone: z
    .string()
    .optional()
    .refine((v) => !v || /^\+?254\d{9}$|^07\d{8}$/.test(v.replace(/\s|-/g, "")), {
      message: "Phone must be a valid Kenyan number (e.g. +254712345678 or 0712345678).",
    }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
