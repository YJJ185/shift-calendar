// ===== 移动端功能模块 =====
// 侧边栏控制、手势滑动、移动端导出菜单、底部导航

import { $, $$, showToast } from './utils.js';
import { navigateMonth, goToToday } from './calendar.js';
import { openHistoryModal } from './modals.js';
import { exportAsImage, exportAsJson } from './export.js';

// ===== 移动端侧边栏控制 =====

export function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = $('#sidebarOverlay');

    if (sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
    } else {
        sidebar.classList.add('mobile-open');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

export function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = $('#sidebarOverlay');

    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
}

// ===== 手势滑动 =====

let touchStartX = 0;
let touchEndX = 0;

export function initGestures() {
    const container = $('#calendarContainer');
    if (!container) return;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50;
    const container = $('#calendarContainer');

    if (Math.abs(diff) < threshold) return;

    if (diff > 0) {
        container.classList.add('swipe-left');
        navigateMonth(1);
    } else {
        container.classList.add('swipe-right');
        navigateMonth(-1);
    }

    setTimeout(() => {
        container.classList.remove('swipe-left', 'swipe-right');
    }, 300);
}

// ===== 移动端导出菜单 =====

export function showMobileExportMenu() {
    const existingMenu = $('#mobileExportMenu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'mobileExportMenu';
    menu.className = 'mobile-export-menu';
    menu.innerHTML = `
        <div class="mobile-export-overlay"></div>
        <div class="mobile-export-content">
            <div class="mobile-export-header">导出选项</div>
            <button class="mobile-export-item" data-action="image">
                🖼️ 导出为图片
            </button>
            <button class="mobile-export-item" data-action="json">
                💾 导出数据备份
            </button>
            <button class="mobile-export-item" data-action="import">
                📂 导入数据
            </button>
            <button class="mobile-export-item cancel">
                取消
            </button>
        </div>
    `;
    document.body.appendChild(menu);

    requestAnimationFrame(() => {
        menu.classList.add('active');
    });

    menu.querySelector('.mobile-export-overlay').addEventListener('click', closeMobileExportMenu);
    menu.querySelector('.cancel').addEventListener('click', closeMobileExportMenu);

    menu.querySelectorAll('.mobile-export-item[data-action]').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            closeMobileExportMenu();
            if (action === 'image') exportAsImage();
            else if (action === 'json') exportAsJson();
            else if (action === 'import') $('#importJsonBtn')?.click();
        });
    });
}

export function closeMobileExportMenu() {
    const menu = $('#mobileExportMenu');
    if (menu) {
        menu.classList.remove('active');
        setTimeout(() => menu.remove(), 300);
    }
}

// ===== 初始化移动端事件 =====

export function initMobileEvents() {
    // 底部导航
    $('#mobileNavToday')?.addEventListener('click', () => {
        closeMobileSidebar();
        goToToday();
        showToast('已跳转到今天');
    });

    $('#mobileNavGenerate')?.addEventListener('click', () => {
        toggleMobileSidebar();
        const tabs = $$('.sidebar-tab');
        const panes = {
            'schedule': $('#tabSchedule'),
            'stats': $('#tabStats'),
            'settings': $('#tabSettings')
        };
        tabs.forEach(t => t.classList.remove('active'));
        Object.values(panes).forEach(p => p?.classList.remove('active'));
        const scheduleTab = document.querySelector('.sidebar-tab[data-tab="schedule"]');
        scheduleTab?.classList.add('active');
        panes['schedule']?.classList.add('active');
    });

    $('#mobileNavHistory')?.addEventListener('click', () => {
        closeMobileSidebar();
        openHistoryModal();
    });

    $('#mobileNavExport')?.addEventListener('click', () => {
        closeMobileSidebar();
        showMobileExportMenu();
    });

    // 侧边栏遮罩
    $('#sidebarOverlay')?.addEventListener('click', closeMobileSidebar);
}
