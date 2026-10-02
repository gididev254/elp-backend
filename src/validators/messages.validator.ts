// Zod schemas for messages endpoints.

import { z } from "zod";

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required."),
  subject: z
    .string()
    .trim()
    .min(3, "Subject must be at least 3 characters.")
    .max(160, "Subject must be at most 160 characters."),
  body: z
    .string()
    .trim()
    .min(5, "Message body must be at least 5 characters.")
    .max(5000, "Message body must be at most 5000 characters."),
});

export const listMessagesQuerySchema = z.object({
  box: z.enum(["inbox", "sent"]).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
