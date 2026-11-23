import { subscriptionRepository } from "../repositories/subscription.repository.js";

const BUSINESS_TIME_ZONE = "Africa/Cairo";

export type CurrentSubscription = {
  status: "active" | "expired" | "cancelled" | "missing";
  startDate: string | null;
  endDate: string | null;
  remainingDays: number;
  durationDays: number;
  price: string | null;
};

export async function getCurrentSubscription(
  userId: string,
): Promise<CurrentSubscription> {
  const subscription = await subscriptionRepository.findCurrentForUser(
    userId,
    BUSINESS_TIME_ZONE,
  );

  if (!subscription) {
    return {
      status: "missing",
      startDate: null,
      endDate: null,
      remainingDays: 0,
      durationDays: 0,
      price: null,
    };
  }

  return subscription;
}
