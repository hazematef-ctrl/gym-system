import { motion } from "motion/react";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import MemberNavbar from "../components/MemberNavbar";
import WelcomeSection from "../components/WelcomeSection";
import MembershipCard from "../components/MembershipCard";
import QRAccessCard from "../components/QRAccessCard";
import { useAuth } from "../../auth/context/AuthContext";
import {
  getCurrentSubscription,
  type CurrentSubscription,
} from "../../../services/api";

function MemberHomePage() {
  const { user, isAuthenticated, isLoading, authError } = useAuth();
  const [subscription, setSubscription] =
    useState<CurrentSubscription | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState("");
  const userId = user?.id;

  useEffect(() => {
    if (isLoading || !isAuthenticated || userId === undefined) {
      return;
    }

    let isCurrentRequest = true;
    getCurrentSubscription()
      .then((currentSubscription) => {
        if (isCurrentRequest) {
          setSubscription(currentSubscription);
          setSubscriptionError("");
        }
      })
      .catch((error: unknown) => {
        if (isCurrentRequest) {
          setSubscriptionError(
            error instanceof Error
              ? error.message
              : "Could not load your subscription.",
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsSubscriptionLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [isAuthenticated, isLoading, userId]);

  if (isLoading || (isAuthenticated && user && isSubscriptionLoading)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <p role="status" className="text-muted">
          Loading your membership...
        </p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <p role="alert" className="text-red-300">
          Unable to load your account: {authError}
        </p>
      </main>
    );
  }

  if (subscriptionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <p role="alert" className="text-red-300">
          Unable to load your subscription: {subscriptionError}
        </p>
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: "/home" } }}
      />
    );
  }

  if (!subscription) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-4 text-paper">
        <p role="alert" className="text-red-300">
          Subscription data was not returned by the server.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-6 text-paper sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <MemberNavbar />

        <div className="mt-10 space-y-9 sm:mt-14">
          <WelcomeSection userName={user.name} />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[1.15fr_0.85fr]"
          >
            <MembershipCard
              status={subscription.status}
              remainingDays={subscription.remainingDays}
              startDate={subscription.startDate}
              endDate={subscription.endDate}
              durationDays={subscription.durationDays}
            />

            <QRAccessCard />
          </motion.div>
        </div>

        <footer className="mt-14 border-t border-white/[0.06] py-6 text-center">
          <p className="text-[11px] tracking-[0.15em] text-muted">
            i GYM · TRAIN HARDER, LIVE STRONGER
          </p>
        </footer>
      </div>
    </main>
  );
}

export default MemberHomePage;