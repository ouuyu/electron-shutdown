import { MESSAGES } from '../config/constants.js';

export class ScheduleService {
    constructor() {
        this.schedules = [];
    }

    async loadSchedules() {
        try {
            this.schedules = await window.electronAPI.getShutdownSchedules();
            console.log('Load config:', this.schedules);
            return this.schedules;
        } catch (error) {
            console.error(MESSAGES.LOAD_ERROR, error);
            this.schedules = [];
            return this.schedules;
        }
    }

    addSchedule(schedule) {
        this.schedules.push(schedule);
        this.updateMainProcess();
    }

    deleteSchedule(index) {
        this.schedules.splice(index, 1);
        this.updateMainProcess();
    }

    getSchedules() {
        return this.schedules;
    }

    updateMainProcess() {
        try {
            window.electronAPI.setShutdownSchedules(this.schedules);
            console.log('Config has been sent to main thread:', this.schedules);
        } catch (error) {
            console.error(MESSAGES.UPDATE_ERROR, error);
        }
    }
}
