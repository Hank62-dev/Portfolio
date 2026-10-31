// Mutable values shared between the Hero section (which writes them from DOM events) and the 3D scene
// (which reads them every frame). A plain object on purpose: going through React state would re-render
// on every pointer move and scroll tick.
export const heroStore = {
  /** Pointer position over the hero, each axis in -1..1 (0 = centre). */
  pointerX: 0,
  pointerY: 0,
  /** How far the hero has scrolled out of view, 0..1. */
  scroll: 0,
  /** Whether the hero is on screen; the scene stops rendering when it is not. */
  visible: true,
};
