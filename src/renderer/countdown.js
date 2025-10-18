// ==================== 粒子背景系统 ====================
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particleCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 48;
        this.lastTimestamp = performance.now();

        this.resize();
        this.init();
        this.animate = this.animate.bind(this);

        window.addEventListener('resize', () => this.resize());
        requestAnimationFrame(this.animate);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.particles.length) {
            this.particles = this.particles.map(() => this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 0.18,
            vy: (Math.random() - 0.5) * 0.18,
            radius: Math.random() * 1.6 + 0.6,
            baseAlpha: Math.random() * 0.35 + 0.25,
            pulse: Math.random() * Math.PI * 2
        };
    }

    init() {
        this.particles = Array.from({ length: this.particleCount }, () => this.createParticle());
    }

    animate(timestamp) {
        const delta = Math.min((timestamp - this.lastTimestamp) / 16.67, 2);
        this.lastTimestamp = timestamp;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const particle of this.particles) {
            particle.pulse += 0.012 * delta;
            const alpha = particle.baseAlpha + Math.sin(particle.pulse) * 0.08;

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(76, 110, 245, ${alpha.toFixed(3)})`;
            this.ctx.fill();

            particle.x += particle.vx * delta;
            particle.y += particle.vy * delta;

            if (particle.x < -40) particle.x = this.canvas.width + 40;
            if (particle.x > this.canvas.width + 40) particle.x = -40;
            if (particle.y < -40) particle.y = this.canvas.height + 40;
            if (particle.y > this.canvas.height + 40) particle.y = -40;
        }

        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.hypot(dx, dy);

                if (distance < 120) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(59, 130, 246, ${(0.14 * (1 - distance / 120)).toFixed(3)})`;
                    this.ctx.lineWidth = 0.8;
                    this.ctx.stroke();
                }
            }
        }

        requestAnimationFrame(this.animate);
    }
}

// ==================== 鼠标晃动/拖拽检测器 ====================
class MouseShakeDetector {
    constructor(onShakeComplete) {
        this.onShakeComplete = onShakeComplete;
        this.positions = [];
        this.maxPositions = 10;
        this.shakeThreshold = 500; // 降低阈值，更容易触发
        this.shakeProgress = 0;
        this.requiredShake = 100;
        this.isShaking = false;
        this.decayRate = 1.2;
        
        // 拖拽相关
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragThreshold = 150; // 拖拽距离阈值
        
        this.init();
    }
    
    init() {
        // 鼠标移动事件
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        
        // 鼠标拖拽事件
        document.addEventListener('mousedown', (e) => this.onDragStart(e));
        document.addEventListener('mousemove', (e) => this.onDragMove(e));
        document.addEventListener('mouseup', (e) => this.onDragEnd(e));
        
        // 触摸事件支持
        document.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        
        // 进度衰减
        setInterval(() => {
            if (this.shakeProgress > 0 && !this.isShaking) {
                this.shakeProgress = Math.max(0, this.shakeProgress - this.decayRate);
                this.updateProgress();
            }
            this.isShaking = false;
        }, 100);
    }
    
    // 鼠标拖拽开始
    onDragStart(e) {
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        document.body.classList.add('dragging');
    }
    
    // 鼠标拖拽移动
    onDragMove(e) {
        if (!this.isDragging) return;
        
        const deltaX = Math.abs(e.clientX - this.dragStartX);
        const deltaY = Math.abs(e.clientY - this.dragStartY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 更新进度条
        const progress = Math.min(100, (distance / this.dragThreshold) * 100);
        this.shakeProgress = progress;
        this.updateProgress();
        
        // 如果拖拽距离足够，触发取消
        if (distance >= this.dragThreshold) {
            this.onShakeComplete();
            this.isDragging = false;
            document.body.classList.remove('dragging');
        }
    }
    
    // 鼠标拖拽结束
    onDragEnd(e) {
        this.isDragging = false;
        document.body.classList.remove('dragging');
    }
    
    // 触摸开始
    onTouchStart(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.isDragging = true;
            this.dragStartX = touch.clientX;
            this.dragStartY = touch.clientY;
            document.body.classList.add('dragging');
        }
    }
    
    // 触摸移动
    onTouchMove(e) {
        if (!this.isDragging || e.touches.length === 0) return;
        
        e.preventDefault(); // 防止页面滚动
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - this.dragStartX);
        const deltaY = Math.abs(touch.clientY - this.dragStartY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // 更新进度条
        const progress = Math.min(100, (distance / this.dragThreshold) * 100);
        this.shakeProgress = progress;
        this.updateProgress();
        
        // 如果拖拽距离足够，触发取消
        if (distance >= this.dragThreshold) {
            this.onShakeComplete();
            this.isDragging = false;
            document.body.classList.remove('dragging');
        }
    }
    
    // 触摸结束
    onTouchEnd(e) {
        this.isDragging = false;
        document.body.classList.remove('dragging');
    }
    
    // 鼠标移动检测（原有的晃动检测）
    onMouseMove(e) {
        // 如果正在拖拽，不进行晃动检测
        if (this.isDragging) return;
        
        this.positions.push({ x: e.clientX, y: e.clientY, time: Date.now() });
        
        if (this.positions.length > this.maxPositions) {
            this.positions.shift();
        }
        
        if (this.positions.length >= this.maxPositions) {
            const shake = this.calculateShake();
            
            if (shake > this.shakeThreshold) {
                this.isShaking = true;
                this.shakeProgress = Math.min(this.requiredShake, this.shakeProgress + 10);
                this.updateProgress();
                
                if (this.shakeProgress >= this.requiredShake) {
                    this.onShakeComplete();
                    this.shakeProgress = 0;
                    this.positions = [];
                }
            }
        }
    }
    
    calculateShake() {
        let totalDistance = 0;
        
        for (let i = 1; i < this.positions.length; i++) {
            const dx = this.positions[i].x - this.positions[i - 1].x;
            const dy = this.positions[i].y - this.positions[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }
        
        return totalDistance;
    }
    
    updateProgress() {
        const progressBar = document.getElementById('shakeProgress');
        if (progressBar) {
            progressBar.style.width = `${this.shakeProgress}%`;
        }
    }
}

// ==================== 倒计时管理器 ====================
class CountdownManager {
    constructor() {
        this.totalTime = 10; // 10秒倒计时
        this.remainingTime = this.totalTime;
        this.isRunning = true;
        this.isCancelled = false;
        
        // DOM 元素
        this.countdownNumber = document.getElementById('countdownNumber');
        this.progressCircle = document.getElementById('progressCircle');
        this.successOverlay = document.getElementById('successOverlay');
        this.currentTimeElement = document.getElementById('currentTime');
        
        // 圆环参数
        this.circleRadius = 90;
        this.circleCircumference = 2 * Math.PI * this.circleRadius;
        
        this.init();
    }
    
    init() {
        // 初始化进度圆环
        this.progressCircle.style.strokeDasharray = this.circleCircumference;
        this.progressCircle.style.strokeDashoffset = 0;
        
        // 初始化粒子系统
        new ParticleSystem();
        
        // 初始化鼠标晃动检测
        new MouseShakeDetector(() => this.onShakeComplete());
        
        // 更新时间
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 1000);
        
        // 开始倒计时
        this.startCountdown();
    }
    
    updateCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        this.currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    startCountdown() {
        const tick = () => {
            if (!this.isRunning) return;
            
            this.remainingTime--;
            this.updateDisplay();
            
            // 倒计时结束
            if (this.remainingTime <= 0) {
                this.executeShutdown();
                return;
            }
            
            setTimeout(tick, 1000);
        };
        
        setTimeout(tick, 1000);
    }
    
    updateDisplay() {
        // 更新数字
        this.countdownNumber.textContent = this.remainingTime;
        
        // 更新圆环进度
    const progress = (this.totalTime - this.remainingTime) / this.totalTime;
    this.progressCircle.style.strokeDashoffset = this.circleCircumference * progress;
        
        if (this.remainingTime <= 3 && this.remainingTime > 0) {
            this.countdownNumber.classList.add('urgent');
        } else {
            this.countdownNumber.classList.remove('urgent');
        }
    }
    
    onShakeComplete() {
        if (this.isCancelled || !this.isRunning) return;
        
        this.isCancelled = true;
        this.isRunning = false;
        
        // 显示成功动画
        this.successOverlay.classList.add('show');
        
        // 2秒后关闭窗口
        setTimeout(() => {
            this.closeWindow();
        }, 2000);
    }
    
    executeShutdown() {
        this.isRunning = false;
        if (window.electronAPI?.executeShutdown) {
            window.electronAPI.executeShutdown();
        }
        this.closeWindow();
    }
    
    closeWindow() {
        if (window.electronAPI?.closeCountdownWindow) {
            window.electronAPI.closeCountdownWindow();
        }
    }
}

// ==================== 页面加载完成后初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    new CountdownManager();
});
