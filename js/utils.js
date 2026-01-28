// ===== 工具函数模块 =====

/**
 * DOM 单选择器
 * @param {string} sel - CSS 选择器
 * @returns {Element|null}
 */
export const $ = (sel) => document.querySelector(sel);

/**
 * DOM 多选择器
 * @param {string} sel - CSS 选择器
 * @returns {NodeList}
 */
export const $$ = (sel) => document.querySelectorAll(sel);

/**
 * 生成唯一 ID
 * @returns {string}
 */
export const uuid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

/**
 * 颜色调整工具
 * @param {string} hex - 十六进制颜色
 * @param {number} amount - 调整量
 * @returns {string}
 */
export function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Toast 提示
 * @param {string} message - 提示消息
 * @param {string} type - 类型 ('success'|'error')
 */
export function showToast(message, type = 'success') {
    const toast = $('#toast');
    if (toast) {
        toast.textContent = message;
        toast.className = 'toast active ' + type;
        setTimeout(() => toast.classList.remove('active'), 3000);
    }
}
