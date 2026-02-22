// ===== 工具函数模块 =====

export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);
export const uuid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

/**
 * 颜色调整工具
 * @param {string} hex - 十六进制颜色
 * @param {number} amount - 调整量 (正值变亮，负值变暗)
 */
export function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Toast 消息提示
 */
export function showToast(message, type = 'success') {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast active ' + type;
    setTimeout(() => toast.classList.remove('active'), 3000);
}
