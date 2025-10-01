import { formatTime, formatDays } from '../utils/timeUtils.js';

export class UIManager {
    constructor() {
        this.scheduleList = document.querySelector('#scheduleList');
    }

    updateScheduleList(schedules) {
        this.scheduleList.innerHTML = '';

        if (schedules.length === 0) {
            this.scheduleList.innerHTML = `<p class="text-muted text-center pt-3">暂无定时关机计划</p>`;
            return;
        }

        schedules.forEach((schedule, index) => {
            const item = document.createElement('div');
            item.className = 'schedule-item';

            const timeDisplay = formatTime(schedule.time);
            const dayNames = formatDays(schedule.days);
            const organizeTag = schedule.organizeDesktop ? '<span class="badge bg-success ms-2">整理桌面</span>' : '';

            item.innerHTML = `
                <span>时间: ${timeDisplay} 星期: ${dayNames} ${organizeTag}</span>
                <button class="btn btn-danger btn-sm" onclick="deleteSchedule(${index})">删除</button>
            `;

            this.scheduleList.appendChild(item);
        });
    }
}
