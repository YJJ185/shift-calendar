// ===== 排班日历应用 =====

// 工具函数
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const uuid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// 默认班次类型
const defaultShiftTypes = [
    { id: 'day', name: '白班', color: '#FFB74D', icon: '☀️' },
    { id: 'night', name: '夜班', color: '#7986CB', icon: '🌙' },
    { id: 'off', name: '休息', color: '#81C784', icon: '🏠' },
    { id: 'afternoon', name: '下午班', color: '#FF8A65', icon: '🌅' },
    { id: 'duty', name: '值班', color: '#9575CD', icon: '📋' }
];

// 2026年法定节假日安排（包含放假日期和调休补班日期）
// 格式：'YYYY-MM-DD': { type: 'holiday'|'workday', name: '名称', icon: '图标' }
const holidaySchedule2026 = {
    // 元旦 (1月1日-3日放假，1月1日周四，不需调休)
    '2026-01-01': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-02': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-03': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-04': { type: 'workday', name: '元旦调休', icon: '💼' },

    // 春节 (2月15日-23日放假9天，2月14日、2月28日调休补班)
    // 腊月二十九是除夕（2026年腊月为小月）
    '2026-02-14': { type: 'workday', name: '春节调休', icon: '💼' },
    '2026-02-15': { type: 'holiday', name: '廿八', icon: '🧧' },
    '2026-02-16': { type: 'holiday', name: '除夕', icon: '🧨' },
    '2026-02-17': { type: 'holiday', name: '春节', icon: '🧧' },
    '2026-02-18': { type: 'holiday', name: '初二', icon: '🧧' },
    '2026-02-19': { type: 'holiday', name: '初三', icon: '🧧' },
    '2026-02-20': { type: 'holiday', name: '初四', icon: '🧧' },
    '2026-02-21': { type: 'holiday', name: '初五', icon: '🧧' },
    '2026-02-22': { type: 'holiday', name: '初六', icon: '🧧' },
    '2026-02-23': { type: 'holiday', name: '初七', icon: '🧧' },
    '2026-02-28': { type: 'workday', name: '春节调休', icon: '💼' },

    // 清明节 (4月4日-6日放假，4月4日周六)
    '2026-04-04': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2026-04-05': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2026-04-06': { type: 'holiday', name: '清明节', icon: '🌿' },

    // 劳动节 (5月1日-5日放假，4月26日、5月9日调休补班)
    '2026-04-26': { type: 'workday', name: '劳动节调休', icon: '💼' },
    '2026-05-01': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-02': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-03': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-04': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-05': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-09': { type: 'workday', name: '劳动节调休', icon: '💼' },

    // 端午节 (5月31日-6月2日放假，5月31日周日)
    '2026-05-31': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2026-06-01': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2026-06-02': { type: 'holiday', name: '端午节', icon: '🐉' },

    // 中秋节 (9月27日-29日放假)
    '2026-09-27': { type: 'holiday', name: '中秋节', icon: '🥮' },
    '2026-09-28': { type: 'holiday', name: '中秋节', icon: '🥮' },
    '2026-09-29': { type: 'holiday', name: '中秋节', icon: '🥮' },

    // 国庆节 (10月1日-8日放假，9月27日、10月10日调休补班)
    '2026-09-26': { type: 'workday', name: '国庆调休', icon: '💼' },
    '2026-10-01': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-02': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-03': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-04': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-05': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-06': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-07': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-08': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2026-10-10': { type: 'workday', name: '国庆调休', icon: '💼' },
};

// 非法定但常见的节日（仅显示标记，不放假）
const commonHolidays = {
    '02-14': { name: '情人节', icon: '💕' },
    '03-08': { name: '妇女节', icon: '👩' },
    '03-12': { name: '植树节', icon: '🌳' },
    '06-01': { name: '儿童节', icon: '👶' },
    '09-10': { name: '教师节', icon: '📚' },
    '11-11': { name: '双十一', icon: '🛒' },
    '12-24': { name: '平安夜', icon: '🎄' },
    '12-25': { name: '圣诞节', icon: '🎅' },
};

// 2026年农历节日（根据农历计算的公历日期）
const lunarHolidays2026 = {
    '2026-03-03': { name: '元宵节', icon: '🏮' },   // 正月十五
    '2026-03-20': { name: '龙抬头', icon: '🐲' },   // 二月二
    '2026-08-19': { name: '七夕节', icon: '💑' },   // 七月初七
    '2026-08-22': { name: '中元节', icon: '🙏' },   // 七月十五
    '2026-10-25': { name: '重阳节', icon: '🌸' },   // 九月初九
};

// 2026年24节气数据
const solarTerms2026 = {
    '2026-01-05': '小寒',
    '2026-01-20': '大寒',
    '2026-02-04': '立春',
    '2026-02-18': '雨水',
    '2026-03-05': '惊蛰',
    '2026-03-20': '春分',
    '2026-04-04': '清明',
    '2026-04-20': '谷雨',
    '2026-05-05': '立夏',
    '2026-05-21': '小满',
    '2026-06-05': '芒种',
    '2026-06-21': '夏至',
    '2026-07-07': '小暑',
    '2026-07-22': '大暑',
    '2026-08-07': '立秋',
    '2026-08-23': '处暑',
    '2026-09-07': '白露',
    '2026-09-23': '秋分',
    '2026-10-08': '寒露',
    '2026-10-23': '霜降',
    '2026-11-07': '立冬',
    '2026-11-22': '小雪',
    '2026-12-07': '大雪',
    '2026-12-21': '冬至',
};

// 获取节气
function getSolarTerm(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return solarTerms2026[dateStr] || null;
}

// 获取指定日期的节假日信息
function getHolidayInfo(date) {
    // 使用本地日期格式，避免UTC时区偏移问题
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const monthDay = `${month}-${day}`;

    // 先检查法定节假日安排
    if (holidaySchedule2026[dateStr]) {
        return holidaySchedule2026[dateStr];
    }

    // 再检查农历特殊节日
    if (lunarHolidays2026[dateStr]) {
        return { type: 'lunar', ...lunarHolidays2026[dateStr] };
    }

    // 再检查常见节日
    if (commonHolidays[monthDay]) {
        return { type: 'common', ...commonHolidays[monthDay] };
    }

    return null;
}

// 应用状态
let state = {
    shiftTypes: [...defaultShiftTypes],
    schedules: [],
    activeScheduleId: null,
    pattern: [],
    currentDate: new Date(),
    monthsToShow: 1,
    dayOverrides: {},  // 临时调班: { 'YYYY-MM-DD': shiftTypeId }
    dayNotes: {}       // 日期备注: { 'YYYY-MM-DD': '备注内容' }
};

// ===== 本地存储 =====
const STORAGE_KEY = 'shift-calendar-data';

function saveState() {
    const data = {
        shiftTypes: state.shiftTypes,
        schedules: state.schedules,
        activeScheduleId: state.activeScheduleId,
        dayOverrides: state.dayOverrides,
        dayNotes: state.dayNotes
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // 加载保存的班次类型，并合并新增的默认班次
            const savedShiftTypes = data.shiftTypes || [];
            // 检查是否有新增的默认班次类型需要添加
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

// ===== Toast 提示 =====
function showToast(message, type = 'success') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = 'toast active ' + type;
    setTimeout(() => toast.classList.remove('active'), 3000);
}

// ===== 班次类型管理 =====
let editingShiftTypeId = null;

function renderShiftTypes() {
    const list = $('#shiftTypesList');
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

function renderPatternBuilder() {
    const builder = $('#patternBuilder');
    builder.innerHTML = state.shiftTypes.map(t => `
        <span class="pattern-btn" data-id="${t.id}" style="background:${t.color}">
            ${t.icon} ${t.name}
        </span>
    `).join('');

    builder.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => addToPattern(btn.dataset.id));
    });
}

function openShiftTypeModal(id = null) {
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

function closeShiftTypeModal() {
    $('#shiftTypeModal').classList.remove('active');
    editingShiftTypeId = null;
}

function saveShiftType() {
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

function deleteShiftType() {
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

function updateColorValue() {
    $('#colorValue').textContent = $('#shiftTypeColor').value.toUpperCase();
}

// ===== 规律设置 =====
function addToPattern(shiftId) {
    state.pattern.push(shiftId);
    renderPatternPreview();
}

function removeFromPattern(index) {
    state.pattern.splice(index, 1);
    renderPatternPreview();
}

function clearPattern() {
    state.pattern = [];
    renderPatternPreview();
}

function renderPatternPreview() {
    const preview = $('#patternPreview');
    const select = $('#startShift');

    if (state.pattern.length === 0) {
        preview.innerHTML = '<span class="empty-hint">点击上方班次添加规律...</span>';
        select.innerHTML = '<option value="0">请先设置规律</option>';
        return;
    }

    preview.innerHTML = state.pattern.map((id, i) => {
        const type = state.shiftTypes.find(t => t.id === id);
        if (!type) return '';
        const arrow = i < state.pattern.length - 1 ? '<span class="pattern-arrow">→</span>' : '';
        return `<span class="pattern-item" data-index="${i}" style="background:${type.color}" title="位置${i + 1}: ${type.name}（点击删除）"><span class="pattern-pos">${i + 1}</span>${type.icon}</span>${arrow}`;
    }).join('');

    preview.querySelectorAll('.pattern-item').forEach(item => {
        item.addEventListener('click', () => removeFromPattern(parseInt(item.dataset.index)));
    });

    // 更新起始位置选择器 - 说明今天是规律中的第几天
    renderStartIndexOptions();
}

function renderStartIndexOptions() {
    const select = $('#startShift');
    const preview = $('#schedulePreview');

    if (state.pattern.length === 0) {
        select.innerHTML = '<option value="0">请先设置规律</option>';
        preview.innerHTML = '';
        return;
    }

    select.innerHTML = state.pattern.map((id, i) => {
        const type = state.shiftTypes.find(t => t.id === id);
        if (!type) return '';
        // 显示：第X天 - 班次名（今天从这里开始）
        return `<option value="${i}">第${i + 1}天 - ${type.icon} ${type.name}</option>`;
    }).join('');

    // 更新预览
    updateSchedulePreview();

    // 监听选择变化
    select.onchange = updateSchedulePreview;
}

// 更新排班预览 - 显示接下来5天的排班
function updateSchedulePreview() {
    const preview = $('#schedulePreview');
    const startIndex = parseInt($('#startShift').value) || 0;

    if (state.pattern.length === 0) {
        preview.innerHTML = '';
        return;
    }

    // 生成接下来5天的预览
    const days = ['今天', '明天', '后天', '第4天', '第5天'];
    const previewDays = days.map((dayName, i) => {
        const idx = (startIndex + i) % state.pattern.length;
        const shiftId = state.pattern[idx];
        const type = state.shiftTypes.find(t => t.id === shiftId);
        if (!type) return '';
        return `<span class="preview-day">${dayName}: ${type.icon}${type.name}</span>`;
    }).join('');

    preview.innerHTML = `
        <div class="preview-label">📅 排班预览：</div>
        <div class="preview-days">${previewDays}</div>
    `;
}

// ===== 生成排班 =====
function generateSchedule() {
    const startDate = $('#startDate').value;
    const startIndex = parseInt($('#startShift').value) || 0;
    const name = $('#scheduleName').value.trim() || `排班方案 ${state.schedules.length + 1}`;

    if (!startDate) {
        showToast('请选择起始日期', 'error');
        return;
    }

    if (state.pattern.length === 0) {
        showToast('请设置排班规律', 'error');
        return;
    }

    const schedule = {
        id: uuid(),
        name,
        createdAt: new Date().toISOString(),
        startDate,
        startIndex,
        pattern: [...state.pattern],
        shiftTypes: JSON.parse(JSON.stringify(state.shiftTypes)),
        weekendRestMode: $('#weekendRestMode').checked, // 保存周末休息模式设置
        isActive: true
    };

    state.schedules.forEach(s => s.isActive = false);
    state.schedules.unshift(schedule);
    state.activeScheduleId = schedule.id;

    saveState();
    state.currentDate = new Date(startDate);
    renderCalendar();
    showToast('排班方案已生成！');
}

// ===== 日历渲染 =====
function getShiftForDate(schedule, date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // 检查是否有临时调班
    if (state.dayOverrides[dateStr]) {
        const overrideShiftId = state.dayOverrides[dateStr];
        // 使用当前班次类型列表查找
        return state.shiftTypes.find(t => t.id === overrideShiftId);
    }

    // 正常计算班次
    const start = new Date(schedule.startDate);
    const target = new Date(date);
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;

    const pattern = schedule.pattern;
    const idx = (schedule.startIndex + diffDays) % pattern.length;
    const shiftId = pattern[idx];
    const shift = schedule.shiftTypes.find(t => t.id === shiftId);

    // 医护排班特殊规则：周末非值班非夜班自动休息
    if (schedule.weekendRestMode) {
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        // 如果是周末，且原定班次不是"值班"或"夜班"，则强制改为"休息"
        if (isWeekend && shift && !['值班', '夜班'].includes(shift.name)) {
            const restShift = schedule.shiftTypes.find(t => t.name === '休息');
            if (restShift) return restShift;
        }
    }

    return shift;
}

// 农历计算（基于农历数据表）
const lunarInfo = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0
];

function getLunarMonthDay(date) {
    // 基准日期：公历1900年1月31日是农历正月初一
    // 创建一个表示该日期0时0分的Date对象
    const baseDate = new Date(1900, 0, 31, 0, 0, 0);
    // 确保输入日期也是当天0时
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    let offset = Math.floor((targetDate - baseDate) / 86400000);

    let year = 1900;
    let yearDays;
    while (year < 2100 && offset > 0) {
        yearDays = getLunarYearDays(year);
        if (offset < yearDays) break;
        offset -= yearDays;
        year++;
    }

    let month = 1;
    let leapMonth = getLeapMonth(year);
    let isLeap = false;
    let monthDays;

    // 修复闰月处理逻辑
    for (month = 1; month <= 12; month++) {
        // 先处理正常月份
        monthDays = getLunarMonthDays(year, month);
        if (offset < monthDays) {
            break;
        }
        offset -= monthDays;

        // 如果当前月份是闰月，还需要处理闰月
        if (leapMonth > 0 && month === leapMonth) {
            monthDays = getLeapDays(year);
            if (offset < monthDays) {
                isLeap = true;
                break;
            }
            offset -= monthDays;
        }
    }

    return { month, day: offset + 1, isLeap };
}

function getLunarYearDays(year) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) {
        sum += (lunarInfo[year - 1900] & i) ? 1 : 0;
    }
    return sum + getLeapDays(year);
}

function getLeapMonth(year) {
    return lunarInfo[year - 1900] & 0xf;
}

function getLeapDays(year) {
    if (getLeapMonth(year)) {
        return (lunarInfo[year - 1900] & 0x10000) ? 30 : 29;
    }
    return 0;
}

function getLunarMonthDays(year, month) {
    return (lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

function getLunarDay(date) {
    const lunarDays = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
        '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
        '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

    const lunar = getLunarMonthDay(date);
    return lunarDays[lunar.day - 1] || '';
}

function renderCalendar() {
    const container = $('#calendarContainer');
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);

    // 同步周末休息模式复选框状态
    if ($('#weekendRestMode')) {
        $('#weekendRestMode').checked = schedule ? !!schedule.weekendRestMode : false;
    }

    // 清空容器
    container.innerHTML = '';

    if (!schedule) {
        // 动态创建空状态
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
            <div class="empty-icon">📅</div>
            <h3>还没有排班</h3>
            <p>在左侧设置你的班次类型和排班规律，然后点击"生成排班"</p>
        `;
        container.appendChild(emptyDiv);
        updateCurrentRangeLabel();
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let m = 0; m < state.monthsToShow; m++) {
        const monthDate = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + m, 1);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();

        const monthDiv = document.createElement('div');
        monthDiv.className = 'month-calendar';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = `<div class="month-header">${year}年${month + 1}月</div>`;
        html += '<div class="calendar-grid">';

        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach((d, i) => {
            const weekend = i === 0 || i === 6 ? ' weekend' : '';
            html += `<div class="weekday-header${weekend}">${d}</div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const isToday = date.getTime() === today.getTime();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const shift = getShiftForDate(schedule, date);

            // 获取日期字符串
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasOverride = !!state.dayOverrides[dateStr];
            const hasNote = !!state.dayNotes[dateStr];

            // 获取农历、节日和节气信息
            const lunarDayStr = getLunarDay(date);
            const holiday = getHolidayInfo(date);
            const solarTerm = getSolarTerm(date);

            // 显示优先级：节假日名称 > 节气 > 农历
            let displayText = lunarDayStr;
            let displayClass = 'lunar-day';
            if (holiday) {
                displayText = holiday.name;
                displayClass = 'lunar-day holiday-name';
            } else if (solarTerm) {
                displayText = solarTerm;
                displayClass = 'lunar-day solar-term';
            }

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (isWeekend) classes += ' weekend';

            let shiftHtml = '';
            if (shift) {
                shiftHtml = `
                    <div class="day-shift" style="background: linear-gradient(135deg, ${shift.color} 0%, ${adjustColor(shift.color, -20)} 100%);">
                        <span class="shift-icon">${shift.icon}</span>
                        <span class="shift-name">${shift.name}</span>
                    </div>`;
            }

            // 节日显示
            let workStatusHtml = '';

            if (holiday) {
                // 法定节假日标签 ("休") 或 调休补班 ("班")
                if (holiday.type === 'holiday') {
                    workStatusHtml = `
                        <div class="work-status holiday">
                            <span class="work-status-text">休</span>
                        </div>`;
                } else if (holiday.type === 'workday') {
                    workStatusHtml = `
                        <div class="work-status work">
                            <span class="work-status-text">班</span>
                        </div>`;
                }
            }

            // 调班标记
            const overrideBadge = hasOverride ? '<span class="day-override-badge">调</span>' : '';

            // 备注指示器
            const noteIndicator = hasNote ? '<span class="day-note-indicator">📝</span>' : '';

            // 重要日期标记
            let importantDateBadge = '';
            if (state.importantDates && state.importantDates.length > 0) {
                const monthDay = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const importantDate = state.importantDates.find(d => {
                    const [, m, dd] = d.date.split('-');
                    return `${m}-${dd}` === monthDay;
                });
                if (importantDate) {
                    importantDateBadge = `<span class="important-date-badge" title="${importantDate.name}">${importantDate.icon}</span>`;
                }
            }

            // 待办标记
            let todoIndicator = '';
            if (state.todos && state.todos[dateStr]) {
                todoIndicator = '<span class="todo-indicator">办</span>';
            }

            html += `
                <div class="${classes}" data-date="${dateStr}">
                    ${workStatusHtml}
                    ${overrideBadge}
                    ${todoIndicator}
                    <div class="day-header">
                        <span class="day-number">${day}</span>
                        <span class="${displayClass}">${displayText}</span>
                    </div>
                    ${shiftHtml}
                    ${importantDateBadge}
                    ${noteIndicator}
                    ${isToday ? '<div class="today-badge">今天</div>' : ''}
                </div>`;
        }

        html += '</div>';
        monthDiv.innerHTML = html;
        container.appendChild(monthDiv);
    }

    updateCurrentRangeLabel();
    updateStats(); // 更新统计数据

    // 更新倒计时
    if (typeof updateCountdown === 'function') {
        updateCountdown();
    }
}

// 统计功能
function updateStats() {
    const container = $('#statsGrid');
    if (!container) return; // 防御性检查

    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    // 更新标题
    const cardHeader = container.closest('.card').querySelector('h2');
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
    // 初始化统计
    state.shiftTypes.forEach(t => stats[t.id] = 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const shift = getShiftForDate(schedule, date);
        if (shift) {
            stats[shift.id] = (stats[shift.id] || 0) + 1;
        }
    }

    // 计算总天数
    const totalDays = Object.values(stats).reduce((a, b) => a + b, 0);

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

// 颜色调整工具
function adjustColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function updateCurrentRangeLabel() {
    // 更新年月选择器的值
    if ($('#yearSelect') && $('#monthSelect')) {
        updateDatePickerValues();
    }
}

function navigateMonth(delta) {
    const container = $('#calendarContainer');
    // 添加动画类
    container.classList.add(delta > 0 ? 'animate-left' : 'animate-right');

    const newDate = new Date(state.currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    state.currentDate = newDate;
    updateDatePickerValues();
    renderCalendar();

    // 延迟移除动画类
    setTimeout(() => {
        container.classList.remove('animate-left', 'animate-right');
    }, 400);
}

function setMonthsToShow(months) {
    state.monthsToShow = months;
    $$('#rangeSelector .btn-range').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.months) === months);
    });
    renderCalendar();
}

// ===== 历史记录 =====
function openHistoryModal() {
    renderHistoryList();
    initHistoryListEvents();
    $('#historyModal').classList.add('active');
}

function closeHistoryModal() {
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
            return type ? `<span class="history-pattern-dot" style="background:${type.color}"></span>` : '';
        }).join('');

        return `
            <div class="history-item${isActive ? ' active' : ''}" data-id="${s.id}">
                <div class="history-item-icon">📅</div>
                <div class="history-item-info">
                    <div class="history-item-name">${s.name}</div>
                    <div class="history-item-date">创建于 ${date} · 起始: ${s.startDate}</div>
                    <div class="history-item-pattern">${patternDots}</div>
                </div>
                ${isActive ? '<span class="history-item-active-badge">当前</span>' : ''}
                <button class="history-delete-btn" data-id="${s.id}" title="删除此记录">×</button>
            </div>
        `;
    }).join('');
}

// 初始化历史记录列表的事件委托（只绑定一次）
function initHistoryListEvents() {
    const list = $('#historyList');
    if (list.dataset.eventsInitialized) return;
    list.dataset.eventsInitialized = 'true';

    list.addEventListener('click', (e) => {
        // 处理删除按钮点击 - 使用closest确保点击按钮内部也能触发
        const deleteBtn = e.target.closest('.history-delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            e.preventDefault();
            const scheduleId = deleteBtn.dataset.id;
            if (scheduleId) {
                deleteSchedule(scheduleId);
            }
            return;
        }

        // 处理历史记录项点击
        const item = e.target.closest('.history-item');
        if (item) {
            const schedule = state.schedules.find(s => s.id === item.dataset.id);
            if (schedule) {
                state.activeScheduleId = schedule.id;
                state.currentDate = new Date(schedule.startDate);
                state.pattern = [...schedule.pattern];
                $('#scheduleName').value = schedule.name;
                $('#startDate').value = schedule.startDate;
                renderStartIndexOptions();
                $('#startShift').value = schedule.startIndex || 0;
                saveState();
                renderPatternPreview();
                renderHistoryList();
                renderCalendar();
                closeHistoryModal();
            }
        }
    });
}

// 待删除的方案ID（用于确认对话框）
let pendingDeleteScheduleId = null;

// 显示确认对话框
// 显示确认对话框
function showConfirmDialog(message, onConfirm, confirmText = '确定', confirmStyle = 'danger') {
    $('#confirmMessage').textContent = message;
    const btn = $('#confirmOkBtn');
    btn.textContent = confirmText;

    // 重置样式并应用新样式
    btn.className = 'btn';
    btn.classList.add(confirmStyle === 'danger' ? 'btn-danger' : 'btn-primary');

    $('#confirmModal').classList.add('active');

    // 设置确认回调
    window._confirmCallback = onConfirm;
}

// 关闭确认对话框
function closeConfirmDialog() {
    $('#confirmModal').classList.remove('active');
    window._confirmCallback = null;
}

// 删除排班记录 - 显示确认对话框
function deleteSchedule(scheduleId) {
    const schedule = state.schedules.find(s => s.id === scheduleId);
    if (!schedule) return;

    pendingDeleteScheduleId = scheduleId;
    showConfirmDialog(`确定要删除方案 "${schedule.name}" 吗？`, () => {
        // 执行实际删除
        state.schedules = state.schedules.filter(s => s.id !== pendingDeleteScheduleId);

        // 如果删除的是当前激活的方案，切换到下一个
        if (state.activeScheduleId === pendingDeleteScheduleId) {
            if (state.schedules.length > 0) {
                state.activeScheduleId = state.schedules[0].id;
                state.currentDate = new Date(state.schedules[0].startDate);
            } else {
                state.activeScheduleId = null;
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

function openDayEditModal(dateStr) {
    editingDateStr = dateStr;
    const modal = $('#dayEditModal');

    // 解析日期
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const lunar = getLunarDay(date);

    // 显示日期信息
    $('#dayEditDate').innerHTML = `
        <div class="date-main">${month}月${day}日 ${weekdays[date.getDay()]}</div>
        <div class="date-sub">${year}年</div>
        <div class="date-lunar">${lunar}</div>
    `;
    $('#dayEditTitle').textContent = `编辑 ${month}月${day}日`;

    // 获取当前班次
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    let currentShiftId = null;

    if (schedule) {
        // 先检查是否有临时调班
        if (state.dayOverrides[dateStr]) {
            currentShiftId = state.dayOverrides[dateStr];
            $('#dayEditOverride').checked = true;
        } else {
            // 获取原排班
            const shift = getShiftForDateOriginal(schedule, date);
            currentShiftId = shift ? shift.id : null;
            $('#dayEditOverride').checked = false;
        }
    }

    selectedShiftId = currentShiftId;

    // 渲染班次选项
    renderDayEditShifts(currentShiftId);

    // 加载备注
    $('#dayNote').value = state.dayNotes[dateStr] || '';

    // 加载待办
    if ($('#dayTodo')) {
        $('#dayTodo').value = (state.todos && state.todos[dateStr]) || '';
    }

    modal.classList.add('active');
}

// 获取原始排班（不考虑调班覆盖）
function getShiftForDateOriginal(schedule, date) {
    const start = new Date(schedule.startDate);
    const target = new Date(date);
    start.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((target - start) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;

    const pattern = schedule.pattern;
    const idx = (schedule.startIndex + diffDays) % pattern.length;
    const shiftId = pattern[idx];
    return schedule.shiftTypes.find(t => t.id === shiftId);
}

function renderDayEditShifts(selectedId) {
    const container = $('#dayEditShifts');
    container.innerHTML = state.shiftTypes.map(t => `
        <div class="day-edit-shift-btn ${t.id === selectedId ? 'selected' : ''}" 
             data-id="${t.id}" 
             style="background: ${t.color}">
            <span class="shift-icon">${t.icon}</span>
            <span class="shift-name">${t.name}</span>
        </div>
    `).join('');

    container.querySelectorAll('.day-edit-shift-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.day-edit-shift-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedShiftId = btn.dataset.id;
            // 选择班次时自动勾选临时调班
            $('#dayEditOverride').checked = true;
        });
    });
}

function closeDayEditModal() {
    $('#dayEditModal').classList.remove('active');
    editingDateStr = null;
    selectedShiftId = null;
}

function saveDayEdit() {
    if (!editingDateStr) return;

    const isOverride = $('#dayEditOverride').checked;
    const note = $('#dayNote').value.trim();
    const todo = $('#dayTodo')?.value.trim() || '';

    // 保存调班
    if (isOverride && selectedShiftId) {
        state.dayOverrides[editingDateStr] = selectedShiftId;
    } else {
        // 如果取消勾选，删除调班
        delete state.dayOverrides[editingDateStr];
    }

    // 保存备注
    if (note) {
        state.dayNotes[editingDateStr] = note;
    } else {
        delete state.dayNotes[editingDateStr];
    }

    // 保存待办
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
}

function clearDayOverride() {
    if (!editingDateStr) return;

    delete state.dayOverrides[editingDateStr];
    delete state.dayNotes[editingDateStr];

    saveState();
    renderCalendar();
    closeDayEditModal();
    showToast('已恢复默认排班');
}

// ===== 单日排班修改 =====
let editingDate = null; // 当前正在编辑的日期 YYYY-MM-DD

function initEditShiftModal() {
    // 绑定日历点击事件 (事件委托)
    $('#calendarContainer').addEventListener('click', (e) => {
        // 忽略空日期
        if (e.target.classList.contains('empty') || e.target.closest('.empty')) return;

        const dayEl = e.target.closest('.calendar-day');
        if (dayEl && dayEl.dataset.date) {
            openEditShiftModal(dayEl.dataset.date);
        }
    });

    // 绑定模态框事件
    $('#closeEditShiftBtn').addEventListener('click', closeEditShiftModal);
    $('#editShiftModal .modal-overlay').addEventListener('click', closeEditShiftModal);
    $('#resetShiftBtn').addEventListener('click', resetShiftOverride);
}

function openEditShiftModal(dateStr) {
    editingDate = dateStr;
    const date = new Date(dateStr);

    // 更新标题和日期显示
    const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekStr = weekMap[date.getDay()];
    $('#editShiftDate').textContent = `${dateStr} ${weekStr} (${getLunarDay(date)})`;

    // 生成班次选择网格
    const grid = $('#editShiftGrid');
    grid.innerHTML = '';

    // 获取当前选中的班次ID (可能是 override 的，也可能是默认算出来的)
    const currentOverrideId = state.dayOverrides[dateStr];

    state.shiftTypes.forEach(type => {
        const btn = document.createElement('div');
        btn.className = 'shift-option-btn';
        if (currentOverrideId === type.id) {
            btn.classList.add('active');
        }

        btn.innerHTML = `
            <span class="shift-icon">${type.icon}</span>
            <span class="shift-name">${type.name}</span>
        `;

        btn.onclick = () => selectShiftOverride(type.id);
        grid.appendChild(btn);
    });

    $('#editShiftModal').classList.add('active');
}

function closeEditShiftModal() {
    $('#editShiftModal').classList.remove('active');
    editingDate = null;
}

function selectShiftOverride(shiftId) {
    if (!editingDate) return;

    // 保存当前覆盖设置
    state.dayOverrides[editingDate] = shiftId;
    saveState();
    renderCalendar();

    showToast('已修改该日班次');

    // 智能联动逻辑：值班 -> 夜班 -> 休息
    const selectedShift = state.shiftTypes.find(t => t.id === shiftId);
    if (selectedShift && selectedShift.name === '值班') {
        const nightShift = state.shiftTypes.find(t => t.name === '夜班');
        // 查找休息班次（匹配"休息"或"双休"）
        const restShift = state.shiftTypes.find(t => t.name.includes('休息') || t.name.includes('双休'));

        if (nightShift && restShift) {
            // 计算日期
            const currentDate = new Date(editingDate);
            const d1 = new Date(currentDate); d1.setDate(d1.getDate() + 1);
            const d2 = new Date(currentDate); d2.setDate(d2.getDate() + 2);

            // 处理日期格式，注意时区问题，这里使用简单的本地日期处理
            const formatDate = (date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };

            const nextDateStr = formatDate(d1);
            const nextNextDateStr = formatDate(d2);

            setTimeout(() => {
                showConfirmDialog('检测到您设置了"值班"，是否自动将后两天设为"夜班"和"休息"？', () => {
                    state.dayOverrides[nextDateStr] = nightShift.id;
                    state.dayOverrides[nextNextDateStr] = restShift.id;
                    saveState();
                    renderCalendar();
                    showToast('已自动填充后两天班次');
                }, '自动填充', 'primary');
            }, 300);
        }
    }

    closeEditShiftModal();
}

function resetShiftOverride() {
    if (!editingDate) return;

    if (state.dayOverrides[editingDate]) {
        delete state.dayOverrides[editingDate];
        saveState();
        renderCalendar();
        showToast('已恢复默认排班');
    }
    closeEditShiftModal();
}

// ===== 初始化 =====
function init() {
    loadState();
    initEditShiftModal(); // 初始化单日修改功能

    const today = new Date().toISOString().split('T')[0];
    $('#startDate').value = today;
    state.currentDate = new Date();

    renderShiftTypes();
    renderPatternPreview();
    renderCalendar();

    // 事件绑定
    $('#addShiftTypeBtn').addEventListener('click', () => openShiftTypeModal());
    $('#closeShiftTypeBtn').addEventListener('click', closeShiftTypeModal);
    $('#shiftTypeModal .modal-overlay').addEventListener('click', closeShiftTypeModal);
    $('#saveShiftTypeBtn').addEventListener('click', saveShiftType);
    $('#deleteShiftTypeBtn').addEventListener('click', deleteShiftType);
    $('#shiftTypeColor').addEventListener('input', updateColorValue);

    $$('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $('#shiftTypeColor').value = btn.dataset.color;
            updateColorValue();
        });
    });
    $$('.icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $('#shiftTypeIcon').value = btn.dataset.icon;
        });
    });

    $('#clearPatternBtn').addEventListener('click', clearPattern);
    $('#generateBtn').addEventListener('click', generateSchedule);

    $('#prevBtn').addEventListener('click', () => navigateMonth(-1));
    $('#nextBtn').addEventListener('click', () => navigateMonth(1));
    $$('#rangeSelector .btn-range').forEach(btn => {
        btn.addEventListener('click', () => setMonthsToShow(parseInt(btn.dataset.months)));
    });

    // 年月选择器初始化
    initDatePicker();
    $('#yearSelect').addEventListener('change', onDatePickerChange);
    $('#monthSelect').addEventListener('change', onDatePickerChange);
    $('#todayBtn').addEventListener('click', goToToday);

    $('#historyBtn').addEventListener('click', openHistoryModal);
    $('#closeHistoryBtn').addEventListener('click', closeHistoryModal);
    $('#historyModal .modal-overlay').addEventListener('click', closeHistoryModal);

    // 确认对话框事件
    $('#closeConfirmBtn').addEventListener('click', closeConfirmDialog);
    $('#confirmCancelBtn').addEventListener('click', closeConfirmDialog);
    $('#confirmModal .modal-overlay').addEventListener('click', closeConfirmDialog);
    $('#confirmOkBtn').addEventListener('click', () => {
        if (window._confirmCallback) {
            window._confirmCallback();
        }
        closeConfirmDialog();
    });

    // 日期编辑弹窗事件
    $('#closeDayEditBtn').addEventListener('click', closeDayEditModal);
    $('#dayEditModal .modal-overlay').addEventListener('click', closeDayEditModal);
    $('#saveDayEditBtn').addEventListener('click', saveDayEdit);
    $('#clearDayOverrideBtn').addEventListener('click', clearDayOverride);

    // 医护智能排班事件
    $('#weekendRestMode').addEventListener('change', (e) => {
        const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
        if (schedule) {
            schedule.weekendRestMode = e.target.checked;
            saveState();
            renderCalendar();
            showToast(e.target.checked ? '已开启周末双休保护' : '已关闭周末双休保护');
        }
    });
}

// 初始化年月选择器
function initDatePicker() {
    const yearSelect = $('#yearSelect');
    const currentYear = new Date().getFullYear();

    // 生成年份选项（当前年份前后5年）
    yearSelect.innerHTML = '';
    for (let year = currentYear - 5; year <= currentYear + 10; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // 设置当前值
    updateDatePickerValues();
}

// 更新年月选择器显示值
function updateDatePickerValues() {
    $('#yearSelect').value = state.currentDate.getFullYear();
    $('#monthSelect').value = state.currentDate.getMonth();
}

// 年月选择变更处理
function onDatePickerChange() {
    const year = parseInt($('#yearSelect').value);
    const month = parseInt($('#monthSelect').value);
    state.currentDate = new Date(year, month, 1);
    renderCalendar();
}

// 跳转到今天
function goToToday() {
    state.currentDate = new Date();
    updateDatePickerValues();
    renderCalendar();
}

// ===== 新功能：主题切换 =====
const THEMES = [
    { id: 'dark', name: '深色', icon: '🌙' },
    { id: 'light', name: '亮色', icon: '☀️' },
    { id: 'ocean', name: '深海蓝', icon: '🌊' },
    { id: 'forest', name: '护眼绿', icon: '🌲' },
    { id: 'sakura', name: '樱花粉', icon: '🌸' }
];

function initTheme() {
    const savedTheme = localStorage.getItem('shift-calendar-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    updateThemeMenu(savedTheme);
}

function toggleTheme() {
    // 切换主题选择器下拉菜单
    const selector = $('#themeSelector');
    selector.classList.toggle('active');
}

function selectTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem('shift-calendar-theme', themeId);
    updateThemeIcon(themeId);
    updateThemeMenu(themeId);

    const theme = THEMES.find(t => t.id === themeId);
    showToast(`已切换到${theme?.name || themeId}主题`);

    // 关闭下拉菜单
    $('#themeSelector').classList.remove('active');
}

function updateThemeIcon(theme) {
    const icon = $('#themeIcon');
    const themeInfo = THEMES.find(t => t.id === theme);
    if (icon && themeInfo) {
        icon.textContent = themeInfo.icon;
    }
}

function updateThemeMenu(currentTheme) {
    $$('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
}

// ===== 新功能：倒计时 =====
function updateCountdown() {
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
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        countdownNext.innerHTML = `${nextRestDate.getMonth() + 1}月${nextRestDate.getDate()}日 ${weekdays[nextRestDate.getDay()]}`;
    } else {
        countdownValue.textContent = '∞';
        countdownNext.innerHTML = '未找到休息日';
    }
}

// ===== 新功能：重要日期 =====
let editingImportantDateId = null;

function loadImportantDates() {
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

function saveImportantDates() {
    localStorage.setItem('shift-calendar-important-dates', JSON.stringify(state.importantDates));
}

function renderImportantDatesList() {
    const list = $('#importantDatesList');
    if (!list) return;

    if (!state.importantDates || state.importantDates.length === 0) {
        list.innerHTML = '<div class="empty-hint">点击 + 添加生日、纪念日等</div>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    list.innerHTML = state.importantDates.map(item => {
        const [year, month, day] = item.date.split('-').map(Number);
        let targetDate = new Date(today.getFullYear(), month - 1, day);
        if (targetDate < today) {
            targetDate.setFullYear(targetDate.getFullYear() + 1);
        }
        const daysUntil = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        const countdownText = daysUntil === 0 ? '就是今天！' : `还有${daysUntil}天`;

        return `
            <div class="important-date-item" data-id="${item.id}">
                <span class="important-date-icon">${item.icon}</span>
                <div class="important-date-info">
                    <div class="important-date-name">${item.name}</div>
                    <div class="important-date-date">${month}月${day}日 ${item.repeat ? '(每年)' : ''}</div>
                </div>
                <span class="important-date-countdown">${countdownText}</span>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.important-date-item').forEach(item => {
        item.addEventListener('click', () => openImportantDateModal(item.dataset.id));
    });
}

function openImportantDateModal(id = null) {
    editingImportantDateId = id;
    const modal = $('#importantDateModal');
    const title = $('#importantDateModalTitle');
    const deleteBtn = $('#deleteImportantDateBtn');

    if (id) {
        const item = state.importantDates.find(d => d.id === id);
        if (item) {
            title.textContent = '编辑重要日期';
            $('#importantDateDate').value = item.date;
            $('#importantDateName').value = item.name;
            $('#importantDateIcon').value = item.icon;
            $('#importantDateRepeat').checked = item.repeat;
            deleteBtn.style.display = 'block';
        }
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

function closeImportantDateModal() {
    $('#importantDateModal').classList.remove('active');
    editingImportantDateId = null;
}

function saveImportantDate() {
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

function deleteImportantDate() {
    if (!editingImportantDateId) return;
    state.importantDates = state.importantDates.filter(d => d.id !== editingImportantDateId);
    saveImportantDates();
    renderImportantDatesList();
    renderCalendar();
    closeImportantDateModal();
    showToast('已删除');
}

// ===== 新功能：待办事项 =====
function loadTodos() {
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

function saveTodos() {
    localStorage.setItem('shift-calendar-todos', JSON.stringify(state.todos));
}

// ===== 新功能：导出功能 =====
function toggleExportDropdown() {
    const dropdown = $('#exportDropdown');
    dropdown.classList.toggle('active');
}

function closeExportDropdown() {
    const dropdown = $('#exportDropdown');
    dropdown.classList.remove('active');
}

async function exportAsImage() {
    closeExportDropdown();
    showToast('正在生成图片...');

    // 使用简单的 Canvas 方法导出
    const container = $('#calendarContainer');

    try {
        // 动态加载 html2canvas
        if (!window.html2canvas) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        const canvas = await html2canvas(container, {
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            scale: 2
        });

        const link = document.createElement('a');
        link.download = `排班日历_${new Date().toLocaleDateString('zh-CN')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('图片已保存！');
    } catch (e) {
        console.error('导出图片失败:', e);
        showToast('导出失败，请重试', 'error');
    }
}

function exportAsJson() {
    closeExportDropdown();
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        shiftTypes: state.shiftTypes,
        schedules: state.schedules,
        activeScheduleId: state.activeScheduleId,
        dayOverrides: state.dayOverrides,
        dayNotes: state.dayNotes,
        importantDates: state.importantDates || [],
        todos: state.todos || {}
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `排班日历备份_${new Date().toLocaleDateString('zh-CN')}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast('数据已导出！');
}

function triggerImportJson() {
    closeExportDropdown();
    $('#importFileInput').click();
}

function importFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (data.shiftTypes) state.shiftTypes = data.shiftTypes;
            if (data.schedules) state.schedules = data.schedules;
            if (data.activeScheduleId) state.activeScheduleId = data.activeScheduleId;
            if (data.dayOverrides) state.dayOverrides = data.dayOverrides;
            if (data.dayNotes) state.dayNotes = data.dayNotes;
            if (data.importantDates) state.importantDates = data.importantDates;
            if (data.todos) state.todos = data.todos;

            saveState();
            saveImportantDates();
            saveTodos();

            renderShiftTypes();
            renderPatternPreview();
            renderCalendar();
            renderImportantDatesList();

            showToast('数据已导入！');
        } catch (err) {
            console.error('导入失败:', err);
            showToast('导入失败：文件格式错误', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // 重置以允许再次选择同一文件
}

function printCalendar() {
    closeExportDropdown();
    window.print();
}

// ===== 移动端侧边栏控制 =====
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = $('#sidebarOverlay');

    if (sidebar.classList.contains('mobile-open')) {
        closeMobileSidebar();
    } else {
        sidebar.classList.add('mobile-open');
        overlay?.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动
    }
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = $('#sidebarOverlay');

    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('active');
    document.body.style.overflow = ''; // 恢复滚动
}

// ===== 新功能：手势滑动 =====
let touchStartX = 0;
let touchEndX = 0;

function initGestures() {
    const container = $('#calendarContainer');
    if (!container) return;

    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50;
    const container = $('#calendarContainer');

    if (Math.abs(diff) < threshold) return;

    if (diff > 0) {
        // 左滑 -> 下个月
        container.classList.add('swipe-left');
        navigateMonth(1);
    } else {
        // 右滑 -> 上个月
        container.classList.add('swipe-right');
        navigateMonth(-1);
    }

    setTimeout(() => {
        container.classList.remove('swipe-left', 'swipe-right');
    }, 300);
}

// ===== 初始化新功能事件 =====
function initNewFeatures() {
    // 主题切换
    initTheme();
    $('#themeToggleBtn')?.addEventListener('click', toggleTheme);

    // 导出下拉菜单
    $('#exportBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExportDropdown();
    });
    $('#exportImageBtn')?.addEventListener('click', exportAsImage);
    $('#exportJsonBtn')?.addEventListener('click', exportAsJson);
    $('#importJsonBtn')?.addEventListener('click', triggerImportJson);
    $('#printBtn')?.addEventListener('click', printCalendar);
    $('#importFileInput')?.addEventListener('change', importFromJson);

    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#exportDropdown')) {
            closeExportDropdown();
        }
    });

    // 重要日期
    loadImportantDates();
    renderImportantDatesList();
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

    // 待办事项
    loadTodos();

    // 手势
    initGestures();

    // 更新倒计时
    updateCountdown();

    // 主题选择器事件
    $$('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => selectTheme(btn.dataset.theme));
    });

    // 点击其他地方关闭主题选择器
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#themeSelector')) {
            $('#themeSelector')?.classList.remove('active');
        }
    });

    // 按钮涟漪效果
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (btn) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
    });

    // 悬停预览卡片（仅桌面端）
    if (window.innerWidth > 768) {
        initDayHoverPreview();
    }

    // 移动端底部导航
    $('#mobileNavToday')?.addEventListener('click', () => {
        closeMobileSidebar();
        goToToday();
        showToast('已跳转到今天');
    });
    $('#mobileNavGenerate')?.addEventListener('click', () => {
        toggleMobileSidebar();
    });
    $('#mobileNavHistory')?.addEventListener('click', () => {
        closeMobileSidebar();
        openHistoryModal();
    });
    $('#mobileNavExport')?.addEventListener('click', () => {
        closeMobileSidebar();
        toggleExportDropdown();
    });

    // 移动端侧边栏遮罩点击关闭
    $('#sidebarOverlay')?.addEventListener('click', closeMobileSidebar);

    // 侧边栏Tab切换
    initSidebarTabs();
}

// 侧边栏Tab切换功能
function initSidebarTabs() {
    const tabs = $$('.sidebar-tab');
    const panes = {
        'schedule': $('#tabSchedule'),
        'stats': $('#tabStats'),
        'settings': $('#tabSettings')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            Object.values(panes).forEach(p => p?.classList.remove('active'));

            // 激活当前Tab
            tab.classList.add('active');
            const targetPane = panes[tab.dataset.tab];
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // 可折叠卡片
    $$('.collapsible .collapsible-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // 如果点击的是+按钮，不触发折叠
            if (e.target.closest('.btn')) return;

            const card = header.closest('.collapsible');
            card.classList.toggle('collapsed');
        });
    });
}

// 悬停预览卡片功能
function initDayHoverPreview() {
    const previewCard = $('#dayPreviewCard');
    if (!previewCard) return;

    const calendarContainer = $('#calendarContainer');

    calendarContainer.addEventListener('mouseenter', (e) => {
        const dayEl = e.target.closest('.calendar-day:not(.empty)');
        if (!dayEl) return;

        showDayPreview(dayEl, e);
    }, true);

    calendarContainer.addEventListener('mouseleave', (e) => {
        const dayEl = e.target.closest('.calendar-day:not(.empty)');
        if (!dayEl) return;

        previewCard.classList.remove('visible');
    }, true);

    calendarContainer.addEventListener('mousemove', (e) => {
        const dayEl = e.target.closest('.calendar-day:not(.empty)');
        if (dayEl && previewCard.classList.contains('visible')) {
            positionPreviewCard(e);
        }
    });
}

function showDayPreview(dayEl, e) {
    const previewCard = $('#dayPreviewCard');
    const dateStr = dayEl.dataset.date;
    if (!dateStr) return;

    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // 检查是否有有意义的额外信息
    const hasNote = state.dayNotes && state.dayNotes[dateStr];
    const hasTodo = state.todos && state.todos[dateStr];
    const lunarInfo = getLunarDay(date);
    const isHoliday = lunarInfo && (lunarInfo.includes('节') || lunarInfo.includes('除夕') || lunarInfo.includes('元旦'));

    // 只有在有备注、待办或节假日时才显示预览
    if (!hasNote && !hasTodo && !isHoliday) {
        return; // 没有额外信息，不显示预览
    }

    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    // 填充预览信息
    $('#previewDate').textContent = `${month}月${day}日`;
    $('#previewWeekday').textContent = weekdays[date.getDay()];
    $('#previewLunar').textContent = lunarInfo;

    // 获取班次信息
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (schedule) {
        const shift = getShiftForDate(schedule, date);
        if (shift) {
            $('#previewShift').innerHTML = `
                <span class="day-preview-shift-icon">${shift.icon}</span>
                <span class="day-preview-shift-name" style="color: ${shift.color}">${shift.name}</span>
            `;
            $('#previewShift').style.background = shift.color + '20';
        } else {
            $('#previewShift').innerHTML = '<span style="color: var(--text-muted)">无排班</span>';
            $('#previewShift').style.background = 'transparent';
        }
    }

    // 备注和待办
    let infoHtml = '';
    if (hasNote) {
        infoHtml += `<div class="day-preview-note">📝 ${state.dayNotes[dateStr]}</div>`;
    }
    if (hasTodo) {
        infoHtml += `<div class="day-preview-note">✅ ${state.todos[dateStr]}</div>`;
    }
    if (isHoliday) {
        infoHtml += `<div class="day-preview-note">🎉 ${lunarInfo}</div>`;
    }
    $('#previewInfo').innerHTML = infoHtml;

    positionPreviewCard(e);
    previewCard.classList.add('visible');
}

function positionPreviewCard(e) {
    const previewCard = $('#dayPreviewCard');
    const padding = 15;
    let x = e.clientX + padding;
    let y = e.clientY + padding;

    // 防止超出屏幕
    const cardRect = previewCard.getBoundingClientRect();
    if (x + cardRect.width > window.innerWidth) {
        x = e.clientX - cardRect.width - padding;
    }
    if (y + cardRect.height > window.innerHeight) {
        y = e.clientY - cardRect.height - padding;
    }

    previewCard.style.left = x + 'px';
    previewCard.style.top = y + 'px';
}

// ===== 键盘快捷键 =====
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 如果正在输入框中，不处理快捷键
        const activeEl = document.activeElement;
        if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT') {
            return;
        }

        // 如果有弹窗打开，Esc关闭
        if (e.key === 'Escape') {
            const modals = $$('.modal.active');
            if (modals.length > 0) {
                modals.forEach(m => m.classList.remove('active'));
                e.preventDefault();
                return;
            }
            // 关闭主题选择器和导出菜单
            $('#themeSelector')?.classList.remove('active');
            closeExportDropdown();
            return;
        }

        // 有弹窗时不处理其他快捷键
        if ($$('.modal.active').length > 0) return;

        switch (e.key) {
            case 'ArrowLeft':
                navigateMonth(-1);
                showToast('← 上一月');
                e.preventDefault();
                break;
            case 'ArrowRight':
                navigateMonth(1);
                showToast('→ 下一月');
                e.preventDefault();
                break;
            case 't':
            case 'T':
                goToToday();
                showToast('已跳转到今天');
                e.preventDefault();
                break;
            case 'h':
            case 'H':
                openHistoryModal();
                e.preventDefault();
                break;
            case '1':
                setMonthsToShow(1);
                showToast('显示 1 个月');
                break;
            case '3':
                setMonthsToShow(3);
                showToast('显示 3 个月');
                break;
            case '6':
                setMonthsToShow(6);
                showToast('显示 6 个月');
                break;
            case '?':
                showKeyboardHelp();
                break;
        }
    });
}

function showKeyboardHelp() {
    showToast('快捷键: ← → 切换月 | T 今天 | H 历史 | 1/3/6 月数 | Esc 关闭', 'success');
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    initNewFeatures();
    initKeyboardShortcuts();
});
