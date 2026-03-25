export function createInputSystem(controlElements) {
  const state = {
    steer: 0,
    throttle: 0,
    brake: 0,
    pausePressed: false,
  };

  const keys = { left: false, right: false, up: false, down: false };
  const touch = { left: false, right: false, throttle: false, brake: false };

  const recompute = () => {
    state.steer = (keys.right || touch.right ? 1 : 0) - (keys.left || touch.left ? 1 : 0);
    state.throttle = keys.up || touch.throttle ? 1 : 0;
    state.brake = keys.down || touch.brake ? 1 : 0;
  };

  const bindTouchHold = (button, key) => {
    if (!button) return;
    const down = (event) => {
      event.preventDefault();
      touch[key] = true;
      recompute();
    };
    const up = (event) => {
      event.preventDefault();
      touch[key] = false;
      recompute();
    };

    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
  };

  bindTouchHold(controlElements.left, 'left');
  bindTouchHold(controlElements.right, 'right');
  bindTouchHold(controlElements.throttle, 'throttle');
  bindTouchHold(controlElements.brake, 'brake');

  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = true;
    if (event.code === 'ArrowUp' || event.code === 'KeyW') keys.up = true;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') keys.down = true;
    if (event.code === 'Escape') state.pausePressed = true;
    recompute();
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = false;
    if (event.code === 'ArrowUp' || event.code === 'KeyW') keys.up = false;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') keys.down = false;
    recompute();
  });

  return {
    read: () => ({ ...state }),
    consumePausePress() {
      const pressed = state.pausePressed;
      state.pausePressed = false;
      return pressed;
    },
  };
}
