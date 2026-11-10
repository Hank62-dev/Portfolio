// The demo is the workspace with made-up data: a visitor can use every tab, nothing is sent to a server, and what they
// add stays in this browser, in a database of its own so it can never mix with the owner's real one.

/**
 * Whether this page is the demo. The demo is turned off (2026-11-10): SpaceHank is the owner's own workspace, so nothing
 * links to it any more and /spacehank?demo asks for the password like /spacehank.
 */
export const isDemo = () => false;

/** Where the demo and the real workspace live. A full page load (not a client-side route change) switches between them. */
export const DEMO_URL = '/spacehank?demo';
export const WORKSPACE_URL = '/spacehank';

/**
 * What a guest may open. Most of the workspace is the owner's own (the home screen with its briefing and pet, notes, diary,
 * documents, the AI helpers), so a guest gets a few light places to look around; the rest, the home screen included, shows a
 * short introduction and asks for the password.
 */
export const GUEST_TABS = ['play', 'habits', 'study'];
/** Where a guest lands, since the home screen is the owner's. */
export const GUEST_HOME = 'play';
export const guestCan = (tab) => GUEST_TABS.includes(tab);
