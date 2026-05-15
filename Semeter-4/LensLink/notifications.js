/**
 * notifications.js - Global Toast Notification System
 * Replaces standard alert() and confirm() with a modern, non-blocking UI.
 */

(function () {
    // Create container if it doesn't exist
    function ensureContainer() {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Show a toast notification
     * @param {string} message - The text to display
     * @param {string} type - 'success', 'error', 'info', 'warning'
     * @param {number} duration - Time in ms before auto-close (default 4000)
     */
    window.showToast = function (message, type = 'info', duration = 4000) {
        const container = ensureContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let iconMarkup = '';
        switch (type) {
            case 'success': iconMarkup = '<i class="fa-solid fa-circle-check"></i>'; break;
            case 'error': iconMarkup = '<i class="fa-solid fa-circle-xmark"></i>'; break;
            case 'warning': iconMarkup = '<i class="fa-solid fa-triangle-exclamation"></i>'; break;
            default: iconMarkup = '<i class="fa-solid fa-circle-info"></i>'; break;
        }

        toast.innerHTML = `
            <div class="toast-icon">${iconMarkup}</div>
            <div class="toast-content">${message}</div>
            <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
            <div class="toast-progress"></div>
        `;

        container.appendChild(toast);

        // Progress bar animation
        const progress = toast.querySelector('.toast-progress');
        progress.style.transition = `width ${duration}ms linear`;
        setTimeout(() => {
            progress.style.width = '100%';
        }, 10);

        // Auto close
        const timer = setTimeout(() => {
            closeToast(toast);
        }, duration);

        // Manual close
        toast.querySelector('.toast-close').onclick = () => {
            clearTimeout(timer);
            closeToast(toast);
        };
    };

    /**
     * Show a confirmation toast with Confirm / Cancel buttons
     * Replaces native confirm() dialogs.
     * @param {string} message - Question to display
     * @param {function} onConfirm - Called when user clicks Confirm
     */
    window.showConfirmToast = function (message, onConfirm) {
        const container = ensureContainer();
        const toast = document.createElement('div');
        toast.className = 'toast toast-warning toast-confirm';

        toast.innerHTML = `
            <div class="toast-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="toast-body">
                <div class="toast-content">${message}</div>
                <div class="toast-actions">
                    <button class="toast-action-confirm">Confirm</button>
                    <button class="toast-action-cancel">Cancel</button>
                </div>
            </div>
            <div class="toast-progress"></div>
        `;

        container.appendChild(toast);

        // Auto-cancel after 8 seconds
        const autoTimer = setTimeout(() => closeToast(toast), 8000);

        toast.querySelector('.toast-action-confirm').onclick = () => {
            clearTimeout(autoTimer);
            closeToast(toast);
            onConfirm();
        };

        toast.querySelector('.toast-action-cancel').onclick = () => {
            clearTimeout(autoTimer);
            closeToast(toast);
        };
    };

    function closeToast(toast) {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }

})();