// ===== 班次类型管理模块 =====

import { $, $$, uuid, showToast } from './utils.js';
import { state, saveState } from './state.js';
import { renderPatternBuilder, renderPatternPreview } from './patterns.js';

// 当前编辑的班次类型 ID
let editingShiftTypeId = null;

/**
 * 渲染班次类型列表
 */
export function renderShiftTypes() {
    const list = $('#shiftTypesList');
    if (!list) return;

    list.innerHTML = state.shiftTypes.map(t => `
        <div class="shift-type-item" data-id="${t.id}">
            <div class="shift-type-badge" style="background:${t.color}">${t.icon}</div>
            <span class="shift-type-name">${t.name}</span>
            <span class="shift-type-edit">编辑</span>
        </div>
    `).join('');

    list.querySelectorAll('.shift-type-item').forEach(item => {
        item.addEventListener('click', () => openShiftTypeModal(item.dataset.id));
    });

    renderPatternBuilder();
}

/**
 * 打开班次类型编辑弹窗
 * @param {string|null} id
 */
export function openShiftTypeModal(id = null) {
    editingShiftTypeId = id;
    const modal = $('#shiftTypeModal');
    const title = $('#shiftTypeModalTitle');
    const nameInput = $('#shiftTypeName');
    const iconInput = $('#shiftTypeIcon');
    const colorInput = $('#shiftTypeColor');
    const deleteBtn = $('#deleteShiftTypeBtn');

    if (id) {
        const type = state.shiftTypes.find(t => t.id === id);
        title.textContent = '编辑班次类型';
        nameInput.value = type.name;
        iconInput.value = type.icon;
        colorInput.value = type.color;
        deleteBtn.style.display = 'block';
    } else {
        title.textContent = '添加班次类型';
        nameInput.value = '';
        iconInput.value = '☀️';
        colorInput.value = '#FFB74D';
        deleteBtn.style.display = 'none';
    }

    updateColorValue();
    modal.classList.add('active');
}

/**
 * 关闭班次类型编辑弹窗
 */
export function closeShiftTypeModal() {
    $('#shiftTypeModal').classList.remove('active');
    editingShiftTypeId = null;
}

/**
 * 保存班次类型
 */
export function saveShiftType() {
    const name = $('#shiftTypeName').value.trim();
    const icon = $('#shiftTypeIcon').value.trim() || '📌';
    const color = $('#shiftTypeColor').value;

    if (!name) {
        showToast('请输入班次名称', 'error');
        return;
    }

    if (editingShiftTypeId) {
        const idx = state.shiftTypes.findIndex(t => t.id === editingShiftTypeId);
        if (idx !== -1) {
            state.shiftTypes[idx] = { ...state.shiftTypes[idx], name, icon, color };
        }
    } else {
        state.shiftTypes.push({ id: uuid(), name, icon, color });
    }

    saveState();
    renderShiftTypes();
    renderPatternPreview();
    closeShiftTypeModal();
    showToast(editingShiftTypeId ? '班次已更新' : '班次已添加');
}

/**
 * 删除班次类型
 */
export function deleteShiftType() {
    if (!editingShiftTypeId) return;
    if (!confirm('确定删除这个班次类型吗？')) return;

    state.shiftTypes = state.shiftTypes.filter(t => t.id !== editingShiftTypeId);
    state.pattern = state.pattern.filter(p => p !== editingShiftTypeId);

    saveState();
    renderShiftTypes();
    renderPatternPreview();
    closeShiftTypeModal();
    showToast('班次已删除');
}

/**
 * 更新颜色值显示
 */
export function updateColorValue() {
    const colorValue = $('#colorValue');
    const colorInput = $('#shiftTypeColor');
    if (colorValue && colorInput) {
        colorValue.textContent = colorInput.value.toUpperCase();
    }
}

/**
 * 初始化班次类型相关事件
 */
export function initShiftTypeEvents() {
    $('#addShiftTypeBtn')?.addEventListener('click', () => openShiftTypeModal());
    $('#closeShiftTypeBtn')?.addEventListener('click', closeShiftTypeModal);
    $('#shiftTypeModal .modal-overlay')?.addEventListener('click', closeShiftTypeModal);
    $('#saveShiftTypeBtn')?.addEventListener('click', saveShiftType);
    $('#deleteShiftTypeBtn')?.addEventListener('click', deleteShiftType);
    $('#shiftTypeColor')?.addEventListener('input', updateColorValue);

    $$('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const colorInput = $('#shiftTypeColor');
            if (colorInput) {
                colorInput.value = btn.dataset.color;
                updateColorValue();
            }
        });
    });

    // 图标选择器需要在弹窗中特别处理
    $$('#shiftTypeModal .icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const iconInput = $('#shiftTypeIcon');
            if (iconInput) {
                iconInput.value = btn.dataset.icon;
            }
        });
    });
}
