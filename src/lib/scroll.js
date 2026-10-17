/** Click handler: scroll to a section on the current page and keep the URL hash in sync. */
export const jumpTo = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView();
  window.history.replaceState(null, '', `/#${id}`);
};
