
import { z } from "zod";
import { subscriptionTermSchema } from "./subscription.schema.js";

export const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^01[0125][0-9]{8}$/, "Invalid Egyptian phone number"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
}).strict();

export const createUserSchema = subscriptionTermSchema
  .extend({
    name: z.string().trim().min(1, "Name is required").max(100),
    phone: z.string().regex(/^01[0125][0-9]{8}$/, "Invalid Egyptian phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
  })
  .strict();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "New password and confirmation do not match",
  });

export const userSearchQuerySchema = z
  .object({
    phone: z
      .string()
      .trim()
      .min(1, "Phone search cannot be empty")
      .max(11, "Phone search cannot exceed 11 digits")
      .regex(/^\d+$/, "Phone search must contain digits only")
      .optional(),
  })
  .strict();

export const userIdParamsSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, "Invalid user ID"),
}).strict();

export const memberPhotoParamsSchema = z.object({
  id: z.string().uuid("Invalid member ID"),
}).strict();

export type LoginDTO = z.infer<typeof loginSchema>;
export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
