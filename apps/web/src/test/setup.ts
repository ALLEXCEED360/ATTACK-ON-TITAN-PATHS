import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach } from "vitest";

// Animations finish instantly in tests.
MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
  localStorage.clear();
});
