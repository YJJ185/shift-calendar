// ===== 重要日期 & 待办事项模块 =====

import { $, $$, uuid, showToast, escapeHTML } from './utils.js';
import { state } from './state.js';
import { renderCalendar } from './calendar.js';

// ===== 重要日期 =====

let editingImportantDateId = null;

export function loadImportantDates() {
    const saved = localStorage.getItem('shift-calendar-important-dates');
    if (saved) {
        try {
            state.importantDates = JSON.parse(saved);
        } catch (e) {
            state.importantDates = [];
        }
    } else {
        state.importantDates = [];
    }
}

export function saveImportantDates() {
    localStorage.setItem('shift-calendar-important-dates', JSON.stringify(state.importantDates));
}

export function renderImportantDatesList() {
    const list = $('#importantDatesList');
    if (!list) return;

    if (!state.importantDates || state.importantDates.length === 0) {
        list.innerHTML = '<div class="empty-hint">点击 + 添加生日、纪念日等</div>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list.innerHTML = state.importantDates.map(item => {
        const match = String(item?.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return '';

        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        const isRepeat = item.repeat !== false;

        let targetDate;
        if (isRepeat) {
            targetDate = new Date(today.getFullYear(), month - 1, day);
            if (targetDate < today) {
                targetDate.setFullYear(targetDate.getFullYear() + 1);
            }
        } else {
            targetDate = new Date(year, month - 1, day);
        }

        const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        const countdownText = daysUntil === 0
            ? '就是今天！'
            : daysUntil > 0
                ? `还有${daysUntil}天`
                : `已过${Math.abs(daysUntil)}天`;
        const dateLabel = isRepeat
            ? `${month}月${day}日 (每年)`
            : `${year}年${month}月${day}日`;

        return `
            <div class="important-date-item" data-id="${escapeHTML(item.id)}">
                <span class="important-date-icon">${escapeHTML(item.icon || '📅')}</span>
                <div class="important-date-info">
                    <div class="important-date-name">${escapeHTML(item.name)}</div>
                    <div class="important-date-date">${escapeHTML(dateLabel)}</div>
                </div>
                <span class="important-date-countdown">${escapeHTML(countdownText)}</span>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.important-date-item').forEach(item => {
        item.addEventListener('click', () => openImportantDateModal(item.dataset.id));
    });
}

export function openImportantDateModal(id = null) {
    editingImportantDateId = id;
    const modal = $('#importantDateModal');
    const title = $('#importantDateModalTitle');
    const deleteBtn = $('#deleteImportantDateBtn');

    if (id) {
        const item = state.importantDates.find(d => d.id === id);
        if (!item) {
            editingImportantDateId = null;
            return;
        }
        title.textContent = '编辑重要日期';
        $('#importantDateDate').value = item.date;
        $('#importantDateName').value = item.name;
        $('#importantDateIcon').value = item.icon;
        $('#importantDateRepeat').checked = item.repeat !== false;
        deleteBtn.style.display = 'block';
    } else {
        title.textContent = '添加重要日期';
        $('#importantDateDate').value = '';
        $('#importantDateName').value = '';
        $('#importantDateIcon').value = '🎂';
        $('#importantDateRepeat').checked = true;
        deleteBtn.style.display = 'none';
    }

    modal.classList.add('active');
}

export function closeImportantDateModal() {
    $('#importantDateModal').classList.remove('active');
    editingImportantDateId = null;
}

export function saveImportantDate() {
    const date = $('#importantDateDate').value;
    const name = $('#importantDateName').value.trim();
    const icon = $('#importantDateIcon').value.trim() || '📅';
    const repeat = $('#importantDateRepeat').checked;

    if (!date || !name) {
        showToast('请填写日期和名称', 'error');
        return;
    }

    if (editingImportantDateId) {
        const idx = state.importantDates.findIndex(d => d.id === editingImportantDateId);
        if (idx !== -1) {
            state.importantDates[idx] = { ...state.importantDates[idx], date, name, icon, repeat };
        }
    } else {
        state.importantDates.push({ id: uuid(), date, name, icon, repeat });
    }

    saveImportantDates();
    renderImportantDatesList();
    renderCalendar();
    closeImportantDateModal();
    showToast(editingImportantDateId ? '已更新' : '已添加');
}

export function deleteImportantDate() {
    if (!editingImportantDateId) return;
    state.importantDates = state.importantDates.filter(d => d.id !== editingImportantDateId);
    saveImportantDates();
    renderImportantDatesList();
    renderCalendar();
    closeImportantDateModal();
    showToast('已删除');
}

// ===== 待办事项 =====

export function loadTodos() {
    const saved = localStorage.getItem('shift-calendar-todos');
    if (saved) {
        try {
            state.todos = JSON.parse(saved);
        } catch (e) {
            state.todos = {};
        }
    } else {
        state.todos = {};
    }
}

export function saveTodos() {
    localStorage.setItem('shift-calendar-todos', JSON.stringify(state.todos));
}

// ===== 初始化重要日期事件 =====

export function initFeatureEvents() {
    // 重要日期
    $('#addImportantDateBtn')?.addEventListener('click', () => openImportantDateModal());
    $('#closeImportantDateBtn')?.addEventListener('click', closeImportantDateModal);
    $('#importantDateModal .modal-overlay')?.addEventListener('click', closeImportantDateModal);
    $('#saveImportantDateBtn')?.addEventListener('click', saveImportantDate);
    $('#deleteImportantDateBtn')?.addEventListener('click', deleteImportantDate);

    // 重要日期弹窗中的图标选择
    $$('#importantDateModal .icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $('#importantDateIcon').value = btn.dataset.icon;
        });
    });
}
