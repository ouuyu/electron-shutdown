export class ModalManager {
    constructor() {
        this.addScheduleModalEl = document.getElementById('addScheduleModal');
        this.infoModalEl = document.getElementById('infoModal');
        this.infoModalBody = document.getElementById('infoModalBody');

        this.timeInput = document.querySelector('#timeInput');
        this.dayCheckboxes = document.querySelectorAll('.weekday-item input[type="checkbox"]');

        this.initEventListeners();
    }

    initEventListeners() {
        // 关闭添加计划模态框
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelAddBtn = document.getElementById('cancelAddBtn');

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeAddScheduleModal());
        }
        if (cancelAddBtn) {
            cancelAddBtn.addEventListener('click', () => this.closeAddScheduleModal());
        }

        // 点击背景关闭
        this.addScheduleModalEl.addEventListener('click', (e) => {
            if (e.target === this.addScheduleModalEl) {
                this.closeAddScheduleModal();
            }
        });

        // 关闭信息模态框
        const closeInfoModalBtn = document.getElementById('closeInfoModalBtn');
        if (closeInfoModalBtn) {
            closeInfoModalBtn.addEventListener('click', () => this.closeInfoModal());
        }

        this.infoModalEl.addEventListener('click', (e) => {
            if (e.target === this.infoModalEl) {
                this.closeInfoModal();
            }
        });
    }

    showInfoModal(message) {
        this.infoModalBody.textContent = message;
        this.infoModalEl.classList.add('show');
    }

    closeInfoModal() {
        this.infoModalEl.classList.remove('show');
    }

    openAddScheduleModal() {
        // 重置隐藏的时间输入
        this.timeInput.value = '';

        // 重置自定义时间选择器
        const hourInput = document.getElementById('hourInput');
        const minuteInput = document.getElementById('minuteInput');
        const secondInput = document.getElementById('secondInput');

        if (hourInput) hourInput.value = '22';
        if (minuteInput) minuteInput.value = '00';
        if (secondInput) secondInput.value = '00';

        this.dayCheckboxes.forEach(checkbox => checkbox.checked = false);
        this.addScheduleModalEl.classList.add('show');
    }

    closeAddScheduleModal() {
        this.addScheduleModalEl.classList.remove('show');
    }
}
