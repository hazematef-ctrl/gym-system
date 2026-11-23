import { AnimatePresence, motion } from "motion/react";
import { Bell, Home, Menu, UserRound, X } from "lucide-react";
import logoImage from "../../../assets/images/backgroundwithout.png";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import LogoutButton from "../../auth/components/LogoutButton";

function navigationLinkClassName(isActive: boolean) {
  return `flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition-colors ${
    isActive
      ? "bg-lime/10 font-medium text-lime"
      : "text-paper hover:bg-white/5 hover:text-lime"
  }`;
}

function MemberNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY >= 30);

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !navRef.current?.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  return (
    <nav
      ref={navRef}
      aria-label="Member navigation"
      className={`sticky top-0 z-50 -mx-4 flex items-center justify-between border-b px-4 py-3 transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 ${
        isScrolled
          ? "border-white/10 bg-ink/80 shadow-lg backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <NavLink
        to="/home"
        aria-label="i GYM home"
        onClick={() => setIsMenuOpen(false)}
        className="shrink-0"
      >
        <img
          src={logoImage}
          alt="i GYM logo"
          className="mb-1 h-24 w-24 object-contain sm:h-28 sm:w-28"
        />
      </NavLink>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <NavLink
            to="/home"
            end
            className={({ isActive }) => navigationLinkClassName(isActive)}
          >
            <Home size={17} />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => navigationLinkClassName(isActive)}
          >
            <UserRound size={17} />
            <span>Profile</span>
          </NavLink>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="rounded-full border border-white/5 bg-panel p-3 text-paper transition-colors hover:text-lime"
        >
          <Bell size={19} />
        </button>

        <div className="hidden md:block">
          <LogoutButton />
        </div>

        <button
          type="button"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={isMenuOpen}
          aria-controls="member-mobile-navigation"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="rounded-full border border-white/5 bg-panel p-3 text-paper transition-colors hover:text-lime md:hidden"
        >
          {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="member-mobile-navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={() => setIsMenuOpen(false)}
            className="absolute left-4 right-4 top-full z-[60] origin-top rounded-xl border border-white/10 bg-panel p-2 shadow-xl sm:left-8 sm:right-8 md:hidden"
          >
            <NavLink
              to="/home"
              end
              className={({ isActive }) => navigationLinkClassName(isActive)}
            >
              <Home size={17} />
              <span>Home</span>
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) => navigationLinkClassName(isActive)}
            >
              <UserRound size={17} />
              <span>Profile</span>
            </NavLink>
            <div className="mt-2 flex justify-end border-t border-white/10 pt-2">
              <LogoutButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export default MemberNavbar;