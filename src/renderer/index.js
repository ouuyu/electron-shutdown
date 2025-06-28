import { ScheduleService } from '../services/ScheduleService.js';
import { UIManager } from '../components/UIManager.js';
import { ModalManager } from '../components/ModalManager.js';
import { parseTimeInput } from '../utils/timeUtils.js';
import { MESSAGES, SELECTORS } from '../config/constants.js';
import { getLocationByIP } from '../utils/ip.js';

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

let currentIP = '';
let autoDetectedLocation = { province: '', city: '', district: '' };

async function loadWeatherLocation() {
    // 1. Always show auto-detected location (with IP)
    autoDetectedLocation = await getLocationByIP();
    try {
        const ipRes = await fetch('http://api.ipify.cn/');
        currentIP = (await ipRes.text()).trim();
    } catch {}
    updateAutoLocationUI();

    // 2. Load user config (manual fields)
    const userLocation = await window.electronAPI.getUserLocation();
    updateManualLocationUI(userLocation);
}

function stripSuffix(str) {
    return str.replace(/[省市区县]$/, '');
}

function updateAutoLocationUI() {
    const autoLoc = document.querySelector(SELECTORS.AUTO_LOCATION);
    const province = stripSuffix(autoDetectedLocation.province || '');
    const city = stripSuffix(autoDetectedLocation.city || '');
    const district = stripSuffix(autoDetectedLocation.district || '');
    autoLoc.textContent = `IP: ${currentIP || '未知'}  ${province} ${city} ${district}`.trim();
}

function updateManualLocationUI(location) {
    const provinceInput = document.querySelector(SELECTORS.PROVINCE_INPUT);
    const cityInput = document.querySelector(SELECTORS.CITY_INPUT);
    const districtInput = document.querySelector(SELECTORS.DISTRICT_INPUT);
    provinceInput.value = location && location.province ? location.province : '';
    cityInput.value = location && location.city ? location.city : '';
    districtInput.value = location && location.district ? location.district : '';
}

document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    loadWeatherLocation();

    document.querySelector(SELECTORS.SAVE_LOCATION_BTN).addEventListener('click', async () => {
        const province = document.querySelector(SELECTORS.PROVINCE_INPUT).value.trim();
        const city = document.querySelector(SELECTORS.CITY_INPUT).value.trim();
        const district = document.querySelector(SELECTORS.DISTRICT_INPUT).value.trim();
        const location = { province, city, district };
        const result = await window.electronAPI.setUserLocation(location);
        if (result && result.success) {
            updateManualLocationUI(location);
            alert('保存成功！');
        } else {
            alert('保存失败');
        }
    });

    document.querySelector(SELECTORS.DEBUG_INFO).innerText = navigator.userAgent;
});
