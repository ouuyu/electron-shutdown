export class ModalManager {
    constructor() {
        this.addScheduleModalEl = document.getElementById('addScheduleModal');
        this.addScheduleModal = new bootstrap.Modal(this.addScheduleModalEl);

        this.infoModalEl = document.getElementById('infoModal');
        this.infoModal = new bootstrap.Modal(this.infoModalEl);
        this.infoModalBody = document.getElementById('infoModalBody');

        this.timeInput = document.querySelector('#timeInput');
        this.dayCheckboxes = document.querySelectorAll('.day-checkbox input[type="checkbox"]');
    }

    showInfoModal(message) {
        this.infoModalBody.textContent = message;
        this.infoModal.show();
    }

    openAddScheduleModal() {
        this.timeInput.value = '';
        this.dayCheckboxes.forEach(checkbox => checkbox.checked = false);
        this.addScheduleModal.show();
    }

    closeAddScheduleModal() {
        this.addScheduleModal.hide();
    }
}
