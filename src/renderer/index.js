import { ScheduleService } from '../services/ScheduleService.js';
import { UIManager } from '../components/UIManager.js';
import { ModalManager } from '../components/ModalManager.js';
import { parseTimeInput } from '../utils/timeUtils.js';

const scheduleService = new ScheduleService();
const uiManager = new UIManager();
const modalManager = new ModalManager();

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
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

function addSchedule() {
    const timeInput = document.querySelector('#timeInput');
    const dayCheckboxes = document.querySelectorAll('.day-checkbox input[type="checkbox"]');
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
        uiManager.updateScheduleList(scheduleService.getSchedules());
        modalManager.closeAddScheduleModal();
    } else {
        modalManager.showInfoModal('请选择时间和至少一个星期。');
    }
}

function deleteSchedule(index) {
    if (confirm('确定要删除这个计划吗？')) {
        scheduleService.deleteSchedule(index);
        uiManager.updateScheduleList(scheduleService.getSchedules());
    }
}

async function saveLLMConfig() {
    const baseUrl = document.querySelector('#baseUrlInput').value.trim();
    const apiKey = document.querySelector('#apiKeyInput').value.trim();
    const model = document.querySelector('#modelInput').value.trim();

    if (!baseUrl || !apiKey || !model) {
        modalManager.showInfoModal('请填写完整的AI模型配置信息');
        return;
    }

    try {
        await window.electronAPI.setLLMConfig({ baseUrl, apiKey, model });
        modalManager.showInfoModal('AI模型配置保存成功');
    } catch (error) {
        modalManager.showInfoModal('保存失败：' + error.message);
    }
}

async function testLLMConnection() {
    const baseUrl = document.querySelector('#baseUrlInput').value.trim();
    const apiKey = document.querySelector('#apiKeyInput').value.trim();
    const model = document.querySelector('#modelInput').value.trim();

    const testResultArea = document.querySelector('#testResultArea');
    const testResultContent = document.querySelector('#testResultContent');
    const configInfo = document.querySelector('#configInfo');
    const testBtn = document.querySelector('#testLLMConnBtn');

    if (!baseUrl || !apiKey || !model) {
        modalManager.showInfoModal('请先填写完整的AI模型配置信息');
        return;
    }

    // 显示测试中状态
    testBtn.disabled = true;
    testBtn.textContent = '测试中...';
    testResultArea.classList.remove('d-none');
    testResultContent.className = 'alert alert-info mb-0';
    testResultContent.innerHTML = '<strong>🔄 正在测试连接...</strong><br>请稍候，正在尝试连接到LLM服务...';
    configInfo.classList.add('d-none');

    try {
        const result = await window.electronAPI.testLLMConnection({ baseUrl, apiKey, model });

        if (result.success) {
            testResultContent.className = 'alert alert-success mb-0';
            testResultContent.innerHTML = `
                <strong>✅ 连接成功！</strong><br>
                模型: ${result.model || model}<br>
                响应时间: ${result.responseTime}ms<br>
                ${result.message ? result.message : ''}
            `;
        } else {
            testResultContent.className = 'alert alert-danger mb-0';
            testResultContent.innerHTML = `
                <strong>❌ 连接失败</strong><br>
                错误信息: ${result.error}
            `;
        }
    } catch (error) {
        testResultContent.className = 'alert alert-danger mb-0';
        testResultContent.innerHTML = `
            <strong>❌ 测试失败</strong><br>
            错误信息: ${error.message}
        `;
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = '测试连接';
    }
}

function fillDefaultConfig() {
    document.querySelector('#baseUrlInput').value = 'https://lm.wordcarve.com/v1';
    document.querySelector('#apiKeyInput').value = 'sk-z8nVRBLjpVl7wLOvRK4pdeEj0uP9koXcDlKn0ofe8WEhYSnM';
    document.querySelector('#modelInput').value = 'gpt-4o-mini';

    // 隐藏测试结果
    const testResultArea = document.querySelector('#testResultArea');
    const configInfo = document.querySelector('#configInfo');
    testResultArea.classList.add('d-none');
    configInfo.classList.remove('d-none');
}

window.deleteSchedule = deleteSchedule;

document.querySelector('#openModalBtn').addEventListener('click', () => modalManager.openAddScheduleModal());
document.querySelector('#addScheduleBtn').addEventListener('click', addSchedule);
document.querySelector('#saveLLMConfigBtn').addEventListener('click', saveLLMConfig);
document.querySelector('#testLLMConnBtn').addEventListener('click', testLLMConnection);
document.querySelector('#fillDefaultConfigBtn').addEventListener('click', fillDefaultConfig);
document.addEventListener('DOMContentLoaded', initializePage);
