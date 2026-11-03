/**
 * Захар — Личная интерактивная визитка
 * Скрипт логики, 3D эффекта, Web Audio API, QR-генератора и копирования
 */

// --- 1. СИНТЕЗ ЗВУКОВ (Web Audio API) ---
class SoundFx {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('sound_muted') === 'true';
    this.initElements();
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  play(type = 'tap') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.06);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.start(t);
      osc.stop(t + 0.06);
    } else if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.start(t);
      osc.stop(t + 0.04);
    } else if (type === 'success') {
      // Двухтональный аккорд
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc.type = 'sine';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc2.frequency.setValueAtTime(659.25, t); // E5

      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      gain2.gain.setValueAtTime(0.07, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.25);
      osc2.stop(t + 0.25);
    }
  }

  toggle() {
    this.muted = !this.muted;
    localStorage.setItem('sound_muted', this.muted);
    this.updateIcon();
  }

  initElements() {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    this.updateIcon();
    btn.addEventListener('click', () => {
      this.toggle();
      if (!this.muted) this.play('click');
    });
  }

  updateIcon() {
    const soundOn = document.querySelector('.sound-on');
    const soundOff = document.querySelector('.sound-off');
    if (soundOn && soundOff) {
      if (this.muted) {
        soundOn.classList.add('hidden');
        soundOff.classList.remove('hidden');
      } else {
        soundOn.classList.remove('hidden');
        soundOff.classList.add('hidden');
      }
    }
  }
}

const sfx = new SoundFx();

// При первом клике пользователя инициализируем аудио контекст
document.addEventListener('pointerdown', () => sfx.init(), { once: true });


// --- 2. ДИНАМИЧЕСКИЙ 3D НАКЛОН И БЛИК ---
const cardWrap = document.getElementById('card-wrap');
const businessCard = document.getElementById('business-card');

if (cardWrap && businessCard) {
  let bounds;
  let isHovered = false;

  const onMouseEnter = () => {
    isHovered = true;
    bounds = cardWrap.getBoundingClientRect();
  };

  const onMouseMove = (e) => {
    if (!bounds) bounds = cardWrap.getBoundingClientRect();
    const mouseX = e.clientX - bounds.left;
    const mouseY = e.clientY - bounds.top;

    const xPct = (mouseX / bounds.width - 0.5) * 2; // от -1 до 1
    const yPct = (mouseY / bounds.height - 0.5) * 2;

    const maxTilt = 12; // максимальный угол наклона в градусах
    const rotateY = xPct * maxTilt;
    const rotateX = -yPct * maxTilt;

    cardWrap.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    
    // Положение блика
    const glareX = ((mouseX / bounds.width) * 100).toFixed(1);
    const glareY = ((mouseY / bounds.height) * 100).toFixed(1);
    businessCard.style.setProperty('--glare-x', `${glareX}%`);
    businessCard.style.setProperty('--glare-y', `${glareY}%`);
  };

  const onMouseLeave = () => {
    isHovered = false;
    cardWrap.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
    businessCard.style.setProperty('--glare-x', `50%`);
    businessCard.style.setProperty('--glare-y', `50%`);
  };

  cardWrap.addEventListener('mouseenter', onMouseEnter);
  window.addEventListener('mousemove', (e) => {
    if (isHovered) onMouseMove(e);
  });
  cardWrap.addEventListener('mouseleave', onMouseLeave);

  // Гироскоп на мобильных устройствах
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    window.addEventListener('deviceorientation', (e) => {
      if (window.innerWidth > 768) return;
      const gamma = e.gamma || 0; // Наклон влево/вправо (-90 до 90)
      const beta = e.beta || 0;   // Наклон вперед/назад (-180 до 180)
      
      const rotY = Math.max(-14, Math.min(14, gamma * 0.45));
      const rotX = Math.max(-14, Math.min(14, (beta - 45) * 0.35));

      cardWrap.style.transform = `perspective(800px) rotateX(${-rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      businessCard.style.setProperty('--glare-x', `${50 + rotY * 2}%`);
      businessCard.style.setProperty('--glare-y', `${50 + rotX * 2}%`);
    });
  }
}


// --- 3. ИНТЕРАКТИВНЫЙ ФОН С ЧАСТИЦАМИ И СЕТЬЮ ---
const canvas = document.getElementById('ambient-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const PARTICLE_COUNT = Math.min(window.innerWidth < 600 ? 35 : 65, 70);

  const resize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.radius = Math.random() * 1.8 + 0.8;
      this.alpha = Math.random() * 0.5 + 0.2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56, 189, 248, ${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  let mousePos = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
  });

  const animate = () => {
    ctx.clearRect(0, 0, width, height);

    // Рисуем связи между соседними частицами
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      p1.update();
      p1.draw();

      // Легкое притяжение к курсору
      const dxm = mousePos.x - p1.x;
      const dym = mousePos.y - p1.y;
      const distMouse = Math.sqrt(dxm * dxm + dym * dym);
      if (distMouse < 140) {
        p1.x += dxm * 0.012;
        p1.y += dym * 0.012;
      }

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          const opacity = (1 - dist / 110) * 0.16;
          ctx.strokeStyle = `rgba(129, 140, 248, ${opacity})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  };
  animate();
}


// --- 4. СИСТЕМА УВЕДОМЛЕНИЙ (TOAST) И КОПИРОВАНИЕ ---
const toast = document.getElementById('toast');
let toastTimer = null;

function showToast(message = 'Скопировано!') {
  if (!toast) return;
  const msgEl = toast.querySelector('.toast-message');
  if (msgEl) msgEl.textContent = message;

  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);

  if ('vibrate' in navigator) {
    try { navigator.vibrate(30); } catch (_) {}
  }
}

// Обработка кликов по кнопкам копирования
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const textToCopy = btn.getAttribute('data-copy');
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      sfx.play('success');
      showToast('Скопировано: ' + textToCopy);
    } catch (err) {
      // Запасной вариант копирования
      const input = document.createElement('input');
      input.value = textToCopy;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      sfx.play('success');
      showToast('Скопировано в буфер!');
    }
  });
});

// Звуки для интерактивных элементов
document.querySelectorAll('[data-sound]').forEach((el) => {
  el.addEventListener('click', () => {
    const soundType = el.getAttribute('data-sound') || 'tap';
    sfx.play(soundType);
  });
});


// --- 5. ЭКСПОРТ VCARD (.vcf) ---
const saveVcardBtn = document.getElementById('save-vcard-btn');
if (saveVcardBtn) {
  saveVcardBtn.addEventListener('click', () => {
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN;CHARSET=UTF-8:Захар',
      'N;CHARSET=UTF-8:;Захар;;;',
      'TEL;TYPE=CELL,VOICE;VALUE=uri:tel:+79963410773',
      'X-SOCIALPROFILE;type=telegram:https://t.me/pirotekhnik',
      'NOTE;CHARSET=UTF-8:Telegram: @pirotekhnik | MAX: https://max.ru/u/f9LHodD0cOKPPC728hAMvFVpY7uNrlajqBEabnwtQMDZGIaXkD4tOjGfKds',
      'URL;type=Telegram:https://t.me/pirotekhnik',
      'URL;type=MAX:https://max.ru/u/f9LHodD0cOKPPC728hAMvFVpY7uNrlajqBEabnwtQMDZGIaXkD4tOjGfKds',
      'END:VCARD'
    ].join('\r\n');

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Захар_Контакты.vcf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    sfx.play('success');
    showToast('Контакт Захара скачан (.vcf)');
  });
}


// --- 6. КНОПКА «ПОДЕЛИТЬСЯ» ---
const shareBtn = document.getElementById('share-btn');
if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    sfx.play('click');
    const shareData = {
      title: 'Визитка Захара',
      text: 'Личные контакты Захара (@pirotekhnik): Telegram, MAX, Телефон',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyPageUrl();
        }
      }
    } else {
      copyPageUrl();
    }
  });

  function copyPageUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('Ссылка на визитку скопирована');
    }).catch(() => {
      showToast('Адрес: ' + window.location.href);
    });
  }
}


// --- 7. УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ QR-КОДА ---
const qrModal = document.getElementById('qr-modal');
const qrOpenBtn = document.getElementById('qr-modal-open-btn');
const qrCloseBtn = document.getElementById('qr-modal-close');
const qrBox = document.getElementById('qr-box');
const qrTabs = document.querySelectorAll('.qr-tab');

const QR_TARGETS = {
  page: window.location.href,
  tg: 'https://t.me/pirotekhnik',
  max: 'https://max.ru/u/f9LHodD0cOKPPC728hAMvFVpY7uNrlajqBEabnwtQMDZGIaXkD4tOjGfKds',
  phone: 'tel:+79963410773'
};

let qrInstance = null;

function renderCurrentQR(type = 'page') {
  const target = QR_TARGETS[type] || window.location.href;
  if (!qrBox) return;
  qrBox.innerHTML = '';
  
  if (typeof QRCode !== 'undefined') {
    try {
      qrInstance = new QRCode(qrBox, {
        text: target,
        width: 180,
        height: 180,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    } catch (e) {
      console.warn('QR render error:', e);
    }
  }
}

if (qrOpenBtn && qrModal) {
  qrOpenBtn.addEventListener('click', () => {
    sfx.play('tap');
    qrModal.classList.add('open');
    renderCurrentQR('page');
  });

  qrCloseBtn.addEventListener('click', () => {
    sfx.play('tap');
    qrModal.classList.remove('open');
  });

  qrModal.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      sfx.play('tap');
      qrModal.classList.remove('open');
    }
  });

  qrTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      qrTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const type = tab.getAttribute('data-type');
      sfx.play('click');
      renderCurrentQR(type);
    });
  });
}

// Закрытие по клавише Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && qrModal && qrModal.classList.contains('open')) {
    qrModal.classList.remove('open');
  }
});
