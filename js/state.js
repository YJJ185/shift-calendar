// ===== 状态管理模块 =====

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
    dayOverrides: {},  // 临时调班: { 'YYYY-MM-DD': shiftTypeId }
    dayNotes: {},      // 日期备注: { 'YYYY-MM-DD': '备注内容' }
    importantDates: [],// 重要日期
    todos: {}          // 待办事项
};

// 本地存储 Key
const STORAGE_KEY = 'shift-calendar-data';

/**
 * 保存状态到 localStorage
 */
export function saveState() {
    const data = {
        shiftTypes: state.shiftTypes,
        schedules: state.schedules,
        activeScheduleId: state.activeScheduleId,
        dayOverrides: state.dayOverrides,
        dayNotes: state.dayNotes,
        importantDates: state.importantDates,
        todos: state.todos
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * 从 localStorage 加载状态
 */
export function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // 加载保存的班次类型，并合并新增的默认班次
            const savedShiftTypes = data.shiftTypes || [];
            const existingIds = savedShiftTypes.map(t => t.id);
            const newTypes = defaultShiftTypes.filter(t => !existingIds.includes(t.id));
            state.shiftTypes = [...savedShiftTypes, ...newTypes];

            state.schedules = data.schedules || [];
            state.activeScheduleId = data.activeScheduleId;
            state.dayOverrides = data.dayOverrides || {};
            state.dayNotes = data.dayNotes || {};
            state.importantDates = data.importantDates || [];
            state.todos = data.todos || {};
        } catch (e) {
            console.error('加载数据失败', e);
        }
    }
}

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
