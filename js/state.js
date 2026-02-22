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
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
