// ===== 节假日数据模块 =====
// 支持多年法定假日 + 动态节气计算 + 农历节日动态计算 + API 自动更新

import { getLunarMonthDay } from './lunar.js';

// ==============================
// 一、节气算法（天文计算，支持任意年份）
// ==============================

// 24节气名称
const SOLAR_TERM_NAMES = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
    '谷雨', '清明', '立夏', '小满', '芒种', '夏至',
    '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
    '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];

// 节气对应的太阳黄经度数 (从小寒 285° 开始，每个节气 15°)
const SOLAR_TERM_ANGLES = [
    285, 300, 315, 330, 345, 0,
    15, 30, 45, 60, 75, 90,
    105, 120, 135, 150, 165, 180,
    195, 210, 225, 240, 255, 270
];

// 计算儒略日
function toJulianDay(year, month, day, hour = 0) {
    if (month <= 2) { year--; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) +
        Math.floor(30.6001 * (month + 1)) +
        day + hour / 24.0 + B - 1524.5;
}

// 计算太阳黄经（简化VSOP87理论）
function solarLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    // 太阳几何平黄经
    let L0 = 280.46646 + T * (36000.76983 + T * 0.0003032);
    // 太阳平近点角
    let M = 357.52911 + T * (35999.05029 - T * 0.0001537);
    // 地球轨道离心率
    const e = 0.016708634 - T * (0.000042037 + T * 0.0000001267);

    const Mrad = M * Math.PI / 180;
    // 太阳中心方程
    const C = (1.914602 - T * (0.004817 + T * 0.000014)) * Math.sin(Mrad)
        + (0.019993 - T * 0.000101) * Math.sin(2 * Mrad)
        + 0.000289 * Math.sin(3 * Mrad);

    // 太阳真黄经
    let sunLong = L0 + C;

    // 修正章动
    const omega = 125.04 - 1934.136 * T;
    const omegaRad = omega * Math.PI / 180;
    sunLong = sunLong - 0.00569 - 0.00478 * Math.sin(omegaRad);

    // 归一化到 0~360
    sunLong = sunLong % 360;
    if (sunLong < 0) sunLong += 360;

    return sunLong;
}

// 通过二分查找精确计算某节气的儒略日
function findSolarTermJD(year, targetAngle) {
    // 估算初始范围：该节气大约在哪个月
    const monthEstimate = ((targetAngle / 360) * 12 + 3) % 12;
    const yearFraction = year + monthEstimate / 12;

    let jd1 = toJulianDay(year, 1, 1) + (monthEstimate - 1) * 30 - 15;
    let jd2 = jd1 + 60;

    // 二分法查找（精度 1 秒）
    for (let i = 0; i < 50; i++) {
        const jdMid = (jd1 + jd2) / 2;
        let lng = solarLongitude(jdMid);

        // 处理 0°/360° 边界
        let diff = lng - targetAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;

        if (diff > 0) {
            jd2 = jdMid;
        } else {
            jd1 = jdMid;
        }

        if (Math.abs(jd2 - jd1) < 0.00001) break;
    }

    return (jd1 + jd2) / 2;
}

// 儒略日转公历日期
function jdToDate(jd) {
    jd += 0.5;
    const Z = Math.floor(jd);
    const F = jd - Z;
    let A;
    if (Z < 2299161) {
        A = Z;
    } else {
        const alpha = Math.floor((Z - 1867216.25) / 36524.25);
        A = Z + 1 + alpha - Math.floor(alpha / 4);
    }
    const B = A + 1524;
    const C = Math.floor((B - 122.1) / 365.25);
    const D = Math.floor(365.25 * C);
    const E = Math.floor((B - D) / 30.6001);

    const day = B - D - Math.floor(30.6001 * E);
    const month = E < 14 ? E - 1 : E - 13;
    const year = month > 2 ? C - 4716 : C - 4715;

    // 转为北京时间 (UTC+8)
    const hourFraction = F * 24 + 8;
    const finalDay = day + Math.floor(hourFraction / 24);

    return new Date(year, month - 1, finalDay > day ? finalDay : day);
}

// 节气缓存
const _solarTermCache = {};

// 计算某年的所有24节气日期
function computeSolarTermsForYear(year) {
    if (_solarTermCache[year]) return _solarTermCache[year];

    const terms = {};
    for (let i = 0; i < 24; i++) {
        const angle = SOLAR_TERM_ANGLES[i];
        // 小寒和大寒属于年初，但天文上属于上一年的尾巴
        const calcYear = (i < 2) ? year : (angle < 285 ? year : year);
        const jd = findSolarTermJD(year, angle);
        const date = jdToDate(jd);

        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${date.getFullYear()}-${m}-${d}`;
        terms[dateStr] = SOLAR_TERM_NAMES[i];
    }

    _solarTermCache[year] = terms;
    return terms;
}

/**
 * 获取节气（动态计算，支持任意年份）
 */
export function getSolarTerm(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const terms = computeSolarTermsForYear(year);
    return terms[dateStr] || null;
}


// ==============================
// 二、法定节假日数据（多年内置 + API 自动获取）
// ==============================

// 内置法定节假日数据（可扩展多年）
const builtinHolidays = {
    // ----- 2025 年 -----
    '2025-01-01': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2025-01-28': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-01-29': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-01-30': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-01-31': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-02-01': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-02-02': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-02-03': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-02-04': { type: 'holiday', name: '春节', icon: '🧧' },
    '2025-01-26': { type: 'workday', name: '春节调休', icon: '💼' },
    '2025-02-08': { type: 'workday', name: '春节调休', icon: '💼' },
    '2025-04-04': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2025-04-05': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2025-04-06': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2025-05-01': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2025-05-02': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2025-05-03': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2025-05-04': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2025-05-05': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2025-04-27': { type: 'workday', name: '劳动节调休', icon: '💼' },
    '2025-05-31': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2025-06-01': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2025-06-02': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2025-10-01': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2025-10-02': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2025-10-03': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2025-10-04': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2025-10-05': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2025-10-06': { type: 'holiday', name: '中秋节', icon: '🥮' },
    '2025-10-07': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2025-10-08': { type: 'holiday', name: '国庆节', icon: '🇨🇳' },
    '2025-09-28': { type: 'workday', name: '国庆调休', icon: '💼' },
    '2025-10-11': { type: 'workday', name: '国庆调休', icon: '💼' },

    // ----- 2026 年 -----
    '2026-01-01': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-02': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-03': { type: 'holiday', name: '元旦', icon: '🎉' },
    '2026-01-04': { type: 'workday', name: '元旦调休', icon: '💼' },
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
    '2026-04-04': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2026-04-05': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2026-04-06': { type: 'holiday', name: '清明节', icon: '🌿' },
    '2026-04-26': { type: 'workday', name: '劳动节调休', icon: '💼' },
    '2026-05-01': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-02': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-03': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-04': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-05': { type: 'holiday', name: '劳动节', icon: '💪' },
    '2026-05-09': { type: 'workday', name: '劳动节调休', icon: '💼' },
    '2026-05-31': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2026-06-01': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2026-06-02': { type: 'holiday', name: '端午节', icon: '🐉' },
    '2026-09-27': { type: 'holiday', name: '中秋节', icon: '🥮' },
    '2026-09-28': { type: 'holiday', name: '中秋节', icon: '🥮' },
    '2026-09-29': { type: 'holiday', name: '中秋节', icon: '🥮' },
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

// API 获取的假日数据缓存
const _apiHolidayCache = {};
const API_CACHE_KEY = 'shift-calendar-api-holidays';

// 从 localStorage 加载 API 缓存
function loadApiCache() {
    try {
        const saved = localStorage.getItem(API_CACHE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(_apiHolidayCache, data);
        }
    } catch (e) { /* ignore */ }
}

// 保存 API 缓存到 localStorage
function saveApiCache() {
    try {
        localStorage.setItem(API_CACHE_KEY, JSON.stringify(_apiHolidayCache));
    } catch (e) { /* ignore */ }
}

/**
 * 从 API 获取某年的假日数据（后台静默请求）
 */
export function fetchHolidaysFromAPI(year) {
    // 如果已有缓存，跳过
    if (_apiHolidayCache[`_fetched_${year}`]) return;
    _apiHolidayCache[`_fetched_${year}`] = true;

    const url = `https://timor.tech/api/holiday/year/${year}`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.code !== 0 || !data.holiday) return;

            const holidays = data.holiday;
            for (const [dateStr, info] of Object.entries(holidays)) {
                const fullDate = `${year}-${dateStr}`;
                // 只补充内置数据中没有的
                if (!builtinHolidays[fullDate]) {
                    const isHoliday = info.holiday === true;
                    _apiHolidayCache[fullDate] = {
                        type: isHoliday ? 'holiday' : 'workday',
                        name: info.name || (isHoliday ? '假日' : '调休'),
                        icon: isHoliday ? '🎉' : '💼'
                    };
                }
            }
            saveApiCache();
        })
        .catch(() => { /* 网络失败静默处理 */ });
}

// 初始化加载缓存
loadApiCache();


// ==============================
// 三、农历节日（动态计算，支持任意年份）
// ==============================

// 农历节日定义：{ 月, 日, 名称, 图标 }
const LUNAR_FESTIVAL_DEFS = [
    { month: 1, day: 15, name: '元宵节', icon: '🏮' },
    { month: 2, day: 2, name: '龙抬头', icon: '🐲' },
    { month: 7, day: 7, name: '七夕节', icon: '💑' },
    { month: 7, day: 15, name: '中元节', icon: '🙏' },
    { month: 9, day: 9, name: '重阳节', icon: '🌸' },
    { month: 12, day: 8, name: '腊八节', icon: '🥣' },
];

// 农历节日缓存
const _lunarFestivalCache = {};

/**
 * 计算某年的农历节日对应的公历日期
 */
function computeLunarFestivalsForYear(year) {
    if (_lunarFestivalCache[year]) return _lunarFestivalCache[year];

    const result = {};

    // 遍历该公历年的每一天，查找匹配的农历节日
    for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const lunar = getLunarMonthDay(date);

            for (const fest of LUNAR_FESTIVAL_DEFS) {
                if (lunar.month === fest.month && lunar.day === fest.day && !lunar.isLeap) {
                    const m = String(month + 1).padStart(2, '0');
                    const d = String(day).padStart(2, '0');
                    result[`${year}-${m}-${d}`] = { name: fest.name, icon: fest.icon };
                }
            }
        }
    }

    _lunarFestivalCache[year] = result;
    return result;
}


// ==============================
// 四、通用节日（按月日匹配，不分年份）
// ==============================

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


// ==============================
// 五、对外接口
// ==============================

/**
 * 获取指定日期的节假日信息（支持任意年份）
 */
export function getHolidayInfo(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const monthDay = `${month}-${day}`;

    // 1. 内置法定节假日（优先级最高）
    if (builtinHolidays[dateStr]) {
        return builtinHolidays[dateStr];
    }

    // 2. API 获取的法定节假日
    if (_apiHolidayCache[dateStr]) {
        return _apiHolidayCache[dateStr];
    }

    // 3. 农历节日（动态计算）
    const lunarFestivals = computeLunarFestivalsForYear(year);
    if (lunarFestivals[dateStr]) {
        return { type: 'lunar', ...lunarFestivals[dateStr] };
    }

    // 4. 通用节日
    if (commonHolidays[monthDay]) {
        return { type: 'common', ...commonHolidays[monthDay] };
    }

    return null;
}
