// ===== 应用状态管理模块 =====

// 默认班次类型
export const defaultShiftTypes = [
    { id: 'day', name: '白班', color: '#FFB74D', icon: '☀️', kind: 'work' },
    { id: 'night', name: '夜班', color: '#7986CB', icon: '🌙', kind: 'night' },
    { id: 'off', name: '休息', color: '#81C784', icon: '🏠', kind: 'rest' },
    { id: 'afternoon', name: '下午班', color: '#FF8A65', icon: '🌅', kind: 'work' },
    { id: 'duty', name: '值班', color: '#9575CD', icon: '📋', kind: 'duty' }
];

export const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function getWeekdayLabel(date) {
    const target = parseLocalDate(date);
    return target ? WEEKDAY_LABELS[target.getDay()] : '';
}

export function inferShiftKind(name, id, fallbackKind = 'work') {
    const normalizedName = String(name || '').trim();
    const normalizedId = String(id || '').trim().toLowerCase();

    if (normalizedId === 'off' || normalizedName.includes('休')) return 'rest';
    if (normalizedId === 'night' || normalizedName.includes('夜班')) return 'night';
    if (normalizedId === 'duty' || normalizedName.includes('值班')) return 'duty';
    return fallbackKind;
}

export function normalizeShiftType(shiftType, fallback = {}) {
    const source = shiftType && typeof shiftType === 'object' ? shiftType : {};
    return {
        id: String(source.id ?? fallback.id ?? '').trim(),
        name: String(source.name ?? fallback.name ?? '').trim(),
        color: String(source.color ?? fallback.color ?? '#9CA3AF').trim(),
        icon: String(source.icon ?? fallback.icon ?? '📌').trim(),
        kind: inferShiftKind(source.name, source.id, source.kind || fallback.kind || 'work')
    };
}

export function normalizeShiftTypes(shiftTypes, fallbackShiftTypes = defaultShiftTypes) {
    const source = Array.isArray(shiftTypes) ? shiftTypes : [];
    const fallback = Array.isArray(fallbackShiftTypes) && fallbackShiftTypes.length > 0
        ? fallbackShiftTypes
        : defaultShiftTypes;

    if (source.length === 0) {
        return fallback.map(type => normalizeShiftType(type, type));
    }

    return source.map((type, index) => normalizeShiftType(type, fallback[index] || fallback[0] || defaultShiftTypes[0]));
}

export function getScheduleShiftTypes(schedule) {
    if (schedule && Array.isArray(schedule.shiftTypes) && schedule.shiftTypes.length > 0) {
        return schedule.shiftTypes;
    }
    return state.shiftTypes;
}

export function findShiftById(shiftTypes, shiftId) {
    if (!shiftId || !Array.isArray(shiftTypes)) return null;
    return shiftTypes.find(type => type.id === shiftId) || null;
}

export function findShiftByKind(shiftTypes, kind) {
    if (!kind || !Array.isArray(shiftTypes)) return null;
    return shiftTypes.find(type => type.kind === kind) || null;
}

export function isRestShift(shift) {
    return !!shift && shift.kind === 'rest';
}

export function isNightShift(shift) {
    return !!shift && shift.kind === 'night';
}

export function isDutyShift(shift) {
    return !!shift && shift.kind === 'duty';
}

function createImportantDatesIndex(importantDates) {
    const exact = Object.create(null);
    const repeating = Object.create(null);

    if (!Array.isArray(importantDates) || importantDates.length === 0) {
        return { exact, repeating };
    }

    importantDates.forEach(item => {
        if (!item || !item.date) return;

        if (item.repeat === false) {
            if (!exact[item.date]) {
                exact[item.date] = item;
            }
            return;
        }

        const parts = String(item.date).split('-');
        if (parts.length !== 3) return;
        const monthDay = `${parts[1]}-${parts[2]}`;
        if (!repeating[monthDay]) {
            repeating[monthDay] = item;
        }
    });

    return { exact, repeating };
}

export function rebuildImportantDatesIndex(importantDates = state.importantDates) {
    const index = createImportantDatesIndex(importantDates);
    if (importantDates === state.importantDates) {
        state.importantDatesIndex = index;
    }
    return index;
}

export function findImportantDateForDate(date, importantDates = state.importantDates) {
    const target = parseLocalDate(date);
    if (!target || !Array.isArray(importantDates) || importantDates.length === 0) return null;

    const dateStr = formatDate(target);
    const monthDay = `${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    const index = importantDates === state.importantDates
        ? (state.importantDatesIndex || rebuildImportantDatesIndex())
        : createImportantDatesIndex(importantDates);

    return index.exact[dateStr] || index.repeating[monthDay] || null;
}

const DAY_OVERRIDE_DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_DAY_OVERRIDES = Object.freeze({});

function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeScheduleDayOverrides(rawOverrides) {
    if (!isPlainObject(rawOverrides)) return {};

    const normalized = {};
    Object.entries(rawOverrides).forEach(([dateKey, shiftId]) => {
        if (!DAY_OVERRIDE_DATE_KEY_RE.test(dateKey) || !parseLocalDate(dateKey)) return;
        const normalizedShiftId = String(shiftId ?? '').trim();
        if (!normalizedShiftId) return;
        normalized[dateKey] = normalizedShiftId;
    });
    return normalized;
}

export function normalizeDayOverridesBySchedule(rawDayOverrides, activeScheduleId = null, scheduleIds = []) {
    if (!isPlainObject(rawDayOverrides)) return {};

    const entries = Object.entries(rawDayOverrides);
    if (entries.length === 0) return {};

    const fallbackScheduleId = [activeScheduleId, ...scheduleIds]
        .map(scheduleId => String(scheduleId ?? '').trim())
        .find(Boolean) || null;

    if (entries.every(([key]) => DAY_OVERRIDE_DATE_KEY_RE.test(key))) {
        const legacyOverrides = normalizeScheduleDayOverrides(rawDayOverrides);
        if (!fallbackScheduleId || Object.keys(legacyOverrides).length === 0) return {};
        return { [fallbackScheduleId]: legacyOverrides };
    }

    const normalized = {};
    entries.forEach(([scheduleId, rawOverrides]) => {
        const normalizedScheduleId = String(scheduleId ?? '').trim();
        if (!normalizedScheduleId) return;
        const overrides = normalizeScheduleDayOverrides(rawOverrides);
        if (Object.keys(overrides).length === 0) return;
        normalized[normalizedScheduleId] = overrides;
    });
    return normalized;
}

export function getScheduleDayOverrides(scheduleOrId) {
    const scheduleId = typeof scheduleOrId === 'string'
        ? scheduleOrId.trim()
        : String(scheduleOrId?.id ?? '').trim();
    if (!scheduleId) return EMPTY_DAY_OVERRIDES;
    return state.dayOverrides[scheduleId] || EMPTY_DAY_OVERRIDES;
}

export function setScheduleDayOverride(scheduleOrId, dateKey, shiftId) {
    const scheduleId = typeof scheduleOrId === 'string'
        ? scheduleOrId.trim()
        : String(scheduleOrId?.id ?? '').trim();
    const normalizedShiftId = String(shiftId ?? '').trim();
    if (!scheduleId || !DAY_OVERRIDE_DATE_KEY_RE.test(dateKey) || !parseLocalDate(dateKey) || !normalizedShiftId) return;

    const overrides = getScheduleDayOverrides(scheduleId);
    state.dayOverrides[scheduleId] = {
        ...overrides,
        [dateKey]: normalizedShiftId
    };
}

export function deleteScheduleDayOverride(scheduleOrId, dateKey) {
    const scheduleId = typeof scheduleOrId === 'string'
        ? scheduleOrId.trim()
        : String(scheduleOrId?.id ?? '').trim();
    if (!scheduleId || !DAY_OVERRIDE_DATE_KEY_RE.test(dateKey) || !parseLocalDate(dateKey)) return;

    const overrides = getScheduleDayOverrides(scheduleId);
    if (!overrides[dateKey]) return;

    delete overrides[dateKey];
    if (Object.keys(overrides).length === 0) {
        delete state.dayOverrides[scheduleId];
        return;
    }
    state.dayOverrides[scheduleId] = overrides;
}

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
    importantDatesIndex: { exact: Object.create(null), repeating: Object.create(null) },
    todos: {}
};

const STORAGE_KEY = 'shift-calendar-data';

/**
 * 保存状态到本地存储
 */
export function saveState() {
    const data = {
        shiftTypes: normalizeShiftTypes(state.shiftTypes),
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
            state.shiftTypes = normalizeShiftTypes(data.shiftTypes, defaultShiftTypes);

            state.schedules = Array.isArray(data.schedules)
                ? data.schedules.map(schedule => ({
                    ...schedule,
                    shiftTypes: normalizeShiftTypes(schedule.shiftTypes, state.shiftTypes)
                }))
                : [];

            const savedActiveScheduleId = String(data.activeScheduleId ?? '').trim();
            state.activeScheduleId = state.schedules.some(schedule => schedule.id === savedActiveScheduleId)
                ? savedActiveScheduleId
                : (state.schedules[0]?.id || null);
            state.dayOverrides = normalizeDayOverridesBySchedule(
                data.dayOverrides,
                state.activeScheduleId,
                state.schedules.map(schedule => schedule.id)
            );
            state.dayNotes = data.dayNotes || {};

            const activeSchedule = state.schedules.find(schedule => schedule.id === state.activeScheduleId) || null;
            state.currentDate = activeSchedule
                ? (parseLocalDate(activeSchedule.startDate) || new Date())
                : new Date();
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
