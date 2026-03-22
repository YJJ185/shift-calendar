// ===== 交互功能模块 =====
// 悬停预览、键盘快捷键、侧边栏Tab切换、涟漪效果

import { $, $$, showToast, escapeHTML, safeColor } from './utils.js';
import { state } from './state.js';
import { getShiftForDate, navigateMonth, setMonthsToShow, goToToday } from './calendar.js';
import { openHistoryModal } from './modals.js';
import { closeExportDropdown } from './export.js';
import { getLunarDay } from './lunar.js';

// ===== 侧边栏 Tab 切换 =====

export function initSidebarTabs() {
    const tabs = $$('.sidebar-tab');
    const panes = {
        'schedule': $('#tabSchedule'),
        'stats': $('#tabStats'),
        'settings': $('#tabSettings')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            Object.values(panes).forEach(p => p?.classList.remove('active'));
            tab.classList.add('active');
            const targetPane = panes[tab.dataset.tab];
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // 可折叠卡片
    $$('.collapsible .collapsible-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.closest('.btn')) return;
            const card = header.closest('.collapsible');
            card.classList.toggle('collapsed');
        });
    });
}

// ===== 悬停预览 =====

export function initDayHoverPreview() {
    const previewCard = $('#dayPreviewCard');
    if (!previewCard) return;

    const calendarContainer = $('#calendarContainer');

    calendarContainer.addEventListener('mouseenter', (e) => {
        const dayEl = e.target.closest('.calendar-day:not(.empty)');
        if (!dayEl) return;
        showDayPreview(dayEl, e);
    }, true);

    calendarContainer.addEventListener('mouseleave', (e) => {
        const dayEl = e.target.closest('.calendar-day:not(.empty)');
        if (!dayEl) return;
        previewCard.classList.remove('visible');
    }, true);

    calendarContainer.addEventListener('mousemove', (e) => {
        const dayEl = e.target.closest('.calendar-day:not(.empty)');
        if (dayEl && previewCard.classList.contains('visible')) {
            positionPreviewCard(e);
        }
    });
}

function showDayPreview(dayEl, e) {
    const previewCard = $('#dayPreviewCard');
    const dateStr = dayEl.dataset.date;
    if (!dateStr) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    const hasNote = state.dayNotes && state.dayNotes[dateStr];
    const hasTodo = state.todos && state.todos[dateStr];
    const lunarInfo = getLunarDay(date);
    const isHoliday = lunarInfo && (lunarInfo.includes('节') || lunarInfo.includes('除夕') || lunarInfo.includes('元旦'));

    if (!hasNote && !hasTodo && !isHoliday) return;

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    $('#previewDate').textContent = `${month}月${day}日`;
    $('#previewWeekday').textContent = weekdays[date.getDay()];
    $('#previewLunar').textContent = lunarInfo;

    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (schedule) {
        const shift = getShiftForDate(schedule, date);
        if (shift) {
            const shiftColor = safeColor(shift.color, '#9CA3AF');
            $('#previewShift').innerHTML = `
                <span class="day-preview-shift-icon">${escapeHTML(shift.icon)}</span>
                <span class="day-preview-shift-name" style="color: ${shiftColor}">${escapeHTML(shift.name)}</span>
            `;
            $('#previewShift').style.background = shiftColor + '20';
        } else {
            $('#previewShift').innerHTML = '<span style="color: var(--text-muted)">无排班</span>';
            $('#previewShift').style.background = 'transparent';
        }
    }

    let infoHtml = '';
    if (hasNote) infoHtml += `<div class="day-preview-note">📝 ${escapeHTML(state.dayNotes[dateStr])}</div>`;
    if (hasTodo) infoHtml += `<div class="day-preview-note">✅ ${escapeHTML(state.todos[dateStr])}</div>`;
    if (isHoliday) infoHtml += `<div class="day-preview-note">🎉 ${escapeHTML(lunarInfo)}</div>`;
    $('#previewInfo').innerHTML = infoHtml;

    positionPreviewCard(e);
    previewCard.classList.add('visible');
}

function positionPreviewCard(e) {
    const previewCard = $('#dayPreviewCard');
    const padding = 15;
    let x = e.clientX + padding;
    let y = e.clientY + padding;

    const cardRect = previewCard.getBoundingClientRect();
    if (x + cardRect.width > window.innerWidth) {
        x = e.clientX - cardRect.width - padding;
    }
    if (y + cardRect.height > window.innerHeight) {
        y = e.clientY - cardRect.height - padding;
    }

    previewCard.style.left = x + 'px';
    previewCard.style.top = y + 'px';
}

// ===== 键盘快捷键 =====

export function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const activeEl = document.activeElement;
        if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT') {
            return;
        }

        if (e.key === 'Escape') {
            const modals = $$('.modal.active');
            if (modals.length > 0) {
                modals.forEach(m => m.classList.remove('active'));
                e.preventDefault();
                return;
            }
            $('#themeSelector')?.classList.remove('active');
            closeExportDropdown();
            return;
        }

        if ($$('.modal.active').length > 0) return;

        switch (e.key) {
            case 'ArrowLeft':
                navigateMonth(-1);
                showToast('← 上一月');
                e.preventDefault();
                break;
            case 'ArrowRight':
                navigateMonth(1);
                showToast('→ 下一月');
                e.preventDefault();
                break;
            case 't':
            case 'T':
                goToToday();
                showToast('已跳转到今天');
                e.preventDefault();
                break;
            case 'h':
            case 'H':
                openHistoryModal();
                e.preventDefault();
                break;
            case '1':
                setMonthsToShow(1);
                showToast('显示 1 个月');
                break;
            case '3':
                setMonthsToShow(3);
                showToast('显示 3 个月');
                break;
            case '6':
                setMonthsToShow(6);
                showToast('显示 6 个月');
                break;
            case '?':
                showKeyboardHelp();
                break;
        }
    });
}

function showKeyboardHelp() {
    showToast('快捷键: ← → 切换月 | T 今天 | H 历史 | 1/3/6 月数 | Esc 关闭', 'success');
}

// ===== 按钮涟漪效果 =====

export function initRippleEffect() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
    });
}
