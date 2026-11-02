// The demo is the workspace with made-up data: a visitor can use every tab, nothing is sent to a server, and what they
// add stays in this browser, in a database of its own so it can never mix with the owner's real one.

/** True when the page was opened as /spacehank?demo. Read each time, not once, because the router can arrive here late. */
export const isDemo = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo');

/** Where the demo and the real workspace live. A full page load (not a client-side route change) switches between them. */
export const DEMO_URL = '/spacehank?demo';
export const WORKSPACE_URL = '/spacehank';
