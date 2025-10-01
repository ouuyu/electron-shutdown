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
            console.error('加载计划失败', error);
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
            console.error('更新配置失败', error);
        }
    }
}
