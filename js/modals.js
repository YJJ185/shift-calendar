// ===== 弹窗管理模块 =====
// 历史记录、确认对话框、日期编辑、单日排班修改

import { $, $$, showToast, escapeHTML, safeColor } from './utils.js';
import {
    state,
    saveState,
    formatDate,
    parseLocalDate,
    getWeekdayLabel,
    getScheduleShiftTypes,
    setScheduleDayOverride,
    deleteScheduleDayOverride,
    findShiftById,
    findShiftByKind,
    isDutyShift
} from './state.js';
import { renderCalendar, getShiftForDateInfo } from './calendar.js';
import { syncDraftFromSchedule, resetDraftForNoActiveSchedule } from './shiftTypes.js';
import { getLunarDay } from './lunar.js';
import { saveTodos } from './features.js';

// ===== 历史记录 =====

export function openHistoryModal() {
    renderHistoryList();
    initHistoryListEvents();
    $('#historyModal').classList.add('active');
}

export function closeHistoryModal() {
    $('#historyModal').classList.remove('active');
}

function renderHistoryList() {
    const list = $('#historyList');
    if (state.schedules.length === 0) {
        list.innerHTML = '<div class="history-empty">暂无历史记录</div>';
        return;
    }

    list.innerHTML = state.schedules.map(s => {
        const isActive = s.id === state.activeScheduleId;
        const date = new Date(s.createdAt).toLocaleDateString('zh-CN');
        const patternDots = s.pattern.slice(0, 6).map(id => {
            const type = s.shiftTypes.find(t => t.id === id);
            return type ? `<span class="history-pattern-dot" style="background:${safeColor(type.color, '#9CA3AF')}"></span>` : '';
        }).join('');
        const safeName = escapeHTML(s.name);
        const safeStartDate = escapeHTML(s.startDate);

        return `
            <div class="history-item${isActive ? ' active' : ''}" data-id="${escapeHTML(s.id)}">
                <div class="history-item-icon">📅</div>
                <div class="history-item-info">
                    <div class="history-item-name">${safeName}</div>
                    <div class="history-item-date">创建于 ${escapeHTML(date)} · 起始: ${safeStartDate}</div>
                    <div class="history-item-pattern">${patternDots}</div>
                </div>
                ${isActive ? '<span class="history-item-active-badge">当前</span>' : ''}
                <button class="history-delete-btn" data-id="${escapeHTML(s.id)}" title="删除此记录">×</button>
            </div>
        `;
    }).join('');
}

function initHistoryListEvents() {
    const list = $('#historyList');
    if (list.dataset.eventsInitialized) return;
    list.dataset.eventsInitialized = 'true';

    list.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.history-delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            e.preventDefault();
            const scheduleId = deleteBtn.dataset.id;
            if (scheduleId) deleteSchedule(scheduleId);
            return;
        }

        const item = e.target.closest('.history-item');
        if (item) {
            const schedule = state.schedules.find(s => s.id === item.dataset.id);
            if (schedule) {
                state.activeScheduleId = schedule.id;
                state.currentDate = parseLocalDate(schedule.startDate) || new Date();
                syncDraftFromSchedule(schedule);
                saveState();
                renderHistoryList();
                renderCalendar();
                closeHistoryModal();
            }
        }
    });
}

// ===== 确认对话框 =====

let pendingDeleteScheduleId = null;

export function showConfirmDialog(message, onConfirm, confirmText = '确定', confirmStyle = 'danger') {
    $('#confirmMessage').textContent = message;
    const btn = $('#confirmOkBtn');
    btn.textContent = confirmText;
    btn.className = 'btn';
    btn.classList.add(confirmStyle === 'danger' ? 'btn-danger' : 'btn-primary');
    $('#confirmModal').classList.add('active');
    window._confirmCallback = onConfirm;
}

export function closeConfirmDialog() {
    $('#confirmModal').classList.remove('active');
    window._confirmCallback = null;
}

function deleteSchedule(scheduleId) {
    const schedule = state.schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    pendingDeleteScheduleId = scheduleId;
    showConfirmDialog(`确定要删除方案 "${schedule.name}" 吗？`, () => {
        state.schedules = state.schedules.filter(s => s.id !== pendingDeleteScheduleId);
        delete state.dayOverrides[pendingDeleteScheduleId];

        if (state.activeScheduleId === pendingDeleteScheduleId) {
            if (state.schedules.length > 0) {
                state.activeScheduleId = state.schedules[0].id;
                state.currentDate = parseLocalDate(state.schedules[0].startDate) || new Date();
                syncDraftFromSchedule(state.schedules[0]);
            } else {
                state.activeScheduleId = null;
                resetDraftForNoActiveSchedule();
            }
        }

        saveState();
        renderHistoryList();
        renderCalendar();
        showToast('方案已删除');
        pendingDeleteScheduleId = null;
    }, '删除', 'danger');
}

// ===== 日期编辑（调班/备注） =====

let editingDateStr = null;
let selectedShiftId = null;

export function openDayEditModal(dateStr) {
    editingDateStr = dateStr;
    const modal = $('#dayEditModal');
    const date = parseLocalDate(dateStr);
    if (!date) return;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const lunar = getLunarDay(date);

    $('#dayEditDate').innerHTML = `
        <div class="date-main">${month}月${day}日 ${getWeekdayLabel(date)}</div>
        <div class="date-sub">${year}年</div>
        <div class="date-lunar">${escapeHTML(lunar)}</div>
    `;
    $('#dayEditTitle').textContent = `编辑 ${month}月${day}日`;

    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    const shiftInfo = getShiftForDateInfo(schedule, date);
    let currentShiftId = null;

    if (schedule) {
        currentShiftId = shiftInfo.isOverride
            ? shiftInfo.overrideShift?.id || null
            : shiftInfo.effectiveShift?.id || null;
        $('#dayEditOverride').checked = shiftInfo.isOverride;
    } else {
        $('#dayEditOverride').checked = false;
    }

    selectedShiftId = currentShiftId;
    renderDayEditShifts(shiftInfo.shiftTypes, currentShiftId);
    $('#dayNote').value = state.dayNotes[dateStr] || '';
    if ($('#dayTodo')) {
        $('#dayTodo').value = (state.todos && state.todos[dateStr]) || '';
    }
    modal.classList.add('active');
}

function renderDayEditShifts(shiftTypes, selectedId) {
    const container = $('#dayEditShifts');
    container.innerHTML = shiftTypes.map(t => `
        <div class="day-edit-shift-btn ${t.id === selectedId ? 'selected' : ''}" 
             data-id="${escapeHTML(t.id)}" 
             style="background: ${safeColor(t.color, '#9CA3AF')}">
            <span class="shift-icon">${escapeHTML(t.icon)}</span>
            <span class="shift-name">${escapeHTML(t.name)}</span>
        </div>
    `).join('');

    container.querySelectorAll('.day-edit-shift-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.day-edit-shift-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedShiftId = btn.dataset.id;
            $('#dayEditOverride').checked = true;
        });
    });
}

export function closeDayEditModal() {
    $('#dayEditModal').classList.remove('active');
    editingDateStr = null;
    selectedShiftId = null;
}

export function saveDayEdit() {
    if (!editingDateStr) return;

    const currentEditingDate = editingDateStr;
    const selectedShiftAtSave = selectedShiftId;
    const scheduleIdAtSave = state.activeScheduleId;
    const isOverride = $('#dayEditOverride').checked;
    const note = $('#dayNote').value.trim();
    const todo = $('#dayTodo')?.value.trim() || '';

    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (isOverride && selectedShiftId && schedule) {
        setScheduleDayOverride(schedule, editingDateStr, selectedShiftId);
    } else if (schedule) {
        deleteScheduleDayOverride(schedule, editingDateStr);
    }

    if (note) {
        state.dayNotes[editingDateStr] = note;
    } else {
        delete state.dayNotes[editingDateStr];
    }

    if (todo) {
        if (!state.todos) state.todos = {};
        state.todos[editingDateStr] = todo;
        saveTodos();
    } else if (state.todos && state.todos[editingDateStr]) {
        delete state.todos[editingDateStr];
        saveTodos();
    }

    saveState();
    renderCalendar();
    closeDayEditModal();
    showToast(isOverride ? '已保存临时调班' : '已保存');
    maybeAutoFillDutyFollowups(currentEditingDate, selectedShiftAtSave, isOverride, scheduleIdAtSave);
}

export function clearDayOverride() {
    if (!editingDateStr) return;

    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (schedule) {
        deleteScheduleDayOverride(schedule, editingDateStr);
    }

    saveState();
    renderCalendar();
    closeDayEditModal();
    showToast('已恢复默认排班');
}

function maybeAutoFillDutyFollowups(dateStr, shiftId, isOverride, scheduleId) {
    if (!isOverride || !dateStr || !shiftId || !scheduleId) return;

    const schedule = state.schedules.find(s => s.id === scheduleId);
    const shiftTypes = getScheduleShiftTypes(schedule);
    const selectedShift = findShiftById(shiftTypes, shiftId);
    if (!isDutyShift(selectedShift)) return;

    const nightShift = findShiftByKind(shiftTypes, 'night');
    const restShift = findShiftByKind(shiftTypes, 'rest');
    if (!nightShift || !restShift) return;

    const currentDate = parseLocalDate(dateStr);
    if (!currentDate) return;

    const d1 = new Date(currentDate);
    const d2 = new Date(currentDate);
    d1.setDate(d1.getDate() + 1);
    d2.setDate(d2.getDate() + 2);
    const nextDateStr = formatDate(d1);
    const nextNextDateStr = formatDate(d2);

    setTimeout(() => {
        const latestSchedule = state.schedules.find(s => s.id === scheduleId);
        if (!latestSchedule || state.activeScheduleId !== scheduleId) return;

        showConfirmDialog(`检测到您设置了"${selectedShift.name}"，是否自动将后两天设为"${nightShift.name}"和"${restShift.name}"？`, () => {
            const confirmedSchedule = state.schedules.find(s => s.id === scheduleId);
            if (!confirmedSchedule || state.activeScheduleId !== scheduleId) return;

            setScheduleDayOverride(confirmedSchedule, nextDateStr, nightShift.id);
            setScheduleDayOverride(confirmedSchedule, nextNextDateStr, restShift.id);
            saveState();
            renderCalendar();
            showToast('已自动填充后两天班次');
        }, '自动填充', 'primary');
    }, 200);
}

export function initEditShiftModal() {
    $('#calendarContainer').addEventListener('click', (e) => {
        if (e.target.classList.contains('empty') || e.target.closest('.empty')) return;
        const dayEl = e.target.closest('.calendar-day');
        if (dayEl && dayEl.dataset.date) {
            openDayEditModal(dayEl.dataset.date);
        }
    });
}

// ===== 初始化弹窗事件 =====

export function initModalEvents() {
    // 历史记录
    $('#historyBtn')?.addEventListener('click', openHistoryModal);
    $('#closeHistoryBtn')?.addEventListener('click', closeHistoryModal);
    $('#historyModal .modal-overlay')?.addEventListener('click', closeHistoryModal);

    // 确认对话框
    $('#closeConfirmBtn')?.addEventListener('click', closeConfirmDialog);
    $('#confirmCancelBtn')?.addEventListener('click', closeConfirmDialog);
    $('#confirmModal .modal-overlay')?.addEventListener('click', closeConfirmDialog);
    $('#confirmOkBtn')?.addEventListener('click', () => {
        if (window._confirmCallback) {
            window._confirmCallback();
        }
        closeConfirmDialog();
    });

    // 日期编辑弹窗
    $('#closeDayEditBtn')?.addEventListener('click', closeDayEditModal);
    $('#dayEditModal .modal-overlay')?.addEventListener('click', closeDayEditModal);
    $('#saveDayEditBtn')?.addEventListener('click', saveDayEdit);
    $('#clearDayOverrideBtn')?.addEventListener('click', clearDayOverride);
}
