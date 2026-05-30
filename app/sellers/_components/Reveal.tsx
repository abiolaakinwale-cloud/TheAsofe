"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

// The reveal animation is a progressive enhancement: server-rendered HTML is
// fully visible. After hydration we hide and re-animate, so the entrance still
// looks good for users on a fresh load, but never gates content behind JS.

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

type Props = {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
};

function useEnhance(): boolean {
  const prefersReduced = useReducedMotion();
  const [enhance, setEnhance] = useState(false);
  useEffect(() => {
    if (!prefersReduced) setEnhance(true);
  }, [prefersReduced]);
  return enhance;
}

export default function Reveal({ children, delay = 0, as = "div", className }: Props) {
  const enhance = useEnhance();
  const MotionEl = motion[as];
  return (
    <MotionEl
      className={className}
      initial={enhance ? "hidden" : "show"}
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </MotionEl>
  );
}

export function Stagger({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const enhance = useEnhance();
  return (
    <motion.div
      className={className}
      style={style}
      initial={enhance ? "hidden" : "show"}
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div className={className} style={style} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
