// Adapted from Vengeance UI AnimatedNumber, Copyright (c) 2025-2026 Ashutoshx7.
// MIT license: docs/vengeance-license.txt. See docs/ui-credits.md for source.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
export default function AnimatedNumber({ value }) {
  const reduced = useReducedMotion();
  const text = String(value ?? "—");
  return (
    <span aria-label={text} className="animated-number">
      <span aria-hidden="true">
        {text.split("").map((character, index) => (
          <span key={index} className="number-slot">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={character}
                initial={reduced ? false : { y: "65%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? { opacity: 0 } : { y: "-65%", opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
              >
                {character === " " ? "\u00a0" : character}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
      </span>
    </span>
  );
}
