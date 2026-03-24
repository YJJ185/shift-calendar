// ===== 入口文件 =====
// 导入所有模块并初始化应用

import { state, loadState } from './state.js';
import { initShiftTypeEvents, syncDraftFromSchedule, resetDraftForNoActiveSchedule } from './shiftTypes.js';
import { initPatternEvents } from './patterns.js';
import { renderCalendar, initCalendarEvents } from './calendar.js';
import { initExportEvents } from './export.js';
import { initTheme, initThemeEvents } from './theme.js';
import { initEditShiftModal, initModalEvents } from './modals.js';
import { loadImportantDates, loadTodos, renderImportantDatesList, initFeatureEvents } from './features.js';
import { initGestures, initMobileEvents } from './mobile.js';
import { initSidebarTabs, initDayHoverPreview, initKeyboardShortcuts, initRippleEffect } from './interactions.js';
import { fetchHolidaysFromAPI } from './holidays.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 加载数据
    loadState();
    loadImportantDates();
    loadTodos();

    // 2. 初始化 UI 组件
    initEditShiftModal();

    const activeSchedule = state.schedules.find(schedule => schedule.id === state.activeScheduleId) || null;
    if (activeSchedule) {
        syncDraftFromSchedule(activeSchedule);
    } else {
        resetDraftForNoActiveSchedule();
    }

    // 3. 渲染
    renderCalendar();
    renderImportantDatesList();

    // 4. 绑定事件
    initShiftTypeEvents();
    initPatternEvents();
    initCalendarEvents();
    initExportEvents();
    initTheme();
    initThemeEvents();
    initModalEvents();
    initFeatureEvents();
    initMobileEvents();
    initSidebarTabs();
    initGestures();
    initRippleEffect();

    // 5. 桌面端悬停预览
    if (window.innerWidth > 768) {
        initDayHoverPreview();
    }

    // 6. 键盘快捷键
    initKeyboardShortcuts();

    // 8. 后台获取最新假期数据
    const currentYear = new Date().getFullYear();
    fetchHolidaysFromAPI(currentYear);
    fetchHolidaysFromAPI(currentYear + 1);
});
