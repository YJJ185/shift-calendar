// ===== 排班规律管理模块 =====

import { $, uuid, showToast, escapeHTML, safeColor } from './utils.js';
import { state, saveState, parseLocalDate, formatDate } from './state.js';
import { renderCalendar } from './calendar.js';

/**
 * 渲染规律构建器（可点击的班次按钮）
 */
export function renderPatternBuilder() {
    const builder = $('#patternBuilder');
    if (!builder) return;

    builder.innerHTML = state.shiftTypes.map(t => `
        <span class="pattern-btn" data-id="${escapeHTML(t.id)}" style="background:${safeColor(t.color, '#9CA3AF')}">
            ${escapeHTML(t.icon)} ${escapeHTML(t.name)}
        </span>
    `).join('');

    builder.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => addToPattern(btn.dataset.id));
    });
}

/**
 * 添加班次到规律
 * @param {string} shiftId
 */
export function addToPattern(shiftId) {
    state.pattern.push(shiftId);
    renderPatternPreview();
}

/**
 * 从规律中移除班次
 * @param {number} index
 */
export function removeFromPattern(index) {
    state.pattern.splice(index, 1);
    renderPatternPreview();
}

/**
 * 清空规律
 */
export function clearPattern() {
    state.pattern = [];
    renderPatternPreview();
}

/**
 * 渲染规律预览
 */
export function renderPatternPreview() {
    const preview = $('#patternPreview');
    const select = $('#startShift');

    if (state.pattern.length === 0) {
        if (preview) {
            preview.innerHTML = '<span class="empty-hint">点击上方班次添加规律...</span>';
        }
        if (select) {
            select.innerHTML = '<option value="0">请先设置规律</option>';
        }
        return;
    }

    if (preview) {
        preview.innerHTML = state.pattern.map((id, i) => {
            const type = state.shiftTypes.find(t => t.id === id);
            if (!type) return '';
            const arrow = i < state.pattern.length - 1 ? '<span class="pattern-arrow">→</span>' : '';
            return `<span class="pattern-item" data-index="${i}" style="background:${safeColor(type.color, '#9CA3AF')}" title="位置${i + 1}: ${escapeHTML(type.name)}（点击删除）"><span class="pattern-pos">${i + 1}</span>${escapeHTML(type.icon)}</span>${arrow}`;
        }).join('');

        preview.querySelectorAll('.pattern-item').forEach(item => {
            item.addEventListener('click', () => removeFromPattern(parseInt(item.dataset.index)));
        });
    }

    // 更新起始位置选择器
    renderStartIndexOptions();
}

/**
 * 渲染起始位置选择器
 */
export function renderStartIndexOptions() {
    const select = $('#startShift');
    const preview = $('#schedulePreview');

    if (state.pattern.length === 0) {
        if (select) {
            select.innerHTML = '<option value="0">请先设置规律</option>';
        }
        if (preview) {
            preview.innerHTML = '';
        }
        return;
    }

    if (select) {
        select.innerHTML = state.pattern.map((id, i) => {
            const type = state.shiftTypes.find(t => t.id === id);
            if (!type) return '';
            return `<option value="${i}">第${i + 1}天 - ${escapeHTML(type.icon)} ${escapeHTML(type.name)}</option>`;
        }).join('');

        select.onchange = updateSchedulePreview;
    }

    updateSchedulePreview();
}

/**
 * 更新排班预览（显示接下来5天）
 */
export function updateSchedulePreview() {
    const preview = $('#schedulePreview');
    const startIndex = parseInt($('#startShift')?.value) || 0;

    if (state.pattern.length === 0 || !preview) {
        if (preview) preview.innerHTML = '';
        return;
    }

    const days = ['今天', '明天', '后天', '第4天', '第5天'];
    const previewDays = days.map((dayName, i) => {
        const idx = (startIndex + i) % state.pattern.length;
        const shiftId = state.pattern[idx];
        const type = state.shiftTypes.find(t => t.id === shiftId);
        if (!type) return '';
        return `<span class="preview-day">${dayName}: ${escapeHTML(type.icon)}${escapeHTML(type.name)}</span>`;
    }).join('');

    preview.innerHTML = `
        <div class="preview-label">📅 排班预览：</div>
        <div class="preview-days">${previewDays}</div>
    `;
}

/**
 * 生成排班
 */
export function generateSchedule() {
    const startDateInput = $('#startDate');
    const startDate = startDateInput?.value || formatDate(new Date());
    if (startDateInput && !startDateInput.value) {
        startDateInput.value = startDate;
    }
    const startIndex = parseInt($('#startShift')?.value) || 0;
    const name = $('#scheduleName')?.value.trim() || `排班方案 ${state.schedules.length + 1}`;

    if (state.pattern.length === 0) {
        showToast('请设置排班规律', 'error');
        return;
    }

    const weekendRestMode = !!$('#weekendRestMode')?.checked;

    const schedule = {
        id: uuid(),
        name,
        createdAt: new Date().toISOString(),
        startDate,
        startIndex,
        pattern: [...state.pattern],
        shiftTypes: JSON.parse(JSON.stringify(state.shiftTypes)),
        weekendRestMode,
        isActive: true
    };

    state.schedules.forEach(s => s.isActive = false);
    state.schedules.unshift(schedule);
    state.activeScheduleId = schedule.id;

    saveState();
    state.currentDate = parseLocalDate(startDate) || new Date();
    renderCalendar();
    showToast('排班方案已生成！');
}

/**
 * 初始化规律相关事件
 */
export function initPatternEvents() {
    $('#clearPatternBtn')?.addEventListener('click', clearPattern);
    $('#generateBtn')?.addEventListener('click', generateSchedule);
}
