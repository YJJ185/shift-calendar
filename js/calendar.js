// ===== 日历渲染模块 =====

import { $, $$, adjustColor } from './utils.js';
import { state, saveState, formatDate } from './state.js';
import { getHolidayInfo, getSolarTerm } from './holidays.js';
import { getLunarDay } from './lunar.js';
import { updateStats, updateCountdown } from './stats.js';

/**
 * 获取指定日期的班次
 * @param {Object} schedule - 排班方案
 * @param {Date} date - 日期
 * @returns {Object|null}
 */
export function getShiftForDate(schedule, date) {
    const dateStr = formatDate(date);

    // 检查是否有临时调班
    if (state.dayOverrides[dateStr]) {
        const overrideShiftId = state.dayOverrides[dateStr];
        return state.shiftTypes.find(t => t.id === overrideShiftId);
    }

    // 正常计算班次
    const start = new Date(schedule.startDate);
    const target = new Date(date);
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;

    const pattern = schedule.pattern;
    const idx = (schedule.startIndex + diffDays) % pattern.length;
    const shiftId = pattern[idx];
    const shift = schedule.shiftTypes.find(t => t.id === shiftId);

    // 医护排班特殊规则：周末非值班非夜班自动休息
    if (schedule.weekendRestMode) {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (isWeekend && shift && !['值班', '夜班'].includes(shift.name)) {
            const restShift = schedule.shiftTypes.find(t => t.name === '休息');
            if (restShift) return restShift;
        }
    }

    return shift;
}

/**
 * 渲染日历
 */
export function renderCalendar() {
    const container = $('#calendarContainer');
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);

    // 同步周末休息模式复选框状态
    const weekendRestMode = $('#weekendRestMode');
    if (weekendRestMode) {
        weekendRestMode.checked = schedule ? !!schedule.weekendRestMode : false;
    }

    // 清空容器
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
            const shift = getShiftForDate(schedule, date);

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasOverride = !!state.dayOverrides[dateStr];
            const hasNote = !!state.dayNotes[dateStr];

            const lunarDayStr = getLunarDay(date);
            const holiday = getHolidayInfo(date);
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

            let shiftHtml = '';
            if (shift) {
                shiftHtml = `
                    <div class="day-shift" style="background: linear-gradient(135deg, ${shift.color} 0%, ${adjustColor(shift.color, -20)} 100%);">
                        <span class="shift-icon">${shift.icon}</span>
                        <span class="shift-name">${shift.name}</span>
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
            if (state.importantDates && state.importantDates.length > 0) {
                const monthDay = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const importantDate = state.importantDates.find(d => {
                    const [, m, dd] = d.date.split('-');
                    return `${m}-${dd}` === monthDay;
                });
                if (importantDate) {
                    importantDateBadge = `<span class="important-date-badge" title="${importantDate.name}">${importantDate.icon}</span>`;
                }
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
                        <span class="${displayClass}">${displayText}</span>
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
    updateCountdown();
}

/**
 * 更新当前范围标签
 */
export function updateCurrentRangeLabel() {
    const yearSelect = $('#yearSelect');
    const monthSelect = $('#monthSelect');
    if (yearSelect && monthSelect) {
        updateDatePickerValues();
    }
}

/**
 * 初始化年月选择器
 */
export function initDatePicker() {
    const yearSelect = $('#yearSelect');
    const currentYear = new Date().getFullYear();

    if (yearSelect) {
        yearSelect.innerHTML = '';
        for (let year = currentYear - 5; year <= currentYear + 10; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    updateDatePickerValues();
}

/**
 * 更新年月选择器显示值
 */
export function updateDatePickerValues() {
    const yearSelect = $('#yearSelect');
    const monthSelect = $('#monthSelect');
    if (yearSelect) yearSelect.value = state.currentDate.getFullYear();
    if (monthSelect) monthSelect.value = state.currentDate.getMonth();
}

/**
 * 年月选择变更处理
 */
export function onDatePickerChange() {
    const year = parseInt($('#yearSelect')?.value);
    const month = parseInt($('#monthSelect')?.value);
    state.currentDate = new Date(year, month, 1);
    renderCalendar();
}

/**
 * 跳转到今天
 */
export function goToToday() {
    state.currentDate = new Date();
    updateDatePickerValues();
    renderCalendar();
}

/**
 * 月份导航
 * @param {number} delta - 偏移量
 */
export function navigateMonth(delta) {
    const container = $('#calendarContainer');
    if (container) {
        container.classList.add(delta > 0 ? 'animate-left' : 'animate-right');
    }

    const newDate = new Date(state.currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    state.currentDate = newDate;
    updateDatePickerValues();
    renderCalendar();

    setTimeout(() => {
        if (container) {
            container.classList.remove('animate-left', 'animate-right');
        }
    }, 400);
}

/**
 * 设置显示月数
 * @param {number} months
 */
export function setMonthsToShow(months) {
    state.monthsToShow = months;
    $$('#rangeSelector .btn-range').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.months) === months);
    });
    renderCalendar();
}

/**
 * 初始化日历相关事件
 */
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

    // 周末休息模式切换
    $('#weekendRestMode')?.addEventListener('change', (e) => {
        const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
        if (schedule) {
            schedule.weekendRestMode = e.target.checked;
            saveState();
            renderCalendar();
        }
    });
}
