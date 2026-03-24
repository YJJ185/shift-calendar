// ===== 日历渲染模块 =====

import { $, $$, adjustColor, showToast, escapeHTML, safeColor } from './utils.js';
import {
    state,
    saveState,
    parseLocalDate,
    formatDate,
    getScheduleShiftTypes,
    getScheduleDayOverrides,
    findShiftById,
    findShiftByKind,
    isNightShift,
    isDutyShift,
    findImportantDateForDate
} from './state.js';
import { getHolidayInfo, getSolarTerm } from './holidays.js';
import { getLunarDay } from './lunar.js';
import { updateStats, updateCountdown } from './stats.js';

function getBaseShiftForDate(schedule, target, shiftTypes) {
    if (!schedule || !(target instanceof Date) || !Array.isArray(schedule.pattern) || schedule.pattern.length === 0) {
        return null;
    }

    const start = parseLocalDate(schedule.startDate);
    if (!start) {
        return null;
    }

    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;

    const pattern = schedule.pattern;
    const idx = (schedule.startIndex + diffDays) % pattern.length;
    const shiftId = pattern[idx];
    return findShiftById(shiftTypes, shiftId);
}

function getOverrideShiftForDate(schedule, dateStr, shiftTypes) {
    if (!schedule || !dateStr) return null;

    const overrideShiftId = getScheduleDayOverrides(schedule)[dateStr];
    if (!overrideShiftId) return null;
    return findShiftById(shiftTypes, overrideShiftId);
}

function applyWeekendRestMode(schedule, target, shiftTypes, effectiveShift, overrideShift, holiday) {
    if (!schedule?.weekendRestMode || !target || overrideShift) {
        return effectiveShift;
    }

    const resolvedHoliday = holiday === undefined ? getHolidayInfo(target) : holiday;
    const restShift = findShiftByKind(shiftTypes, 'rest');
    const isMakeupWorkday = resolvedHoliday && resolvedHoliday.type === 'workday';

    if (resolvedHoliday && resolvedHoliday.type === 'holiday' && restShift) {
        return restShift;
    }

    if (isMakeupWorkday) {
        return effectiveShift;
    }

    const dayOfWeek = target.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend && effectiveShift && !isDutyShift(effectiveShift) && !isNightShift(effectiveShift) && restShift) {
        return restShift;
    }

    return effectiveShift;
}

export function getShiftForDateInfo(schedule, date, holiday) {
    if (!schedule) {
        return {
            date: parseLocalDate(date),
            dateStr: null,
            shiftTypes: getScheduleShiftTypes(null),
            baseShift: null,
            overrideShift: null,
            effectiveShift: null,
            isOverride: false
        };
    }

    const target = parseLocalDate(date);
    if (!target) {
        return {
            date: null,
            dateStr: null,
            shiftTypes: getScheduleShiftTypes(schedule),
            baseShift: null,
            overrideShift: null,
            effectiveShift: null,
            isOverride: false
        };
    }

    const shiftTypes = getScheduleShiftTypes(schedule);
    const dateStr = formatDate(target);
    const baseShift = getBaseShiftForDate(schedule, target, shiftTypes);
    const overrideShift = getOverrideShiftForDate(schedule, dateStr, shiftTypes);
    const effectiveShift = applyWeekendRestMode(schedule, target, shiftTypes, overrideShift || baseShift, overrideShift, holiday);

    return {
        date: target,
        dateStr,
        shiftTypes,
        baseShift,
        overrideShift,
        effectiveShift,
        isOverride: !!overrideShift
    };
}

/**
 * 获取某日期的班次
 */
export function getShiftForDate(schedule, date, holiday) {
    if (!schedule) return null;

    const target = parseLocalDate(date);
    if (!target) return null;

    const shiftTypes = getScheduleShiftTypes(schedule);
    const dateStr = formatDate(target);
    const overrideShift = getOverrideShiftForDate(schedule, dateStr, shiftTypes);
    if (overrideShift) {
        return overrideShift;
    }

    const baseShift = getBaseShiftForDate(schedule, target, shiftTypes);
    return applyWeekendRestMode(schedule, target, shiftTypes, baseShift, null, holiday);
}


/**
 * 渲染日历
 */
export function renderCalendar() {
    const container = $('#calendarContainer');
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);

    // 同步周末休息模式
    if ($('#weekendRestMode')) {
        $('#weekendRestMode').checked = !!schedule?.weekendRestMode;
    }

    container.innerHTML = '';

    if (!schedule) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
            <div class="empty-icon">📅</div>
            <h3>还没有排班</h3>
            <p>在左侧设置你的班次类型和排班规律，然后点击"生成排班"</p>
        `;
        container.appendChild(emptyDiv);
        updateCurrentRangeLabel();
        updateStats();
        updateCountdown();
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let m = 0; m < state.monthsToShow; m++) {
        const monthDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + m, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();

        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-calendar';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = `<div class="month-header">${year}年${month + 1}月</div>`;
        html += '<div class="calendar-grid">';

        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach((d, i) => {
            const weekend = i === 0 || i === 6 ? ' weekend' : '';
            html += `<div class="weekday-header${weekend}">${d}</div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const isToday = date.getTime() === today.getTime();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const holiday = getHolidayInfo(date);
            const shiftInfo = getShiftForDateInfo(schedule, date, holiday);
            const shift = shiftInfo.effectiveShift;

            const dateStr = formatDate(date);
            const hasOverride = shiftInfo.isOverride;
            const hasNote = !!state.dayNotes[dateStr];

            const lunarDayStr = getLunarDay(date);
            const solarTerm = getSolarTerm(date);

            let displayText = lunarDayStr;
            let displayClass = 'lunar-day';
            if (holiday) {
                displayText = holiday.name;
                displayClass = 'lunar-day holiday-name';
            } else if (solarTerm) {
                displayText = solarTerm;
                displayClass = 'lunar-day solar-term';
            }

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isWeekend) classes += ' weekend';

            const safeDisplayText = escapeHTML(displayText);

            let shiftHtml = '';
            if (shift) {
                const shiftColor = safeColor(shift.color, '#9CA3AF');
                const shiftIcon = escapeHTML(shift.icon);
                const shiftName = escapeHTML(shift.name);
                shiftHtml = `
                    <div class="day-shift" style="background: linear-gradient(135deg, ${shiftColor} 0%, ${adjustColor(shiftColor, -20)} 100%);">
                        <span class="shift-icon">${shiftIcon}</span>
                        <span class="shift-name">${shiftName}</span>
                    </div>`;
            }

            let workStatusHtml = '';
            if (holiday) {
                if (holiday.type === 'holiday') {
                    workStatusHtml = `<div class="work-status holiday"><span class="work-status-text">休</span></div>`;
                } else if (holiday.type === 'workday') {
                    workStatusHtml = `<div class="work-status work"><span class="work-status-text">班</span></div>`;
                }
            }

            const overrideBadge = hasOverride ? '<span class="day-override-badge">调</span>' : '';
            const noteIndicator = hasNote ? '<span class="day-note-indicator">📝</span>' : '';

            let importantDateBadge = '';
            const importantDate = findImportantDateForDate(date);
            if (importantDate) {
                importantDateBadge = `<span class="important-date-badge" title="${escapeHTML(importantDate.name)}">${escapeHTML(importantDate.icon || '📅')}</span>`;
            }

            let todoIndicator = '';
            if (state.todos && state.todos[dateStr]) {
                todoIndicator = '<span class="todo-indicator">办</span>';
            }

            html += `
                <div class="${classes}" data-date="${dateStr}">
                    ${workStatusHtml}
                    ${overrideBadge}
                    ${todoIndicator}
                    <div class="day-header">
                        <span class="day-number">${day}</span>
                        <span class="${displayClass}">${safeDisplayText}</span>
                    </div>
                    ${shiftHtml}
                    ${importantDateBadge}
                    ${noteIndicator}
                    ${isToday ? '<div class="today-badge">今天</div>' : ''}
                </div>`;
        }

        html += '</div>';
        monthDiv.innerHTML = html;
        container.appendChild(monthDiv);
    }

    updateCurrentRangeLabel();
    updateStats();
    if (typeof updateCountdown === 'function') {
        updateCountdown();
    }
}

// ===== 日期导航 =====

export function updateCurrentRangeLabel() {
    if ($('#yearSelect') && $('#monthSelect')) {
        updateDatePickerValues();
    }
}

export function navigateMonth(delta) {
    const container = $('#calendarContainer');
    container?.classList.add(delta > 0 ? 'slide-left' : 'slide-right');

    state.currentDate = new Date(
        state.currentDate.getFullYear(),
        state.currentDate.getMonth() + delta,
        1
    );
    renderCalendar();

    setTimeout(() => {
        container?.classList.remove('slide-left', 'slide-right');
    }, 300);
}

export function setMonthsToShow(months) {
    state.monthsToShow = months;
    $$('#rangeSelector .btn-range').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.months) === months);
    });
    renderCalendar();
}

export function initDatePicker() {
    const yearSelect = $('#yearSelect');
    const currentYear = new Date().getFullYear();

    yearSelect.innerHTML = '';
    for (let year = currentYear - 5; year <= currentYear + 10; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    updateDatePickerValues();
}

export function updateDatePickerValues() {
    $('#yearSelect').value = state.currentDate.getFullYear();
    $('#monthSelect').value = state.currentDate.getMonth();
}

export function onDatePickerChange() {
    const year = parseInt($('#yearSelect').value);
    const month = parseInt($('#monthSelect').value);
    state.currentDate = new Date(year, month, 1);
    renderCalendar();
}

export function goToToday() {
    state.currentDate = new Date();
    updateDatePickerValues();
    renderCalendar();
}

// ===== 初始化日历导航事件 =====

export function initCalendarEvents() {
    $('#prevBtn')?.addEventListener('click', () => navigateMonth(-1));
    $('#nextBtn')?.addEventListener('click', () => navigateMonth(1));
    $$('#rangeSelector .btn-range').forEach(btn => {
        btn.addEventListener('click', () => setMonthsToShow(parseInt(btn.dataset.months)));
    });

    initDatePicker();
    $('#yearSelect')?.addEventListener('change', onDatePickerChange);
    $('#monthSelect')?.addEventListener('change', onDatePickerChange);
    $('#todayBtn')?.addEventListener('click', goToToday);

    // 医护智能排班模式
    $('#weekendRestMode')?.addEventListener('change', (e) => {
        const enabled = e.target.checked;

        const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
        if (schedule) {
            schedule.weekendRestMode = enabled;
            saveState();
            renderCalendar();
        }

        showToast(enabled ? '已开启周末双休保护' : '已关闭周末双休保护');
    });
}
