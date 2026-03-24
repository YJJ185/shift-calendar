// ===== 导出功能模块 =====

import { $, adjustColor, showToast, safeColor } from './utils.js';
import { state, saveState, formatDate, parseLocalDate, defaultShiftTypes, normalizeShiftType, normalizeDayOverridesBySchedule, findImportantDateForDate } from './state.js';
import { getHolidayInfo, getSolarTerm } from './holidays.js';
import { getLunarDay } from './lunar.js';
import { getShiftForDateInfo, renderCalendar } from './calendar.js';
import { syncDraftFromSchedule, resetDraftForNoActiveSchedule } from './shiftTypes.js';
import { saveImportantDates, renderImportantDatesList, saveTodos } from './features.js';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IMPORT_WARNINGS = 30;

function _pushWarning(warnings, message) {
    if (warnings.length < MAX_IMPORT_WARNINGS) {
        warnings.push(message);
    }
}

function _isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function _toSafeString(value, fallback = '') {
    const text = String(value ?? '').trim();
    return text || fallback;
}

function _isValidDateKey(value) {
    if (typeof value !== 'string' || !DATE_KEY_RE.test(value)) return false;
    return !!parseLocalDate(value);
}

function _uniqueId(rawId, usedIds, fallbackPrefix) {
    let base = _toSafeString(rawId, `${fallbackPrefix}-${usedIds.size + 1}`);
    let candidate = base;
    let suffix = 1;
    while (usedIds.has(candidate)) {
        suffix += 1;
        candidate = `${base}-${suffix}`;
    }
    usedIds.add(candidate);
    return candidate;
}

function _normalizeShiftTypes(rawShiftTypes, fallbackShiftTypes, warnings, scopeLabel = '班次') {
    const source = Array.isArray(rawShiftTypes) ? rawShiftTypes : [];
    if (!Array.isArray(rawShiftTypes)) {
        _pushWarning(warnings, `${scopeLabel}: shiftTypes 结构异常，已回退默认班次`);
    }

    const fallback = Array.isArray(fallbackShiftTypes) && fallbackShiftTypes.length > 0
        ? fallbackShiftTypes
        : defaultShiftTypes;

    const normalized = [];
    const usedIds = new Set();

    source.forEach((item, index) => {
        if (!_isPlainObject(item)) {
            _pushWarning(warnings, `${scopeLabel}: 第 ${index + 1} 个班次无效，已跳过`);
            return;
        }

        const fb = fallback[index % fallback.length] || defaultShiftTypes[index % defaultShiftTypes.length];
        const base = normalizeShiftType(item, fb);
        const id = _uniqueId(base.id, usedIds, `shift-${index + 1}`);
        normalized.push({
            ...base,
            id,
            name: _toSafeString(base.name, fb?.name || `班次${index + 1}`),
            icon: _toSafeString(base.icon, fb?.icon || '📌'),
            color: safeColor(base.color, fb?.color || '#9CA3AF')
        });
    });

    if (normalized.length === 0) {
        _pushWarning(warnings, `${scopeLabel}: 未检测到可用班次，已使用默认班次`);
        defaultShiftTypes.forEach((item, index) => {
            const base = normalizeShiftType(item, item);
            const id = _uniqueId(base.id, usedIds, `shift-${index + 1}`);
            normalized.push({
                ...base,
                id,
                name: _toSafeString(base.name, `班次${index + 1}`),
                icon: _toSafeString(base.icon, '📌'),
                color: safeColor(base.color, '#9CA3AF')
            });
        });
    }

    return normalized;
}

function _normalizeSchedules(rawSchedules, rootShiftTypes, warnings) {
    const source = Array.isArray(rawSchedules) ? rawSchedules : [];
    if (!Array.isArray(rawSchedules)) {
        _pushWarning(warnings, 'schedules 结构异常，已回退为空');
    }

    const normalized = [];
    const usedScheduleIds = new Set();
    const nowIso = new Date().toISOString();

    source.forEach((item, index) => {
        if (!_isPlainObject(item)) {
            _pushWarning(warnings, `第 ${index + 1} 条排班记录无效，已跳过`);
            return;
        }

        const scheduleShiftTypes = _normalizeShiftTypes(item.shiftTypes, rootShiftTypes, warnings, `排班记录 ${index + 1}`);
        const shiftIdSet = new Set(scheduleShiftTypes.map(t => t.id));

        const rawPattern = Array.isArray(item.pattern) ? item.pattern : [];
        if (!Array.isArray(item.pattern)) {
            _pushWarning(warnings, `排班记录 ${index + 1}: pattern 异常，已自动修复`);
        }

        let pattern = rawPattern
            .map(v => _toSafeString(v, ''))
            .filter(id => id && shiftIdSet.has(id));

        if (pattern.length === 0) {
            pattern = [scheduleShiftTypes[0].id];
            _pushWarning(warnings, `排班记录 ${index + 1}: pattern 为空，已使用首个班次兜底`);
        }

        let startDate = _toSafeString(item.startDate, '');
        if (!_isValidDateKey(startDate)) {
            startDate = formatDate(new Date());
            _pushWarning(warnings, `排班记录 ${index + 1}: startDate 无效，已回退为今天`);
        }

        let startIndex = Number.parseInt(item.startIndex, 10);
        if (!Number.isFinite(startIndex)) startIndex = 0;
        startIndex = ((startIndex % pattern.length) + pattern.length) % pattern.length;

        const id = _uniqueId(item.id, usedScheduleIds, `schedule-${index + 1}`);
        const name = _toSafeString(item.name, `排班方案 ${normalized.length + 1}`);

        let createdAt = _toSafeString(item.createdAt, nowIso);
        if (Number.isNaN(new Date(createdAt).getTime())) {
            createdAt = nowIso;
        }

        normalized.push({
            id,
            name,
            createdAt,
            startDate,
            startIndex,
            pattern,
            shiftTypes: scheduleShiftTypes,
            weekendRestMode: !!item.weekendRestMode,
            isActive: !!item.isActive
        });
    });

    return normalized;
}

function _normalizeDateValueMap(rawMap, valueNormalizer, warnings, label) {
    const normalized = {};
    if (!_isPlainObject(rawMap)) {
        if (rawMap !== undefined) {
            _pushWarning(warnings, `${label} 结构异常，已回退为空`);
        }
        return normalized;
    }

    Object.entries(rawMap).forEach(([key, value]) => {
        if (!_isValidDateKey(key)) {
            _pushWarning(warnings, `${label} 含无效日期键 ${key}，已跳过`);
            return;
        }

        const normalizedValue = valueNormalizer(value, key);
        if (normalizedValue !== null && normalizedValue !== undefined) {
            normalized[key] = normalizedValue;
        }
    });

    return normalized;
}

function _normalizeDayOverrides(rawDayOverrides, schedules, activeScheduleId, warnings) {
    const scheduleShiftIdSets = new Map(
        schedules.map(schedule => [schedule.id, new Set((schedule.shiftTypes || []).map(t => t.id))])
    );

    const normalized = normalizeDayOverridesBySchedule(
        rawDayOverrides,
        activeScheduleId,
        schedules.map(schedule => schedule.id)
    );
    const scopedOverrides = {};

    Object.entries(normalized).forEach(([scheduleId, dateMap]) => {
        const shiftIdSet = scheduleShiftIdSets.get(scheduleId);
        if (!shiftIdSet) {
            _pushWarning(warnings, `dayOverrides 中存在未知方案 ${scheduleId}，已跳过`);
            return;
        }

        const nextDateMap = {};
        Object.entries(dateMap).forEach(([dateKey, shiftId]) => {
            if (!shiftIdSet.has(shiftId)) {
                _pushWarning(warnings, `dayOverrides 中 ${scheduleId}/${dateKey} 的班次 ${shiftId} 无法匹配对应方案，已跳过`);
                return;
            }
            nextDateMap[dateKey] = shiftId;
        });

        if (Object.keys(nextDateMap).length > 0) {
            scopedOverrides[scheduleId] = nextDateMap;
        }
    });

    return scopedOverrides;
}

function _normalizeImportantDates(rawImportantDates, warnings) {
    const source = Array.isArray(rawImportantDates) ? rawImportantDates : [];
    if (rawImportantDates !== undefined && !Array.isArray(rawImportantDates)) {
        _pushWarning(warnings, 'importantDates 结构异常，已回退为空');
    }

    const normalized = [];
    const usedIds = new Set();

    source.forEach((item, index) => {
        if (!_isPlainObject(item)) {
            _pushWarning(warnings, `importantDates 第 ${index + 1} 项无效，已跳过`);
            return;
        }

        const parsedDate = parseLocalDate(item.date);
        const name = _toSafeString(item.name, '');
        if (!parsedDate) {
            _pushWarning(warnings, `importantDates 第 ${index + 1} 项日期无效，已跳过`);
            return;
        }
        if (!name) {
            _pushWarning(warnings, `importantDates 第 ${index + 1} 项名称为空，已跳过`);
            return;
        }

        normalized.push({
            id: _uniqueId(item.id, usedIds, `important-date-${index + 1}`),
            date: formatDate(parsedDate),
            name,
            icon: _toSafeString(item.icon, '📅'),
            repeat: item.repeat !== false
        });
    });

    return normalized;
}


function _normalizeImportPayload(rawData) {
    if (!_isPlainObject(rawData)) {
        throw new Error('导入文件不是有效对象');
    }

    const warnings = [];
    const shiftTypes = _normalizeShiftTypes(rawData.shiftTypes, defaultShiftTypes, warnings, '全局');
    const schedules = _normalizeSchedules(rawData.schedules, shiftTypes, warnings);

    let activeScheduleId = _toSafeString(rawData.activeScheduleId, '');
    if (!schedules.some(s => s.id === activeScheduleId)) {
        if (activeScheduleId) {
            _pushWarning(warnings, 'activeScheduleId 无效，已自动切换到首个方案');
        }
        activeScheduleId = schedules[0]?.id || null;
    }

    const dayOverrides = _normalizeDayOverrides(
        rawData.dayOverrides,
        schedules,
        activeScheduleId,
        warnings
    );

    const dayNotes = _normalizeDateValueMap(
        rawData.dayNotes,
        (value) => {
            const text = _toSafeString(value, '');
            return text || null;
        },
        warnings,
        'dayNotes'
    );

    const todos = _normalizeDateValueMap(
        rawData.todos,
        (value) => {
            const text = _toSafeString(value, '');
            return text || null;
        },
        warnings,
        'todos'
    );

    const importantDates = _normalizeImportantDates(rawData.importantDates, warnings);

    return {
        normalized: {
            shiftTypes,
            schedules,
            activeScheduleId,
            dayOverrides,
            dayNotes,
            importantDates,
            todos
        },
        warnings
    };
}

// ===== Canvas 导出辅助函数 =====

function _hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 0xFF, g: (n >> 8) & 0xFF, b: n & 0xFF };
}

function _hexToRgba(hex, alpha) {
    const { r, g, b } = _hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
}

function _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function _getThemeColors() {
    const cs = getComputedStyle(document.documentElement);
    const get = (v, fb) => cs.getPropertyValue(v).trim() || fb;
    return {
        bgPrimary: get('--bg-primary', '#0a0a14'),
        bgSecondary: get('--bg-secondary', '#12121f'),
        bgCard: get('--bg-card', '#161625'),
        bgHover: get('--bg-hover', '#1e1e32'),
        textPrimary: get('--text-primary', '#ffffff'),
        textSecondary: get('--text-secondary', '#9898b0'),
        textMuted: get('--text-muted', '#5a5a70'),
        borderColor: get('--border-color', '#252540'),
        accentPrimary: get('--accent-primary', '#6366f1'),
        accentSecondary: get('--accent-secondary', '#818cf8'),
        danger: get('--danger', '#ef4444'),
        success: get('--success', '#10b981'),
    };
}

function _drawCalendarToCanvas(schedule) {
    const theme = _getThemeColors();
    const SCALE = 3;
    const PADDING = 40;
    const TITLE_HEIGHT = 70;
    const MONTH_GAP = 30;
    const MONTH_HEADER_H = 56;
    const WEEKDAY_ROW_H = 36;
    const CELL_W = 130;
    const CELL_H = 100;
    const COLS = 7;
    const GRID_W = COLS * CELL_W;
    const monthsToShow = state.monthsToShow || 1;

    const monthInfos = [];
    for (let m = 0; m < monthsToShow; m++) {
        const d = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + m, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const rows = Math.ceil((firstDay + daysInMonth) / 7);
        monthInfos.push({ year, month, firstDay, daysInMonth, rows });
    }

    const totalMonthH = monthInfos.reduce((s, mi) => s + MONTH_HEADER_H + WEEKDAY_ROW_H + mi.rows * CELL_H, 0);
    const canvasH = PADDING + TITLE_HEIGHT + totalMonthH + (monthsToShow - 1) * MONTH_GAP + PADDING;
    const canvasW = PADDING * 2 + GRID_W;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * SCALE;
    canvas.height = canvasH * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = theme.bgPrimary;
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = theme.accentSecondary;
    ctx.fillText(schedule.name || '排班日历', canvasW / 2, PADDING + TITLE_HEIGHT / 2 - 8);

    const first = monthInfos[0], last = monthInfos[monthInfos.length - 1];
    const rangeText = monthsToShow === 1
        ? `${first.year}年${first.month + 1}月`
        : `${first.year}年${first.month + 1}月 — ${last.year}年${last.month + 1}月`;
    ctx.font = '14px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = theme.textMuted;
    ctx.fillText(rangeText, canvasW / 2, PADDING + TITLE_HEIGHT / 2 + 18);

    let curY = PADDING + TITLE_HEIGHT;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let mi = 0; mi < monthInfos.length; mi++) {
        const info = monthInfos[mi];
        const mx = PADDING;

        const hGrad = ctx.createLinearGradient(mx, curY, mx + GRID_W, curY);
        hGrad.addColorStop(0, _hexToRgba(theme.accentPrimary, 0.15));
        hGrad.addColorStop(1, _hexToRgba('#a855f7', 0.1));
        _roundRect(ctx, mx, curY, GRID_W, MONTH_HEADER_H, mi === 0 ? 16 : 0);
        ctx.fillStyle = hGrad;
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 22px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
        ctx.fillStyle = theme.textPrimary;
        ctx.fillText(`${info.year}年${info.month + 1}月`, mx + GRID_W / 2, curY + MONTH_HEADER_H / 2);
        ctx.strokeStyle = theme.borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx, curY + MONTH_HEADER_H);
        ctx.lineTo(mx + GRID_W, curY + MONTH_HEADER_H);
        ctx.stroke();
        curY += MONTH_HEADER_H;

        const wds = ['日', '一', '二', '三', '四', '五', '六'];
        ctx.fillStyle = theme.bgSecondary;
        ctx.fillRect(mx, curY, GRID_W, WEEKDAY_ROW_H);
        ctx.strokeStyle = theme.borderColor;
        ctx.beginPath();
        ctx.moveTo(mx, curY + WEEKDAY_ROW_H);
        ctx.lineTo(mx + GRID_W, curY + WEEKDAY_ROW_H);
        ctx.stroke();
        ctx.font = 'bold 13px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = (i === 0 || i === 6) ? theme.danger : theme.textMuted;
            ctx.fillText(wds[i], mx + i * CELL_W + CELL_W / 2, curY + WEEKDAY_ROW_H / 2);
        }
        curY += WEEKDAY_ROW_H;

        const gridY = curY;
        for (let row = 0; row < info.rows; row++) {
            for (let col = 0; col < 7; col++) {
                const cellIdx = row * 7 + col;
                const dayNum = cellIdx - info.firstDay + 1;
                const isEmpty = cellIdx < info.firstDay || dayNum > info.daysInMonth;
                const cx = mx + col * CELL_W;
                const cy = gridY + row * CELL_H;

                if (isEmpty) {
                    ctx.fillStyle = _hexToRgba('#0a0a14', 0.5);
                    ctx.fillRect(cx, cy, CELL_W, CELL_H);
                } else {
                    const date = new Date(info.year, info.month, dayNum);
                    date.setHours(0, 0, 0, 0);
                    const isToday = date.getTime() === today.getTime();
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const yr = date.getFullYear();
                    const mo = String(date.getMonth() + 1).padStart(2, '0');
                    const dy = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${yr}-${mo}-${dy}`;

                    if (isToday) {
                        const tGrad = ctx.createLinearGradient(cx, cy, cx + CELL_W, cy + CELL_H);
                        tGrad.addColorStop(0, _hexToRgba(theme.accentPrimary, 0.15));
                        tGrad.addColorStop(1, _hexToRgba('#a855f7', 0.1));
                        ctx.fillStyle = tGrad;
                        ctx.fillRect(cx, cy, CELL_W, CELL_H);
                        ctx.strokeStyle = theme.accentPrimary;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(cx + 1, cy + 1, CELL_W - 2, CELL_H - 2);
                    } else if (isWeekend) {
                        ctx.fillStyle = _hexToRgba('#ef4444', 0.03);
                        ctx.fillRect(cx, cy, CELL_W, CELL_H);
                    } else {
                        ctx.fillStyle = theme.bgCard;
                        ctx.fillRect(cx, cy, CELL_W, CELL_H);
                    }

                    ctx.strokeStyle = theme.borderColor;
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(cx, cy, CELL_W, CELL_H);

                    const holiday = getHolidayInfo(date);
                    if (holiday) {
                        if (holiday.type === 'holiday') {
                            ctx.fillStyle = '#ef4444';
                            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 24, cy); ctx.lineTo(cx, cy + 24); ctx.closePath(); ctx.fill();
                            ctx.fillStyle = '#fff';
                            ctx.font = 'bold 10px "PingFang SC","Microsoft YaHei",sans-serif';
                            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                            ctx.fillText('休', cx + 2, cy + 2);
                        } else if (holiday.type === 'workday') {
                            ctx.fillStyle = '#333';
                            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 24, cy); ctx.lineTo(cx, cy + 24); ctx.closePath(); ctx.fill();
                            ctx.fillStyle = '#fff';
                            ctx.font = 'bold 10px "PingFang SC","Microsoft YaHei",sans-serif';
                            ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                            ctx.fillText('班', cx + 2, cy + 2);
                        }
                    }

                    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                    if (isToday) {
                        ctx.font = 'bold 20px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
                        ctx.fillStyle = theme.accentSecondary;
                    } else if (isWeekend) {
                        ctx.font = 'bold 18px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
                        ctx.fillStyle = theme.danger;
                    } else {
                        ctx.font = 'bold 18px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
                        ctx.fillStyle = theme.textPrimary;
                    }
                    ctx.fillText(String(dayNum), cx + 8, cy + 6);

                    const solarTerm = getSolarTerm(date);
                    let lunarText = getLunarDay(date);
                    let lunarColor = theme.textMuted;
                    if (holiday && holiday.name) { lunarText = holiday.name; lunarColor = theme.danger; }
                    else if (solarTerm) { lunarText = solarTerm; lunarColor = theme.success; }
                    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
                    ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
                    ctx.fillStyle = lunarColor;
                    ctx.fillText(lunarText, cx + CELL_W - 6, cy + 8);

                    if (isToday) {
                        const tw = 32, th = 18, tr = 4;
                        const tx = cx + CELL_W - tw - 4, ty = cy + CELL_H - th - 4;
                        _roundRect(ctx, tx, ty, tw, th, tr);
                        ctx.fillStyle = theme.accentPrimary; ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 10px "PingFang SC","Microsoft YaHei",sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('今天', tx + tw / 2, ty + th / 2);
                    }

                    const shiftInfo = getShiftForDateInfo(schedule, date, holiday);
                    const shift = shiftInfo.effectiveShift;
                    if (shift) {
                        const cp = 6;
                        const cardX = cx + cp, cardY = cy + 30;
                        const cardW = CELL_W - cp * 2, cardH = CELL_H - 36;
                        const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
                        grad.addColorStop(0, shift.color);
                        grad.addColorStop(1, adjustColor(shift.color, -20));
                        _roundRect(ctx, cardX, cardY, cardW, cardH, 10);
                        ctx.fillStyle = grad; ctx.fill();
                        const oGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
                        oGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
                        oGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
                        _roundRect(ctx, cardX, cardY, cardW, cardH, 10);
                        ctx.fillStyle = oGrad; ctx.fill();
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.font = '22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
                        ctx.fillText(shift.icon, cardX + cardW / 2, cardY + cardH / 2 - 8);
                        ctx.font = 'bold 11px "PingFang SC","Microsoft YaHei",sans-serif';
                        ctx.fillStyle = '#fff';
                        ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
                        ctx.fillText(shift.name, cardX + cardW / 2, cardY + cardH / 2 + 16);
                        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
                    }

                    if (shiftInfo.isOverride) {
                        const bw = 16, bh = 14;
                        _roundRect(ctx, cx + 4, cy + CELL_H - bh - 4, bw, bh, 3);
                        ctx.fillStyle = _hexToRgba(theme.accentPrimary, 0.9); ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 9px "PingFang SC","Microsoft YaHei",sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('调', cx + 4 + bw / 2, cy + CELL_H - bh / 2 - 4);
                    }

                    if (state.dayNotes[dateStr]) {
                        ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
                        ctx.fillText('📝', cx + 24, cy + CELL_H - 4);
                    }

                    const imp = findImportantDateForDate(date);
                    if (imp) {
                        ctx.font = '14px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
                        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
                        ctx.fillText(imp.icon || '📅', cx + CELL_W - 4, cy + CELL_H - 2);
                    }

                    if (state.todos && state.todos[dateStr]) {
                        const tbW = 16, tbH = 14;
                        const tbX = cx + 40, tbY = cy + CELL_H - tbH - 4;
                        _roundRect(ctx, tbX, tbY, tbW, tbH, 3);
                        ctx.fillStyle = _hexToRgba(theme.success, 0.9); ctx.fill();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 9px "PingFang SC","Microsoft YaHei",sans-serif';
                        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('办', tbX + tbW / 2, tbY + tbH / 2);
                    }
                }
            }
        }
        curY = gridY + info.rows * CELL_H + MONTH_GAP;
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = '12px "Inter","PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillStyle = _hexToRgba(theme.textMuted, 0.5);
    ctx.fillText('排班日历 · ' + new Date().toLocaleDateString('zh-CN'), canvasW / 2, canvasH - 12);

    return canvas;
}

function _safeFileName(name, fallback = 'shift-calendar') {
    const cleaned = String(name ?? '')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .trim();
    return cleaned || fallback;
}

// ===== 导出函数 =====

export async function exportAsImage() {
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (!schedule) {
        showToast('没有可导出的日历', 'error');
        return;
    }

    showToast('正在生成高清图片...');

    try {
        await new Promise(resolve => requestAnimationFrame(resolve));

        const canvas = _drawCalendarToCanvas(schedule);
        if (!canvas) {
            showToast('生成图片失败', 'error');
            return;
        }

        const link = document.createElement('a');
        link.download = `${_safeFileName(schedule.name, '排班日历')}-${formatDate(new Date())}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        showToast('图片已导出！');
    } catch (error) {
        console.error('导出图片失败:', error);
        showToast('导出失败，请重试', 'error');
    }
}

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
    link.download = `shift-calendar-backup-${formatDate(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出！');
}

export function triggerImportJson() {
    $('#importFileInput')?.click();
}

export function importFromJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const rawData = JSON.parse(e.target.result);
            const { normalized, warnings } = _normalizeImportPayload(rawData);

            state.shiftTypes = normalized.shiftTypes;
            state.schedules = normalized.schedules;
            state.activeScheduleId = normalized.activeScheduleId;
            state.pattern = [];
            state.dayOverrides = normalized.dayOverrides;
            state.dayNotes = normalized.dayNotes;
            state.importantDates = normalized.importantDates;
            state.todos = normalized.todos;

            const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId) || null;
            if (activeSchedule) {
                state.currentDate = parseLocalDate(activeSchedule.startDate) || new Date();
            } else {
                state.currentDate = new Date();
            }

            if (activeSchedule) {
                syncDraftFromSchedule(activeSchedule);
            } else {
                resetDraftForNoActiveSchedule();
            }

            saveState();
            saveImportantDates();
            saveTodos();

            renderCalendar();
            renderImportantDatesList();

            if (warnings.length > 0) {
                console.warn('导入时自动修复的问题:', warnings);
                showToast(`数据已导入，已自动修复 ${warnings.length} 处异常`);
            } else {
                showToast('数据已导入！');
            }
        } catch (err) {
            console.error('导入失败:', err);
            showToast('导入失败：文件格式错误', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

export function printCalendar() {
    window.print();
}

// 导出菜单

export function toggleExportDropdown() {
    const dropdown = $('#exportDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

export function closeExportDropdown() {
    const dropdown = $('#exportDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

// ===== 初始化导出事件 =====

export function initExportEvents() {
    $('#exportBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExportDropdown();
    });
    $('#exportImageBtn')?.addEventListener('click', exportAsImage);
    $('#exportJsonBtn')?.addEventListener('click', exportAsJson);
    $('#importJsonBtn')?.addEventListener('click', triggerImportJson);
    $('#printBtn')?.addEventListener('click', printCalendar);
    $('#importFileInput')?.addEventListener('change', importFromJson);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#exportDropdown')) {
            closeExportDropdown();
        }
    });
}
