import { ScheduleService } from '../services/ScheduleService.js';
import { UIManager } from '../components/UIManager.js';
import { ModalManager } from '../components/ModalManager.js';
import { parseTimeInput } from '../utils/timeUtils.js';

const scheduleService = new ScheduleService();
const uiManager = new UIManager();
const modalManager = new ModalManager();

// 侧边栏折叠
function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarExpandBtn = document.getElementById('sidebarExpandBtn');

    // 从本地存储读取侧边栏状态
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
    }

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.add('collapsed');
        localStorage.setItem('sidebarCollapsed', 'true');
    });

    sidebarExpandBtn.addEventListener('click', () => {
        sidebar.classList.remove('collapsed');
        localStorage.setItem('sidebarCollapsed', 'false');
    });
}

// 导航切换
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSection = item.dataset.section;

            // 更新导航状态
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // 更新内容区域
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(`${targetSection}-section`).classList.add('active');
        });
    });
}

// 自定义时间选择器
function initTimePicker() {
    const hourInput = document.getElementById('hourInput');
    const minuteInput = document.getElementById('minuteInput');
    const secondInput = document.getElementById('secondInput');
    const timeInput = document.getElementById('timeInput');

    // 格式化为两位数
    const pad = (num) => String(num).padStart(2, '0');

    // 限制输入范围并格式化
    const handleTimeInput = (input, max) => {
        input.addEventListener('input', () => {
            let value = parseInt(input.value) || 0;
            if (value > max) value = max;
            if (value < 0) value = 0;
            input.value = pad(value);
            updateHiddenTimeInput();
        });

        input.addEventListener('blur', () => {
            input.value = pad(parseInt(input.value) || 0);
            updateHiddenTimeInput();
        });

        // 支持上下箭头键
        input.addEventListener('keydown', (e) => {
            let value = parseInt(input.value) || 0;
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                value = (value + 1) > max ? 0 : value + 1;
                input.value = pad(value);
                updateHiddenTimeInput();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                value = (value - 1) < 0 ? max : value - 1;
                input.value = pad(value);
                updateHiddenTimeInput();
            }
        });

        // 鼠标滚轮支持
        input.addEventListener('wheel', (e) => {
            e.preventDefault();
            let value = parseInt(input.value) || 0;
            if (e.deltaY < 0) {
                value = (value + 1) > max ? 0 : value + 1;
            } else {
                value = (value - 1) < 0 ? max : value - 1;
            }
            input.value = pad(value);
            updateHiddenTimeInput();
        });
    };

    const updateHiddenTimeInput = () => {
        const hour = pad(parseInt(hourInput.value) || 0);
        const minute = pad(parseInt(minuteInput.value) || 0);
        const second = pad(parseInt(secondInput.value) || 0);
        timeInput.value = `${hour}:${minute}:${second}`;
    };

    handleTimeInput(hourInput, 23);
    handleTimeInput(minuteInput, 59);
    handleTimeInput(secondInput, 59);

    // 初始化隐藏的 time input
    updateHiddenTimeInput();
}

// 密码可见性切换
function initPasswordToggle() {
    const toggleBtn = document.querySelector('#toggleApiKeyBtn');
    const apiKeyInput = document.querySelector('#apiKeyInput');

    if (toggleBtn && apiKeyInput) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';

            // 更新图标
            const eyeIcon = toggleBtn.querySelector('.eye-icon');
            if (isPassword) {
                eyeIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>`;
            } else {
                eyeIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>`;
            }
        });
    }
}

async function initializePage() {
    try {
        const schedules = await scheduleService.loadSchedules();
        uiManager.updateScheduleList(schedules);

        // 加载LLM配置
        const llmConfig = await window.electronAPI.getLLMConfig();
        if (llmConfig) {
            document.querySelector('#baseUrlInput').value = llmConfig.baseUrl || '';
            document.querySelector('#apiKeyInput').value = llmConfig.apiKey || '';
            document.querySelector('#modelInput').value = llmConfig.model || '';
        }

        // 初始化导航和密码切换
        initSidebarToggle();
        initNavigation();
        initPasswordToggle();
        initTimePicker();

        // 更新计划数量状态
        updateScheduleStatus(schedules.length);
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

function updateScheduleStatus(count) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = count > 0 ? `${count} 个计划运行中` : '系统正常';
    }
}

function addSchedule() {
    const timeInput = document.querySelector('#timeInput');
    const dayCheckboxes = document.querySelectorAll('.weekday-item input[type="checkbox"]');
    const organizeDesktopCheck = document.querySelector('#organizeDesktopCheck');

    const selectedDays = Array.from(dayCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => parseInt(checkbox.value));

    if (timeInput.value && selectedDays.length > 0) {
        const newSchedule = {
            time: parseTimeInput(timeInput.value),
            days: selectedDays,
            organizeDesktop: organizeDesktopCheck.checked
        };

        scheduleService.addSchedule(newSchedule);
        const schedules = scheduleService.getSchedules();
        uiManager.updateScheduleList(schedules);
        updateScheduleStatus(schedules.length);
        modalManager.closeAddScheduleModal();

        // 重置表单
        const hourInput = document.getElementById('hourInput');
        const minuteInput = document.getElementById('minuteInput');
        const secondInput = document.getElementById('secondInput');

        if (hourInput) hourInput.value = '22';
        if (minuteInput) minuteInput.value = '00';
        if (secondInput) secondInput.value = '00';

        timeInput.value = '';
        dayCheckboxes.forEach(cb => cb.checked = false);
        organizeDesktopCheck.checked = false;
    } else {
        modalManager.showInfoModal('请选择时间和至少一个星期。');
    }
}

function deleteSchedule(index) {
    scheduleService.deleteSchedule(index);
    const schedules = scheduleService.getSchedules();
    uiManager.updateScheduleList(schedules);
    updateScheduleStatus(schedules.length);
}

async function saveLLMConfig() {
    const baseUrl = document.querySelector('#baseUrlInput').value.trim();
    const apiKey = document.querySelector('#apiKeyInput').value.trim();
    const model = document.querySelector('#modelInput').value.trim();
    const saveBtn = document.querySelector('#saveLLMConfigBtn');

    if (!baseUrl || !apiKey || !model) {
        modalManager.showInfoModal('请填写完整的AI模型配置信息');
        return;
    }

    // 按钮加载状态
    const originalHTML = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg><span>保存中...</span>';

    try {
        await window.electronAPI.setLLMConfig({ baseUrl, apiKey, model });
        modalManager.showInfoModal('AI模型配置保存成功');
    } catch (error) {
        modalManager.showInfoModal('保存失败：' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHTML;
    }
}

async function testLLMConnection() {
    const baseUrl = document.querySelector('#baseUrlInput').value.trim();
    const apiKey = document.querySelector('#apiKeyInput').value.trim();
    const model = document.querySelector('#modelInput').value.trim();

    const testResultArea = document.querySelector('#testResultArea');
    const testResultContent = document.querySelector('#testResultContent');
    const testBtn = document.querySelector('#testLLMConnBtn');

    if (!baseUrl || !apiKey || !model) {
        modalManager.showInfoModal('请先填写完整的AI模型配置信息');
        return;
    }

    // 显示测试中状态
    const originalHTML = testBtn.innerHTML;
    testBtn.disabled = true;
    testBtn.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg><span>测试中...</span>';

    testResultArea.classList.remove('d-none');
    testResultArea.classList.remove('success', 'error');
    testResultContent.innerHTML = '🔄 正在测试连接，请稍候...';

    try {
        const result = await window.electronAPI.testLLMConnection({ baseUrl, apiKey, model });

        if (result.success) {
            testResultArea.classList.add('success');
            testResultContent.innerHTML = `
                <strong>✅ 连接成功！</strong><br>
                模型: ${result.model || model}<br>
                响应时间: ${result.responseTime}ms
            `;
        } else {
            testResultArea.classList.add('error');
            testResultContent.innerHTML = `
                <strong>❌ 连接失败</strong><br>
                ${result.error}
            `;
        }
    } catch (error) {
        testResultArea.classList.add('error');
        testResultContent.innerHTML = `
            <strong>❌ 测试失败</strong><br>
            ${error.message}
        `;
    } finally {
        testBtn.disabled = false;
        testBtn.innerHTML = originalHTML;
    }
}

function fillDefaultConfig() {
    document.querySelector('#baseUrlInput').value = 'https://lm.wordcarve.com/v1';
    document.querySelector('#apiKeyInput').value = 'sk-z8nVRBLjpVl7wLOvRK4pdeEj0uP9koXcDlKn0ofe8WEhYSnM';
    document.querySelector('#modelInput').value = 'gpt-4o-mini';

    // 隐藏测试结果
    const testResultArea = document.querySelector('#testResultArea');
    testResultArea.classList.add('d-none');
}

window.deleteSchedule = deleteSchedule;

document.querySelector('#openModalBtn').addEventListener('click', () => modalManager.openAddScheduleModal());
document.querySelector('#addScheduleBtn').addEventListener('click', addSchedule);
document.querySelector('#saveLLMConfigBtn').addEventListener('click', saveLLMConfig);
document.querySelector('#testLLMConnBtn').addEventListener('click', testLLMConnection);
document.querySelector('#fillDefaultConfigBtn').addEventListener('click', fillDefaultConfig);
document.addEventListener('DOMContentLoaded', initializePage);
