class CountdownManager {
  constructor() {
    this.totalTime = 90; // 秒
    this.remainingTime = this.totalTime;
    this.isRunning = true;
    this.isCancelled = false;

    // DOM 元素
    this.timeEl = document.getElementById('countdownTime');
    this.slideBtn = document.getElementById('slideButton');
    this.slideProg = document.getElementById('slideProgress');
    this.slideText = document.getElementById('slideText');
    this.holdPrompt = document.getElementById('holdPrompt');
    this.holdTimerEl = document.getElementById('holdTimer');
    this.holdBar = document.getElementById('holdProgressBar');
    this.container = document.querySelector('.countdown-container');
    this.statusEl = document.getElementById('statusMessage');

    // 滑动相关
    this.dragging = false;
    this.startX = 0;
    this.currentX = 0;
    this.trackWidth = document.querySelector('.slide-track').offsetWidth;
    this.btnWidth = this.slideBtn.offsetWidth;
    this.maxDist = this.trackWidth - this.btnWidth - 8;
    this.holdDuration = 2000;
    this.holdTimer = null;
    this.holding = false;

    this.init();
  }

  init() {
    // 滑动事件绑定
    ['mousedown', 'touchstart'].forEach(evt =>
      this.slideBtn.addEventListener(evt, this.onStart.bind(this))
    );
    ['mousemove', 'touchmove'].forEach(evt =>
      document.addEventListener(evt, this.onMove.bind(this))
    );
    ['mouseup', 'touchend'].forEach(evt =>
      document.addEventListener(evt, this.onEnd.bind(this))
    );

    // 禁止右键和文本选中
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());

    this.startCountdown();
    this.updateDisplay();
  }

  onStart(e) {
    if (this.isCancelled) return;
    e.preventDefault();
    this.dragging = true;
    this.slideBtn.style.transition = 'none';
    this.startX = e.touches ? e.touches[0].clientX : e.clientX;
  }

  onMove(e) {
    if (!this.dragging || this.isCancelled) return;
    e.preventDefault();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    this.currentX = Math.min(Math.max(0, this.startX - x), this.maxDist);
    this.slideBtn.style.transform = `translateX(${-this.currentX}px)`;

    const pct = this.currentX / this.maxDist;
    this.slideProg.style.width = `${pct * 100}%`;
    this.slideText.style.opacity = 1 - pct * 0.7;

    if (pct >= 0.85 && !this.holding) {
      this.startHold();
    } else if (pct < 0.85) {
      this.cancelHold();
    }
  }

  onEnd() {
    if (!this.dragging) return;
    this.dragging = false;

    // 复位动画：弹性贝塞尔
    this.slideBtn.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';

    // 只要还没真正取消，就复位
    if (!this.isCancelled) {
      this.currentX = 0;
      this.slideProg.style.width = '0%';
      this.slideText.style.opacity = '1';
      this.slideBtn.style.transform = '';
    }

    this.cancelHold();
  }

  startHold() {
    this.holding = true;
    this.holdPrompt.classList.add('show');
    this.slideText.textContent = '继续保持以取消关机...';
    const startTime = performance.now();

    const tick = now => {
      const elapsed = now - startTime;
      const prog = Math.min(elapsed / this.holdDuration, 1);
      this.holdBar.style.width = `${prog * 100}%`;
      this.holdTimerEl.textContent = ((this.holdDuration - elapsed) / 1000).toFixed(1);
      if (prog < 1 && this.holding) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);

    this.holdTimer = setTimeout(() => {
      if (this.holding) this.doCancel();
    }, this.holdDuration);
  }

  cancelHold() {
    this.holding = false;
    this.holdPrompt.classList.remove('show');
    clearTimeout(this.holdTimer);
    this.holdBar.style.width = '0%';
    this.slideText.textContent = '向左滑动取消关机';
  }

  doCancel() {
    this.isCancelled = true;
    this.isRunning = false;
    window.electronAPI?.closeCountdownWindow();
  }

  startCountdown() {
    this.countInt = setInterval(() => {
      if (!this.isRunning) return clearInterval(this.countInt);
      this.remainingTime--;
      this.updateDisplay();

      if (this.remainingTime <= 0) {
        clearInterval(this.countInt);
        window.electronAPI?.executeShutdown();
        window.electronAPI?.closeCountdownWindow();
      }
    }, 1000);
  }

  updateDisplay() {
    const m = String(Math.floor(this.remainingTime / 60)).padStart(2, '0');
    const s = String(this.remainingTime % 60).padStart(2, '0');
    this.slideText.textContent = `关机倒计时 ${m}:${s}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new CountdownManager();
});
