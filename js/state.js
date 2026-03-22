// ===== 应用状态管理模块 =====

// 默认班次类型
export const defaultShiftTypes = [
    { id: 'day', name: '白班', color: '#FFB74D', icon: '☀️' },
    { id: 'night', name: '夜班', color: '#7986CB', icon: '🌙' },
    { id: 'off', name: '休息', color: '#81C784', icon: '🏠' },
    { id: 'afternoon', name: '下午班', color: '#FF8A65', icon: '🌅' },
    { id: 'duty', name: '值班', color: '#9575CD', icon: '📋' }
];

// 应用状态
export const state = {
    shiftTypes: [...defaultShiftTypes],
    schedules: [],
    activeScheduleId: null,
    pattern: [],
    currentDate: new Date(),
    monthsToShow: 1,
    dayOverrides: {},
    dayNotes: {},
    importantDates: [],
    todos: {}
};

const STORAGE_KEY = 'shift-calendar-data';

/**
 * 保存状态到本地存储
 */
export function saveState() {
    const data = {
        shiftTypes: state.shiftTypes,
        schedules: state.schedules,
        activeScheduleId: state.activeScheduleId,
        dayOverrides: state.dayOverrides,
        dayNotes: state.dayNotes
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 从本地存储加载状态
 */
export function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            const savedShiftTypes = data.shiftTypes || [];
            const existingIds = savedShiftTypes.map(t => t.id);
            const newTypes = defaultShiftTypes.filter(t => !existingIds.includes(t.id));
            state.shiftTypes = [...savedShiftTypes, ...newTypes];

            state.schedules = data.schedules || [];
            state.activeScheduleId = data.activeScheduleId;
            state.dayOverrides = data.dayOverrides || {};
            state.dayNotes = data.dayNotes || {};
        } catch (e) {
            console.error('加载数据失败', e);
        }
    }
}

/**
 * 解析本地日期（避免 YYYY-MM-DD 被当成 UTC 解析）
 * @param {string|Date|number} value
 * @returns {Date|null}
 */
export function parseLocalDate(value) {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            const date = new Date(year, month - 1, day);
            if (
                date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day
            ) {
                return date;
            }
            return null;
        }
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
