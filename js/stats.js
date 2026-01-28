// ===== 统计功能模块 =====

import { $ } from './utils.js';
import { state } from './state.js';
import { getShiftForDate } from './calendar.js';

/**
 * 更新统计数据
 */
export function updateStats() {
    const container = $('#statsGrid');
    if (!container) return;

    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);

    // 更新标题
    const cardHeader = container.closest('.card')?.querySelector('h2');
    if (cardHeader) {
        cardHeader.textContent = `${state.currentDate.getFullYear()}年${state.currentDate.getMonth() + 1}月统计`;
    }

    if (!schedule) {
        container.innerHTML = '<div class="stats-empty">生成排班后即可查看统计</div>';
        return;
    }

    // 统计当前选定月份的数据
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const stats = {};
    state.shiftTypes.forEach(t => stats[t.id] = 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const shift = getShiftForDate(schedule, date);
        if (shift) {
            stats[shift.id] = (stats[shift.id] || 0) + 1;
        }
    }

    // 渲染
    container.innerHTML = '';
    let hasData = false;

    // 添加综合进度条
    const chartBar = document.createElement('div');
    chartBar.className = 'stats-chart-bar';

    state.shiftTypes.forEach(type => {
        const count = stats[type.id] || 0;
        if (count > 0) {
            hasData = true;
            const percentage = Math.round((count / daysInMonth) * 100);

            // 添加到综合进度条
            const segment = document.createElement('div');
            segment.className = 'stats-bar-segment';
            segment.style.width = `${percentage}%`;
            segment.style.background = type.color;
            segment.title = `${type.name}: ${count}天 (${percentage}%)`;
            chartBar.appendChild(segment);

            // 详细统计项
            const item = document.createElement('div');
            item.className = 'stats-item';
            item.innerHTML = `
                <div class="stats-item-header">
                    <div class="stats-item-left">
                        <span class="stats-icon">${type.icon}</span>
                        <span class="stats-name">${type.name}</span>
                    </div>
                    <span class="stats-count">${count}天 <span class="stats-percent">${percentage}%</span></span>
                </div>
                <div class="stats-progress">
                    <div class="stats-progress-bar" style="width: ${percentage}%; background: ${type.color}"></div>
                </div>
            `;
            container.appendChild(item);
        }
    });

    // 在最前面插入综合进度条
    if (hasData) {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'stats-chart';
        chartContainer.appendChild(chartBar);
        container.insertBefore(chartContainer, container.firstChild);
    }

    if (!hasData) {
        container.innerHTML = '<div class="stats-empty">本月没有排班数据</div>';
    }
}

/**
 * 更新倒计时
 */
export function updateCountdown() {
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    const countdownValue = $('#countdownValue');
    const countdownNext = $('#countdownNext');

    if (!schedule || !countdownValue) {
        if (countdownValue) countdownValue.textContent = '--';
        if (countdownNext) countdownNext.innerHTML = '请先生成排班';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否是休息日
    const todayShift = getShiftForDate(schedule, today);
    if (todayShift && todayShift.name === '休息') {
        countdownValue.textContent = '0';
        countdownNext.innerHTML = '<span class="countdown-today">🎉 今天就是休息日！</span>';
        return;
    }

    // 查找下一个休息日
    let daysUntilRest = 0;
    let nextRestDate = null;
    for (let i = 1; i <= 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + i);
        const shift = getShiftForDate(schedule, checkDate);
        if (shift && shift.name === '休息') {
            daysUntilRest = i;
            nextRestDate = checkDate;
            break;
        }
    }

    if (nextRestDate) {
        countdownValue.textContent = daysUntilRest;
        const month = nextRestDate.getMonth() + 1;
        const day = nextRestDate.getDate();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[nextRestDate.getDay()];
        countdownNext.innerHTML = `🗓️ ${month}月${day}日 ${weekday}`;
    } else {
        countdownValue.textContent = '--';
        countdownNext.innerHTML = '未找到休息日';
    }
}
