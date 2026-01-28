// ===== 农历计算模块 =====

// 农历数据表（1900-2100年）
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

/**
 * 获取农历年总天数
 * @param {number} year
 * @returns {number}
 */
function getLunarYearDays(year) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) {
        sum += (lunarInfo[year - 1900] & i) ? 1 : 0;
    }
    return sum + getLeapDays(year);
}

/**
 * 获取闰月月份
 * @param {number} year
 * @returns {number}
 */
function getLeapMonth(year) {
    return lunarInfo[year - 1900] & 0xf;
}

/**
 * 获取闰月天数
 * @param {number} year
 * @returns {number}
 */
function getLeapDays(year) {
    if (getLeapMonth(year)) {
        return (lunarInfo[year - 1900] & 0x10000) ? 30 : 29;
    }
    return 0;
}

/**
 * 获取农历月天数
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
function getLunarMonthDays(year, month) {
    return (lunarInfo[year - 1900] & (0x10000 >> month)) ? 30 : 29;
}

/**
 * 获取农历月日
 * @param {Date} date
 * @returns {Object}
 */
export function getLunarMonthDay(date) {
    // 基准日期：公历1900年1月31日是农历正月初一
    const baseDate = new Date(1900, 0, 31, 0, 0, 0);
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

    for (month = 1; month <= 12; month++) {
        monthDays = getLunarMonthDays(year, month);
        if (offset < monthDays) {
            break;
        }
        offset -= monthDays;

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

/**
 * 获取农历日显示文本
 * @param {Date} date
 * @returns {string}
 */
export function getLunarDay(date) {
    const lunarDays = [
        '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
        '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
        '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
    ];

    const lunar = getLunarMonthDay(date);
    return lunarDays[lunar.day - 1] || '';
}
