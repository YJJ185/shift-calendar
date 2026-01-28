// ===== 节假日数据模块 =====

// 2026年法定节假日安排（包含放假日期和调休补班日期）
export const holidaySchedule2026 = {
    // 元旦 (1月1日-3日放假，1月1日周四，不需调休)
    '2026-01-01': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-02': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-03': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-04': { type: 'workday', name: '元旦调休', icon: '💼' },

    // 春节 (2月15日-23日放假9天，2月14日、2月28日调休补班)
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
export const commonHolidays = {
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
export const lunarHolidays2026 = {
    '2026-03-03': { name: '元宵节', icon: '🏮' },
    '2026-03-20': { name: '龙抬头', icon: '🐲' },
    '2026-08-19': { name: '七夕节', icon: '💑' },
    '2026-08-22': { name: '中元节', icon: '🙏' },
    '2026-10-25': { name: '重阳节', icon: '🌸' },
};

// 2026年24节气数据
export const solarTerms2026 = {
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

/**
 * 获取节气
 * @param {Date} date
 * @returns {string|null}
 */
export function getSolarTerm(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return solarTerms2026[dateStr] || null;
}

/**
 * 获取指定日期的节假日信息
 * @param {Date} date
 * @returns {Object|null}
 */
export function getHolidayInfo(date) {
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
