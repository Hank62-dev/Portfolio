import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Plugins are registered once, here, so every module imports GSAP from this file.
gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

// Media conditions for gsap.matchMedia(). Every animation lives behind MOTION, so people who ask
// for reduced motion get the finished layout and nothing moves.
export const MOTION = '(prefers-reduced-motion: no-preference)';
export const FINE_POINTER = '(hover: hover) and (pointer: fine)';
export const DESKTOP = '(min-width: 1024px)';

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
