import { z } from "zod";

export const subscriptionTermSchema = z
  .object({
    subscriptionDays: z.union([
      z.literal(30),
      z.literal(60),
      z.literal(90),
      z.literal(120),
      z.literal(150),
      z.literal(180),
      z.literal(360),
    ]),
    price: z
      .number()
      .finite()
      .min(0)
      .max(99_999_999.99)
      .refine((price) => Number.isInteger(price * 100), {
        message: "Price may have at most two decimal places",
      }),
  })
  .strict();

export const subscriptionUserParamsSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

export type SubscriptionTermDTO = z.infer<typeof subscriptionTermSchema>;
