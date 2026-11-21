// Keyboard and mouse state, with per-frame "just pressed" edges the game consumes.
// Also on-screen virtual buttons (D-pad + E) so the game is playable with a
// mouse or touch alone, no keyboard required.
export const ACTION_CONFIRM = 'Enter';
export const ACTION_PAUSE = 'Escape';
export const ACTION_ENTER_CAR = 'KeyE';
export const ACTION_SHOOT = 'KeyF';
export const ACTION_RELOAD = 'KeyR';
export const ACTION_RUN = 'ShiftLeft';
export const ACTION_HANDBRAKE = 'Space';
export const ACTION_MUTE = 'KeyM';

// Virtual buttons, in canvas CSS pixels. D-pad bottom-left, E bottom-right.
// Render draws these same rects; input hit-tests them.
export function virtualButtons(W, H) {
  const s = 56;
  const cx = 110;
  const cy = H - 110;
  const e = 72;
  return [
    { code: 'KeyW', label: '▲', x: cx - s / 2, y: cy - 64 - s / 2, w: s, h: s },
    { code: 'KeyS', label: '▼', x: cx - s / 2, y: cy + 64 - s / 2, w: s, h: s },
    { code: 'KeyA', label: '◀', x: cx - 64 - s / 2, y: cy - s / 2, w: s, h: s },
    { code: 'KeyD', label: '▶', x: cx + 64 - s / 2, y: cy - s / 2, w: s, h: s },
    { code: 'KeyE', label: 'E', x: W - 80 - e / 2, y: H - 160 - e / 2, w: e, h: e },
  ];
}

function hitButton(buttons, x, y) {
  for (const b of buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

export function createInput(canvas) {
  const keys = new Set();
  const justPressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  const disposers = [];
  // Virtual buttons currently held, by pointer id (mouse uses 'mouse').
  const heldVirtual = new Map();

  function viewSize() {
    return { W: canvas.clientWidth || 1280, H: canvas.clientHeight || 720 };
  }

  function pressVirtual(b, id) {
    heldVirtual.set(id, b);
    if (!keys.has(b.code)) justPressed.add(b.code);
    keys.add(b.code);
  }

  function releaseVirtual(id) {
    const b = heldVirtual.get(id);
    if (!b) return;
    heldVirtual.delete(id);
    // Only release the key if no other pointer still holds the same button.
    let stillHeld = false;
    for (const other of heldVirtual.values()) {
      if (other.code === b.code) { stillHeld = true; break; }
    }
    if (!stillHeld) keys.delete(b.code);
  }

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) justPressed.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) { keys.delete(e.code); }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseMove(e) {
    const p = pointFromEvent(e);
    mouse.x = p.x;
    mouse.y = p.y;
  }

  function onMouseDown(e) {
    const p = pointFromEvent(e);
    mouse.x = p.x;
    mouse.y = p.y;
    const { W, H } = viewSize();
    const b = hitButton(virtualButtons(W, H), p.x, p.y);
    if (b) {
      pressVirtual(b, 'mouse');
      return;
    }
    mouse.down = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.down = false;
    releaseVirtual('mouse');
  }

  function onTouchStart(e) {
    e.preventDefault();
    const { W, H } = viewSize();
    const buttons = virtualButtons(W, H);
    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const b = hitButton(buttons, x, y);
      if (b) {
        pressVirtual(b, t.identifier);
      } else {
        mouse.x = x;
        mouse.y = y;
        mouse.down = true;
        mouse.clicked = true;
      }
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = t.clientX - rect.left;
      mouse.y = t.clientY - rect.top;
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (heldVirtual.has(t.identifier)) {
        releaseVirtual(t.identifier);
      } else {
        mouse.down = false;
      }
    }
    if (e.touches.length === 0) mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
    heldVirtual.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
  disposers.push(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('touchcancel', onTouchEnd);
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
