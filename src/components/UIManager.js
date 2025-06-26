import { formatTime, formatDays } from '../utils/timeUtils.js';
import { MESSAGES, SELECTORS } from '../config/constants.js';

export class UIManager {
    constructor() {
        this.scheduleList = document.querySelector(SELECTORS.SCHEDULE_LIST);
    }

    updateScheduleList(schedules) {
        this.scheduleList.innerHTML = '';

        if (schedules.length === 0) {
            this.scheduleList.innerHTML = `<p class="text-muted text-center pt-3">${MESSAGES.NO_SCHEDULES}</p>`;
            return;
        }

        schedules.forEach((schedule, index) => {
            const item = document.createElement('div');
            item.className = 'schedule-item';

            const timeDisplay = formatTime(schedule.time);
            const dayNames = formatDays(schedule.days);

            item.innerHTML = `
                <span>时间: ${timeDisplay} 星期: ${dayNames}</span>
                <button class="btn btn-danger btn-sm" onclick="deleteSchedule(${index})">删除</button>
            `;

            this.scheduleList.appendChild(item);
        });
    }
}
