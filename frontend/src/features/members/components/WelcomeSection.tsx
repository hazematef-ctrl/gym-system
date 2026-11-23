import { motion } from "motion/react";
import { useEffect, useState } from "react";

type WelcomeSectionProps = {
  userName: string;
};

function WelcomeSection({ userName }: WelcomeSectionProps) {
  const greeting = `Welcome, ${userName}`;
  const [typedGreeting, setTypedGreeting] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTypedGreeting("");
    let characterIndex = 0;
    const intervalId = window.setInterval(() => {
      characterIndex += 1;
      setTypedGreeting(greeting.slice(0, characterIndex));

      if (characterIndex >= greeting.length) {
        window.clearInterval(intervalId);
      }
    }, 75);

    return () => window.clearInterval(intervalId);
  }, [greeting]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="space-y-2"
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
        YOUR FITNESS SPACE
      </p>

      <h2
        aria-label={greeting}
        className="text-3xl font-semibold tracking-tight text-paper sm:text-4xl"
      >
        <span aria-hidden="true">{typedGreeting}</span>
        <span
          aria-hidden="true"
          className="ml-1 inline-block h-[1em] w-0.5 animate-pulse bg-lime align-middle"
        />
      </h2>

      <p className="text-sm text-muted sm:text-base">
        جاهز تحقق إنجاز جديد النهارده؟
      </p>
    </motion.section>
  );
}

export default WelcomeSection;