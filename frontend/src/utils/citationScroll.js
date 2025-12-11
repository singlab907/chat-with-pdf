const DEFAULT_DURATION = 2000;
const DEFAULT_CLASSNAME = 'citation-highlight';

// Smoothly scrolls to a target element and briefly highlights it
function scrollTo(target, options = {}) {
  if (!target) return;
  const { className = DEFAULT_CLASSNAME, duration = DEFAULT_DURATION } = options;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.add(className);
  setTimeout(() => {
    target.classList.remove(className);
  }, duration);
}

export const CitationScroll = {
  scrollTo,
};
