/**
 * Reusable Framer Motion Variants and Spring Physics Configurations.
 * Modeled strictly after the Inside English v2.0 Motion Design Specification.
 */

// 1. Spring Physics Configurations
export const springConfigs = {
  gentle: { 
    type: "spring", 
    stiffness: 150, 
    damping: 20 
  },
  bouncy: { 
    type: "spring", 
    stiffness: 400, 
    damping: 25 
  },
  slow: { 
    type: "spring", 
    stiffness: 100, 
    damping: 20 
  },
  snappy: { 
    type: "spring", 
    stiffness: 500, 
    damping: 35 
  }
};

// 2. Stagger Parent Container
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06, // 60ms delay between children (section 4.2)
      delayChildren: 0.1
    }
  }
};

// 3. Staggered Fade Up Child (Standard Page Enter)
export const fadeUpVariant = {
  hidden: { 
    opacity: 0, 
    y: 16 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: springConfigs.gentle 
  }
};

// 4. Correct Answer Pulse Animation
export const correctFeedbackVariant = {
  pulse: {
    scale: [1, 1.04, 1],
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderColor: "rgba(74, 222, 128, 1)",
    transition: {
      duration: 0.4,
      ease: "easeInOut"
    }
  }
};

// 5. Incorrect Answer Shake Animation (X-axis translation)
export const incorrectFeedbackVariant = {
  shake: {
    x: [0, -8, 8, -6, 6, -4, 4, 0],
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 1)",
    transition: {
      duration: 0.5,
      ease: "easeInOut"
    }
  }
};

// 6. 3D Card Flip Transitions
export const cardFlipVariant = {
  front: {
    rotateY: 0,
    transition: {
      duration: 0.5,
      ease: "easeInOut"
    }
  },
  back: {
    rotateY: 180,
    transition: {
      duration: 0.5,
      ease: "easeInOut"
    }
  }
};
