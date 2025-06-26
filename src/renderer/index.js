import { ScheduleService } from '../services/ScheduleService.js';
import { UIManager } from '../components/UIManager.js';
import { ModalManager } from '../components/ModalManager.js';
import { parseTimeInput } from '../utils/timeUtils.js';
import { MESSAGES, SELECTORS } from '../config/constants.js';

const scheduleService = new ScheduleService();
const uiManager = new UIManager();
const modalManager = new ModalManager();

async function initializePage() {
    try {
        const schedules = await scheduleService.loadSchedules();
        uiManager.updateScheduleList(schedules);
    } catch (error) {
        console.error('加载计划失败:', error);
    }
}

function addSchedule() {
    const timeInput = document.querySelector(SELECTORS.TIME_INPUT);
    const dayCheckboxes = document.querySelectorAll(SELECTORS.DAY_CHECKBOXES);

    const selectedDays = Array.from(dayCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => parseInt(checkbox.value));

    if (timeInput.value && selectedDays.length > 0) {
        const newSchedule = {
            time: parseTimeInput(timeInput.value),
            days: selectedDays
        };

        scheduleService.addSchedule(newSchedule);
        uiManager.updateScheduleList(scheduleService.getSchedules());
        modalManager.closeAddScheduleModal();
    } else {
        modalManager.showInfoModal(MESSAGES.VALIDATION_ERROR);
    }
}

function deleteSchedule(index) {
    if (confirm(MESSAGES.CONFIRM_DELETE)) {
        scheduleService.deleteSchedule(index);
        uiManager.updateScheduleList(scheduleService.getSchedules());
    }
}

window.deleteSchedule = deleteSchedule;

document.querySelector(SELECTORS.OPEN_MODAL_BTN).addEventListener('click', () => modalManager.openAddScheduleModal());
document.querySelector(SELECTORS.ADD_SCHEDULE_BTN).addEventListener('click', addSchedule);
document.addEventListener('DOMContentLoaded', initializePage);

document.querySelector(SELECTORS.DEBUG_INFO).innerText = navigator.userAgent;
