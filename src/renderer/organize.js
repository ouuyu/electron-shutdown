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

        // 检测是否有关机功能（通过是否存在滑动区域判断）
        this.hasShutdown = !!this.slideText;

        this.init();
    }

    init() {
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

        // 仅在无关机模式下添加关闭功能
        if (!this.hasShutdown) {
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
        this.updateProgress(100, '整理完成！');
        this.addLog('桌面整理完成！', 'success');

        if (this.hasShutdown) {
            // 有关机功能：显示简单的完成标记
            const spinner = document.querySelector('.progress-spinner');
            if (spinner) {
                spinner.style.display = 'none';
            }

            // 更新滑动提示文本
            if (this.slideText) {
                this.slideText.textContent = '整理完成，关机倒计时继续';
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
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new OrganizeManager();
});
