// ===== 导出功能模块 =====

import { $, adjustColor, showToast } from './utils.js';
import { state, saveState } from './state.js';
import { getHolidayInfo, getSolarTerm } from './holidays.js';
import { getLunarDay } from './lunar.js';
import { getShiftForDate } from './calendar.js';
import { renderShiftTypes } from './shiftTypes.js';
import { renderPatternPreview } from './patterns.js';
import { renderCalendar } from './calendar.js';
import { saveImportantDates, renderImportantDatesList, saveTodos } from './features.js';

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

                    const shift = getShiftForDate(schedule, date);
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

                    if (state.dayOverrides[dateStr]) {
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

                    if (state.importantDates && state.importantDates.length > 0) {
                        const md = `${mo}-${dy}`;
                        const imp = state.importantDates.find(d => { const [, m2, d2] = d.date.split('-'); return `${m2}-${d2}` === md; });
                        if (imp) {
                            ctx.font = '14px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
                            ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
                            ctx.fillText(imp.icon, cx + CELL_W - 4, cy + CELL_H - 2);
                        }
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
        link.download = `${schedule.name}-${new Date().toISOString().slice(0, 10)}.png`;
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
    link.download = `shift-calendar-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
