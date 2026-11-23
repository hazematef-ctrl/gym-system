import { z } from "zod";

export const generateQrSchema = z.object({}).strict();

export const scanQrSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, "Invalid QR token"),
}).strict();

export type ScanQrDTO = z.infer<typeof scanQrSchema>;
