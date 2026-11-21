// Keyboard and mouse state, with per-frame "just pressed" edges the game consumes.
export const ACTION_CONFIRM = 'Enter';
export const ACTION_PAUSE = 'Escape';
export const ACTION_ENTER_CAR = 'KeyE';
export const ACTION_SHOOT = 'KeyF';
export const ACTION_RELOAD = 'KeyR';
export const ACTION_RUN = 'ShiftLeft';
export const ACTION_HANDBRAKE = 'Space';
export const ACTION_MUTE = 'KeyM';

export function createInput(canvas) {
  const keys = new Set();
  const justPressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const disposers = [];

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) justPressed.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }
  function onMouseDown(e) { onMouseMove(e); mouse.down = true; mouse.clicked = true; }
  function onMouseUp() { mouse.down = false; }
  function onBlur() { keys.clear(); mouse.down = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  disposers.push(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
  });

  return {
    keys, mouse,
    down(code) { return keys.has(code); },
    pressed(code) { return justPressed.has(code); },
    axis() {
      const left = keys.has('KeyA') || keys.has('ArrowLeft');
      const right = keys.has('KeyD') || keys.has('ArrowRight');
      const up = keys.has('KeyW') || keys.has('ArrowUp');
      const downKey = keys.has('KeyS') || keys.has('ArrowDown');
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (downKey ? 1 : 0) - (up ? 1 : 0) };
    },
    endFrame() { justPressed.clear(); mouse.clicked = false; },
    dispose() { disposers.forEach((fn) => fn()); },
  };
}
