/**
 * Spring physics presets for Framer Motion.
 * Linear timings are forbidden by design policy.
 */
import type { Transition } from "framer-motion";

export const springs = {
  gentle: {
    type: "spring",
    stiffness: 150,
    damping: 20,
  } as Transition,

  bouncy: {
    type: "spring",
    stiffness: 400,
    damping: 25,
  } as Transition,

  slow: {
    type: "spring",
    stiffness: 100,
    damping: 20,
  } as Transition,

  snappy: {
    type: "spring",
    stiffness: 500,
    damping: 35,
  } as Transition,
};

/**
 * Returns a fade-in transition used when prefers-reduced-motion is enabled.
 */
export const reducedMotionTransition: Transition = {
  duration: 0.15,
  ease: "easeOut",
};
