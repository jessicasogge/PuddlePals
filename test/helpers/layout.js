// jsdom doesn't lay anything out, so every width reads as 0. Give the
// puddle a fixed size and work out each element's width from its percent
// width, the way the browser would. Call it in beforeEach; it returns a
// function that puts things back, for afterEach.
export const PUDDLE_WIDTH = 400;
export const RADIUS = PUDDLE_WIDTH / 2;

export function fakeLayout() {
  document.body.innerHTML = '<div class="water"></div>';
  Object.defineProperty(document.querySelector('.water'), 'clientWidth', { value: PUDDLE_WIDTH });
  const saved = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return ((parseFloat(this.style.width) || 0) / 100) * PUDDLE_WIDTH;
    },
  });
  return () => {
    if (saved) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', saved);
    else delete HTMLElement.prototype.offsetWidth;
  };
}
