// ===== 主题切换模块 =====

import { $, $$, showToast } from './utils.js';

// 主题配置
export const THEMES = [
    { id: 'dark', name: '深色', icon: '🌙' },
    { id: 'light', name: '亮色', icon: '☀️' },
    { id: 'ocean', name: '深海蓝', icon: '🌊' },
    { id: 'forest', name: '护眼绿', icon: '🌲' },
    { id: 'sakura', name: '樱花粉', icon: '🌸' }
];

const THEME_STORAGE_KEY = 'shift-calendar-theme';

/**
 * 初始化主题
 */
export function initTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    updateThemeMenu(savedTheme);
}

/**
 * 切换主题选择器显示
 */
export function toggleTheme() {
    const selector = $('#themeSelector');
    if (selector) {
        selector.classList.toggle('active');
    }
}

/**
 * 选择主题
 * @param {string} themeId
 */
export function selectTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    updateThemeIcon(themeId);
    updateThemeMenu(themeId);

    const theme = THEMES.find(t => t.id === themeId);
    showToast(`已切换到${theme?.name || themeId}主题`);

    // 关闭下拉菜单
    const selector = $('#themeSelector');
    if (selector) {
        selector.classList.remove('active');
    }
}

/**
 * 更新主题图标
 * @param {string} theme
 */
function updateThemeIcon(theme) {
    const icon = $('#themeIcon');
    const themeInfo = THEMES.find(t => t.id === theme);
    if (icon && themeInfo) {
        icon.textContent = themeInfo.icon;
    }
}

/**
 * 更新主题菜单选中状态
 * @param {string} currentTheme
 */
function updateThemeMenu(currentTheme) {
    $$('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
}

/**
 * 初始化主题相关事件
 */
export function initThemeEvents() {
    // 主题切换按钮
    const themeToggleBtn = $('#themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // 主题选项按钮
    $$('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => selectTheme(btn.dataset.theme));
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
        const selector = $('#themeSelector');
        if (selector && !selector.contains(e.target)) {
            selector.classList.remove('active');
        }
    });
}
