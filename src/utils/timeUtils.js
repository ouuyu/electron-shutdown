import { DAYS_OF_WEEK } from '../config/constants.js';

export function formatTime(timeObj) {
    if (typeof timeObj === 'string') {
        return timeObj.replace(/-/g, ':');
    }

    const hh = timeObj.hh.toString().padStart(2, '0');
    const mm = timeObj.mm.toString().padStart(2, '0');
    const ss = timeObj.ss.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

export function formatDays(dayNumbers) {
    return dayNumbers.map(d => DAYS_OF_WEEK[d - 1]).join(', ');
}

export function parseTimeInput(timeString) {
    const [hours, minutes, seconds] = timeString.split(':');
    return {
        hh: parseInt(hours) || 0,
        mm: parseInt(minutes) || 0,
        ss: parseInt(seconds) || 0
    };
}
