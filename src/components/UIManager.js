import { formatTime, formatDays } from '../utils/timeUtils.js';

export class UIManager {
    constructor() {
        this.scheduleList = document.querySelector('#scheduleList');
    }

    updateScheduleList(schedules) {
        this.scheduleList.innerHTML = '';

        if (schedules.length === 0) {
            return; // 空状态由 CSS 处理
        }

        schedules.forEach((schedule, index) => {
            const card = document.createElement('div');
            card.className = 'schedule-card';

            const timeDisplay = formatTime(schedule.time);
            const dayNames = formatDays(schedule.days);

            // 如果是全周，显示"每天"
            const daysText = schedule.days.length === 7
                ? '每天'
                : dayNames;

            const organizeTag = schedule.organizeDesktop
                ? `<span class="schedule-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    整理桌面
                </span>`
                : '';

            card.innerHTML = `
                <div class="schedule-info">
                    <div class="schedule-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div class="schedule-details">
                        <div class="schedule-time">${timeDisplay}</div>
                        <div class="schedule-days">
                            <span class="schedule-days-text">${daysText}</span>
                            ${organizeTag}
                        </div>
                    </div>
                </div>
                <div class="schedule-actions">
                    <button class="btn-icon danger" onclick="deleteSchedule(${index})" title="删除计划">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                    </button>
                </div>
            `;

            this.scheduleList.appendChild(card);
        });
    }
}
