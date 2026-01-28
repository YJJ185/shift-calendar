// ===== 导出功能模块 =====

import { $, showToast } from './utils.js';
import { state, saveState } from './state.js';

/**
 * 导出为图片
 */
export async function exportAsImage() {
    const container = $('#calendarContainer');
    if (!container) {
        showToast('没有可导出的日历', 'error');
        return;
    }

    showToast('正在生成图片...');

    try {
        // 动态加载 html2canvas
        if (!window.html2canvas) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const canvas = await window.html2canvas(container, {
            backgroundColor: getComputedStyle(document.body).getPropertyValue('--bg-primary'),
            scale: 2,
            logging: false
        });

        const link = document.createElement('a');
        const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
        const filename = schedule ? `${schedule.name}-${new Date().toISOString().slice(0, 10)}.png` : 'calendar.png';
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();

        showToast('图片已导出！');
    } catch (error) {
        console.error('导出图片失败:', error);
        showToast('导出失败，请重试', 'error');
    }
}

/**
 * 导出为 JSON 数据备份
 */
export function exportAsJson() {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        shiftTypes: state.shiftTypes,
        schedules: state.schedules,
        activeScheduleId: state.activeScheduleId,
        dayOverrides: state.dayOverrides,
        dayNotes: state.dayNotes,
        importantDates: state.importantDates,
        todos: state.todos
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shift-calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('数据已导出！');
}

/**
 * 从 JSON 导入数据
 */
export function importFromJson() {
    const input = $('#importFileInput');
    if (input) {
        input.click();
    }
}

/**
 * 处理文件导入
 * @param {Event} event
 */
export function handleFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // 验证数据格式
            if (!data.shiftTypes || !data.schedules) {
                throw new Error('无效的数据格式');
            }

            // 导入数据
            state.shiftTypes = data.shiftTypes;
            state.schedules = data.schedules;
            state.activeScheduleId = data.activeScheduleId;
            state.dayOverrides = data.dayOverrides || {};
            state.dayNotes = data.dayNotes || {};
            state.importantDates = data.importantDates || [];
            state.todos = data.todos || {};

            saveState();
            showToast('数据导入成功！请刷新页面');

            // 刷新页面以应用更改
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('导入失败:', error);
            showToast('导入失败：数据格式错误', 'error');
        }
    };
    reader.readAsText(file);

    // 清空 input，以便可以再次选择同一文件
    event.target.value = '';
}

/**
 * 打印日历
 */
export function printCalendar() {
    window.print();
}

// 导出菜单状态
let exportDropdownOpen = false;

/**
 * 切换导出下拉菜单
 */
export function toggleExportDropdown() {
    const dropdown = $('#exportDropdown');
    if (dropdown) {
        exportDropdownOpen = !exportDropdownOpen;
        dropdown.classList.toggle('active', exportDropdownOpen);
    }
}

/**
 * 关闭导出下拉菜单
 */
export function closeExportDropdown() {
    const dropdown = $('#exportDropdown');
    if (dropdown) {
        exportDropdownOpen = false;
        dropdown.classList.remove('active');
    }
}

/**
 * 初始化导出相关事件
 */
export function initExportEvents() {
    $('#exportBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExportDropdown();
    });

    $('#exportImageBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        exportAsImage();
    });

    $('#exportJsonBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        exportAsJson();
    });

    $('#importJsonBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        importFromJson();
    });

    $('#printBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        printCalendar();
    });

    $('#importFileInput')?.addEventListener('change', handleFileImport);

    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
        const dropdown = $('#exportDropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            closeExportDropdown();
        }
    });
}
