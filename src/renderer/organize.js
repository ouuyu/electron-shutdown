// 滑动取消关机功能（重构版 - 滑到位立即取消）
class SlideToCancel {
    constructor(onCancelComplete) {
        this.onCancelComplete = onCancelComplete;
        this.slideButton = document.getElementById('slideButton');
        this.slideProgress = document.getElementById('slideProgress');
        this.slideText = document.getElementById('slideText');
        
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.maxSlide = 0;
        this.slideThreshold = 0.88; // 需要滑动88%的距离即可取消
        this.cancelled = false;
        
        this.init();
    }
    
    init() {
        if (!this.slideButton) return;
        
        // 计算最大滑动距离
        const track = this.slideButton.parentElement;
        this.maxSlide = track.offsetWidth - this.slideButton.offsetWidth - 16;
        
        // 鼠标事件
        this.slideButton.addEventListener('mousedown', (e) => this.onDragStart(e));
        document.addEventListener('mousemove', (e) => this.onDragMove(e));
        document.addEventListener('mouseup', (e) => this.onDragEnd(e));
        
        // 触摸事件
        this.slideButton.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        // 窗口大小改变时重新计算
        window.addEventListener('resize', () => {
            const track = this.slideButton.parentElement;
            this.maxSlide = track.offsetWidth - this.slideButton.offsetWidth - 16;
        });
    }
    
    onDragStart(e) {
        if (this.cancelled) return;
        
        this.isDragging = true;
        this.startX = e.clientX;
        this.slideButton.style.transition = 'none';
        this.slideProgress.style.transition = 'none';
        
        // 添加拖拽状态
        const track = this.slideButton.parentElement;
        if (track) track.classList.add('dragging');
    }
    
    onTouchStart(e) {
        if (this.cancelled || e.touches.length === 0) return;
        
        e.preventDefault();
        this.isDragging = true;
        this.startX = e.touches[0].clientX;
        this.slideButton.style.transition = 'none';
        this.slideProgress.style.transition = 'none';
        
        // 添加拖拽状态
        const track = this.slideButton.parentElement;
        if (track) track.classList.add('dragging');
    }
    
    onDragMove(e) {
        if (!this.isDragging || this.cancelled) return;
        
        const deltaX = this.startX - e.clientX; // 向左滑动为正值
        this.currentX = Math.max(0, Math.min(deltaX, this.maxSlide));
        
        this.updatePosition();
        this.checkThreshold();
    }
    
    onTouchMove(e) {
        if (!this.isDragging || this.cancelled || e.touches.length === 0) return;
        
        e.preventDefault();
        const deltaX = this.startX - e.touches[0].clientX;
        this.currentX = Math.max(0, Math.min(deltaX, this.maxSlide));
        
        this.updatePosition();
        this.checkThreshold();
    }
    
    onDragEnd(e) {
        if (!this.isDragging || this.cancelled) return;
        
        this.isDragging = false;
        this.slideButton.style.transition = '';
        this.slideProgress.style.transition = '';
        
        // 移除拖拽状态
        const track = this.slideButton.parentElement;
        if (track) track.classList.remove('dragging');
        
        const progress = this.currentX / this.maxSlide;
        
        if (progress < this.slideThreshold) {
            // 如果没有达到阈值，回弹
            this.currentX = 0;
            this.updatePosition();
            
            // 移除阈值状态
            const shell = document.querySelector('.slide-shell');
            if (shell) shell.classList.remove('threshold-reached');
        }
    }
    
    onTouchEnd(e) {
        this.onDragEnd(e);
    }
    
    updatePosition() {
        // 更新按钮位置（向左移动）
        const translateY = this.isDragging ? '-50%' : '-50%';
        this.slideButton.style.transform = `translateY(${translateY}) translateX(-${this.currentX}px)`;
        
        // 更新进度条宽度
        const progressWidth = (this.currentX / this.maxSlide) * 100;
        this.slideProgress.style.width = `${progressWidth}%`;
    }
    
    checkThreshold() {
        const progress = this.currentX / this.maxSlide;
        const shell = document.querySelector('.slide-shell');
        
        if (progress >= this.slideThreshold && !this.cancelled) {
            // 达到阈值，立即取消关机
            if (shell) shell.classList.add('threshold-reached');
            this.completeCancel();
        } else {
            // 未达到阈值
            if (shell) shell.classList.remove('threshold-reached');
        }
    }
    
    completeCancel() {
        if (this.cancelled) return;
        
        this.cancelled = true;
        this.isDragging = false;
        
        const shell = document.querySelector('.slide-shell');
        const track = this.slideButton.parentElement;
        
        // 添加成功状态
        if (shell) {
            shell.classList.add('cancel-success');
            shell.classList.remove('threshold-reached');
        }
        if (track) track.classList.remove('dragging');
        
        // 更新文本
        if (this.slideText) {
            this.slideText.textContent = '✓ 关机已取消';
        }
        
        // 按钮滑动到最左边
        this.currentX = this.maxSlide;
        this.slideButton.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        this.slideProgress.style.transition = 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        this.updatePosition();
        
        // 延迟调用回调，让动画完成
        setTimeout(() => {
            if (this.onCancelComplete) {
                this.onCancelComplete();
            }
        }, 400);
    }
}

// 关机倒计时管理器
class ShutdownCountdown {
    constructor(onComplete) {
        this.onComplete = onComplete;
        this.countdownElement = document.getElementById('shutdownCountdown');
        this.countdownCard = document.querySelector('.countdown-card');
        this.totalTime = 10; // 10秒倒计时
        this.remainingTime = this.totalTime;
        this.isRunning = false;
        this.isCancelled = false;
        this.countdownInterval = null;
    }
    
    start() {
        if (this.isRunning || this.isCancelled) return;
        
        this.isRunning = true;
        this.updateDisplay();
        
        this.countdownInterval = setInterval(() => {
            if (this.isCancelled || !this.isRunning) {
                this.stop();
                return;
            }
            
            this.remainingTime--;
            this.updateDisplay();
            
            // 倒计时结束
            if (this.remainingTime <= 0) {
                this.stop();
                if (this.onComplete) {
                    this.onComplete();
                }
            }
        }, 1000);
    }
    
    stop() {
        this.isRunning = false;
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }
    
    cancel() {
        this.isCancelled = true;
        this.stop();
        
        // 更新显示为已取消
        if (this.countdownElement) {
            this.countdownElement.textContent = '已取消';
            this.countdownElement.style.fontSize = '1.8rem';
        }
        
        if (this.countdownCard) {
            this.countdownCard.classList.add('cancelled');
        }
    }
    
    updateDisplay() {
        if (this.countdownElement) {
            this.countdownElement.textContent = this.remainingTime;
            
            // 紧急状态（剩余3秒或更少）
            if (this.remainingTime <= 3 && this.remainingTime > 0) {
                this.countdownElement.classList.add('urgent');
            } else {
                this.countdownElement.classList.remove('urgent');
            }
        }
    }
}

// 整理桌面日志管理（精确进度版）
class OrganizeManager {
    constructor() {
        this.logsContainer = document.getElementById('organizeLogs');
        this.progressSpinner = document.getElementById('progressSpinner');
        this.completeMessage = document.getElementById('completeMessage');
        this.closeBtn = document.getElementById('closeBtn');
        this.slideText = document.getElementById('slideText');
        this.progressPercentage = document.getElementById('progressPercentage');
        this.progressStatus = document.getElementById('progressStatus');
        this.progressFill = document.getElementById('progressFill');
        this.progressMeta = document.getElementById('progressMeta');
        this.isOrganizing = true;
        this.shutdownCancelled = false;
        this.organizeCompleted = false;

        // 检测是否有关机功能（通过是否存在滑动区域判断）
        this.hasShutdown = !!this.slideText;

        this.init();
    }

    init() {
        // 初始化关机倒计时
        if (this.hasShutdown) {
            this.shutdownCountdown = new ShutdownCountdown(() => {
                this.executeShutdown();
            });
        }
        
        // 初始化滑动取消功能
        if (this.hasShutdown) {
            this.slideToCancel = new SlideToCancel(() => {
                this.onShutdownCancelled();
            });
        }
        
        // 监听来自主进程的进度更新
        window.electronAPI.onOrganizeProgress((progressData) => {
            this.updateProgress(progressData.percentage, progressData.stage, progressData.current, progressData.total);
        });

        // 监听来自主进程的日志消息
        window.electronAPI.onOrganizeLog((message) => {
            this.addLog(message);
        });

        // 监听整理完成事件
        window.electronAPI.onOrganizeComplete(() => {
            this.onComplete();
        });

        // 监听整理错误事件
        window.electronAPI.onOrganizeError((error) => {
            this.addLog(`错误: ${error}`, 'error');
            this.isOrganizing = false;
            this.updateProgress(0, '整理失败');
        });

        // 关闭功能处理
        // 关闭按钮事件
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => {
                this.closeWindow();
            });
        }

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.confirmExit();
            }
        });
    }
    
    onShutdownCancelled() {
        this.shutdownCancelled = true;
        this.addLog('✅ 已取消关机计划', 'success');
        
        // 停止倒计时
        if (this.shutdownCountdown) {
            this.shutdownCountdown.cancel();
        }
        
        // 更新进度状态
        if (this.progressStatus) {
            this.progressStatus.textContent = '已取消关机';
        }
        
        // 显示成功提示（更美观的版本）
        setTimeout(() => {
            const slideSection = document.querySelector('.slide-to-cancel');
            if (slideSection) {
                slideSection.innerHTML = `
                    <div class="slide-shell cancel-success" style="
                        background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.06) 100%);
                        border-color: rgba(16, 185, 129, 0.5);
                        padding: 32px;
                    ">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <div style="
                                width: 64px;
                                height: 64px;
                                border-radius: 50%;
                                background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
                                flex-shrink: 0;
                            ">
                                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width: 36px; height: 36px;">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                    <polyline points="22 4 12 14.01 9 11.01"/>
                                </svg>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 1.3rem; font-weight: 700; color: var(--success); margin-bottom: 6px;">
                                    关机已成功取消
                                </div>
                                <div style="font-size: 0.95rem; color: var(--text-medium);">
                                    整理完成后窗口将自动关闭
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }, 600);
    }
    
    executeShutdown() {
        if (this.shutdownCancelled) return;
        
        this.addLog('⚠️ 准备关机...', 'warning');
        
        if (window.electronAPI?.executeShutdown) {
            window.electronAPI.executeShutdown();
        }
        
        setTimeout(() => {
            this.closeWindow();
        }, 1000);
    }

    updateProgress(percentage, stage, current = null, total = null) {
        if (this.progressPercentage) {
            this.progressPercentage.textContent = `${Math.round(percentage)}%`;
        }

        let statusText = stage;
        if (current !== null && total !== null && total > 0) {
            statusText = `${stage} (${current}/${total})`;
        }

        if (this.progressStatus) {
            this.progressStatus.textContent = statusText;
        }

        if (this.progressMeta) {
            this.progressMeta.textContent = statusText;
        }

        if (this.progressFill) {
            this.progressFill.style.width = `${percentage}%`;
        }
    }

    confirmExit() {
        if (this.isOrganizing) {
            const confirmed = confirm('文件正在整理中，确定要退出吗？');
            if (confirmed) {
                this.closeWindow();
            }
        } else {
            this.closeWindow();
        }
    }

    closeWindow() {
        window.electronAPI.closeCountdownWindow();
    }

    addLog(message, type = 'info') {
        const logEntry = document.createElement('div');

        // 智能识别日志类型（基于消息内容）
        if (!type || type === 'info') {
            if (message.includes('✅') || message.includes('SUCCESS') || message.toLowerCase().includes('completed') || message.toLowerCase().includes('successful')) {
                type = 'success';
            } else if (message.includes('❌') || message.includes('ERROR') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('error')) {
                type = 'error';
            } else if (message.includes('⚠️') || message.includes('WARNING')) {
                type = 'warning';
            } else if (message.includes('📋') || message.includes('INFO') || message.includes('🤖') || message.includes('LLM') || message.includes('📁') || message.includes('FILE') || message.includes('🔍') || message.includes('PARSE') || message.includes('✏️') || message.includes('RENAME')) {
                type = 'info';
            }
        }

        logEntry.className = `log-entry ${type}`;
        // 移除时间戳，简化日志
        logEntry.innerText = message;
        this.logsContainer.appendChild(logEntry);

        // 自动滚动到底部
        this.logsContainer.scrollTop = this.logsContainer.scrollHeight;

        // 限制日志数量，保持性能
        const maxLogs = 50;
        while (this.logsContainer.children.length > maxLogs) {
            this.logsContainer.removeChild(this.logsContainer.firstChild);
        }
    }

    onComplete() {
        this.isOrganizing = false;
        this.organizeCompleted = true;
        this.updateProgress(100, '整理完成！');
        this.addLog('桌面整理完成！', 'success');

        if (this.hasShutdown) {
            // 有关机功能：开始倒计时（如果还没取消的话）
            if (!this.shutdownCancelled && this.shutdownCountdown) {
                this.shutdownCountdown.start();
            }
            
            const spinner = document.querySelector('.progress-spinner');
            if (spinner) {
                spinner.style.display = 'none';
            }

            // 更新滑动提示文本
            if (this.slideText && !this.shutdownCancelled) {
                this.slideText.textContent = '整理完成，关机倒计时已开始';
            }

            if (this.progressMeta) {
                this.progressMeta.textContent = '整理完成';
            }
        } else {
            // 无关机功能：显示完整的完成消息和关闭按钮
            if (this.progressSpinner) {
                this.progressSpinner.style.display = 'none';
            }

            const progressMetaSection = document.querySelector('.progress-meta');
            if (progressMetaSection) {
                progressMetaSection.style.display = 'none';
            }

            const progressTrack = document.querySelector('.progress-track');
            if (progressTrack) {
                progressTrack.style.display = 'none';
            }

            const progressHeader = document.querySelector('.progress-header');
            if (progressHeader) {
                progressHeader.style.alignItems = 'center';
            }

            if (this.completeMessage) {
                this.completeMessage.style.display = 'flex';
            }

            // 添加退出提示（仅在无关机模式）
            const exitHint = document.querySelector('.exit-hint');
            if (exitHint) {
                exitHint.style.display = 'block';
            }
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new OrganizeManager();
});
