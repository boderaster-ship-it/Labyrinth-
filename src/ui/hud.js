export function createHud(hudElements) {
  return {
    show() {
      hudElements.root.classList.remove('hidden');
    },
    hide() {
      hudElements.root.classList.add('hidden');
    },
    update({ speed, mode }) {
      hudElements.speed.textContent = String(Math.round(Math.abs(speed) * 3.6));
      hudElements.mode.textContent = mode;
    },
  };
}
