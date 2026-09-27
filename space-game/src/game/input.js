// Girdi katmanı: oyun motoru klavyeyi değil bu soyut durumu okur.
// Mobil kontroller eklenirken aynı alanlar (left/right/fire) dokunmatik
// butonlardan set edilecek; motorda değişiklik gerekmeyecek.
export function createInputState() {
  return { left: false, right: false, fire: false, pausePressed: false };
}

const KEY_MAP = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Space: 'fire',
};

export function bindKeyboard(input) {
  const onKeyDown = (e) => {
    const action = KEY_MAP[e.code];
    if (action) {
      input[action] = true;
      e.preventDefault();
    } else if (e.code === 'KeyP' && !e.repeat) {
      input.pausePressed = true;
    }
  };
  const onKeyUp = (e) => {
    const action = KEY_MAP[e.code];
    if (action) input[action] = false;
  };
  const onBlur = () => {
    input.left = input.right = input.fire = false;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
