// ===== 导出功能模块 =====

import { $, showToast, adjustColor } from './utils.js';
import { state, saveState, formatDate } from './state.js';
import { getHolidayInfo, getSolarTerm } from './holidays.js';
import { getLunarDay } from './lunar.js';
import { getShiftForDate } from './calendar.js';

// ==========================================
// Canvas 原生绘制导出 — 高清、精确、免依赖
// ==========================================

/**
 * 读取当前主题的所有 CSS 变量，返回一个扁平对象
 */
function getThemeColors() {
    const cs = getComputedStyle(document.documentElement);
    const get = (v, fallback) => cs.getPropertyValue(v).trim() || fallback;
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

/**
 * 解析 hex 颜色 -> {r, g, b}
 */
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 0xFF, g: (n >> 8) & 0xFF, b: n & 0xFF };
}

/**
 * 将 hex 转为 rgba 字符串
 */
function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * 绘制圆角矩形路径
 */
function roundRect(ctx, x, y, w, h, r) {
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

/**
 * 在 Canvas 上绘制整个日历
 * @returns {HTMLCanvasElement}
 */
function drawCalendarToCanvas() {
    const theme = getThemeColors();
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (!schedule) return null;

    const SCALE = 3; // Retina 清晰度

    // ---- 布局常量 (逻辑像素) ----
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

    // 计算每个月需要的行数
    const monthInfos = [];
    for (let m = 0; m < monthsToShow; m++) {
        const d = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + m, 1);
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const totalCells = firstDay + daysInMonth;
        const rows = Math.ceil(totalCells / 7);
        monthInfos.push({ year, month, firstDay, daysInMonth, rows });
    }

    // 总画布高度
    const totalMonthHeight = monthInfos.reduce((sum, mi) => {
        return sum + MONTH_HEADER_H + WEEKDAY_ROW_H + mi.rows * CELL_H;
    }, 0);
    const canvasH = PADDING + TITLE_HEIGHT + totalMonthHeight + (monthsToShow - 1) * MONTH_GAP + PADDING;
    const canvasW = PADDING * 2 + GRID_W;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * SCALE;
    canvas.height = canvasH * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    // ---- 1. 背景 ----
    ctx.fillStyle = theme.bgPrimary;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // ---- 2. 标题区 ----
    const titleText = schedule.name || '排班日历';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = theme.accentSecondary;
    ctx.fillText(titleText, canvasW / 2, PADDING + TITLE_HEIGHT / 2 - 8);

    // 日期范围副标题
    const firstMi = monthInfos[0];
    const lastMi = monthInfos[monthInfos.length - 1];
    const rangeText = monthsToShow === 1
        ? `${firstMi.year}年${firstMi.month + 1}月`
        : `${firstMi.year}年${firstMi.month + 1}月 — ${lastMi.year}年${lastMi.month + 1}月`;
    ctx.font = '14px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = theme.textMuted;
    ctx.fillText(rangeText, canvasW / 2, PADDING + TITLE_HEIGHT / 2 + 18);

    // ---- 3. 逐月绘制 ----
    let curY = PADDING + TITLE_HEIGHT;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let mi = 0; mi < monthInfos.length; mi++) {
        const info = monthInfos[mi];
        const monthX = PADDING;

        // -- 月份标题条 --
        const headerGrad = ctx.createLinearGradient(monthX, curY, monthX + GRID_W, curY);
        headerGrad.addColorStop(0, hexToRgba(theme.accentPrimary, 0.15));
        headerGrad.addColorStop(1, hexToRgba('#a855f7', 0.1));
        roundRect(ctx, monthX, curY, GRID_W, MONTH_HEADER_H, mi === 0 ? 16 : 0);
        ctx.fillStyle = headerGrad;
        ctx.fill();

        // 月份标题文字
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 22px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = theme.textPrimary;
        ctx.fillText(`${info.year}年${info.month + 1}月`, monthX + GRID_W / 2, curY + MONTH_HEADER_H / 2);

        // 月份标题底部边框
        ctx.strokeStyle = theme.borderColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(monthX, curY + MONTH_HEADER_H);
        ctx.lineTo(monthX + GRID_W, curY + MONTH_HEADER_H);
        ctx.stroke();

        curY += MONTH_HEADER_H;

        // -- 星期行 --
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        ctx.fillStyle = theme.bgSecondary;
        ctx.fillRect(monthX, curY, GRID_W, WEEKDAY_ROW_H);

        // 星期行底部边框
        ctx.strokeStyle = theme.borderColor;
        ctx.beginPath();
        ctx.moveTo(monthX, curY + WEEKDAY_ROW_H);
        ctx.lineTo(monthX + GRID_W, curY + WEEKDAY_ROW_H);
        ctx.stroke();

        ctx.font = 'bold 13px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        for (let i = 0; i < 7; i++) {
            const isWeekend = i === 0 || i === 6;
            ctx.fillStyle = isWeekend ? theme.danger : theme.textMuted;
            ctx.fillText(weekdays[i], monthX + i * CELL_W + CELL_W / 2, curY + WEEKDAY_ROW_H / 2);
        }
        curY += WEEKDAY_ROW_H;

        // -- 日期格子 --
        const gridStartY = curY;
        for (let row = 0; row < info.rows; row++) {
            for (let col = 0; col < 7; col++) {
                const cellIdx = row * 7 + col;
                const dayNum = cellIdx - info.firstDay + 1;
                const isEmpty = cellIdx < info.firstDay || dayNum > info.daysInMonth;

                const cx = monthX + col * CELL_W;
                const cy = gridStartY + row * CELL_H;

                // 单元格背景
                if (isEmpty) {
                    ctx.fillStyle = hexToRgba('#0a0a14', 0.5);
                    ctx.fillRect(cx, cy, CELL_W, CELL_H);
                } else {
                    const date = new Date(info.year, info.month, dayNum);
                    date.setHours(0, 0, 0, 0);
                    const isToday = date.getTime() === today.getTime();
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const dateStr = formatDate(date);

                    // 背景
                    if (isToday) {
                        const todayGrad = ctx.createLinearGradient(cx, cy, cx + CELL_W, cy + CELL_H);
                        todayGrad.addColorStop(0, hexToRgba(theme.accentPrimary, 0.15));
                        todayGrad.addColorStop(1, hexToRgba('#a855f7', 0.1));
                        ctx.fillStyle = todayGrad;
                        ctx.fillRect(cx, cy, CELL_W, CELL_H);

                        // today 内发光边框
                        ctx.strokeStyle = theme.accentPrimary;
                        ctx.lineWidth = 2;
                        ctx.strokeRect(cx + 1, cy + 1, CELL_W - 2, CELL_H - 2);
                    } else if (isWeekend) {
                        ctx.fillStyle = hexToRgba('#ef4444', 0.03);
                        ctx.fillRect(cx, cy, CELL_W, CELL_H);
                    } else {
                        ctx.fillStyle = theme.bgCard;
                        ctx.fillRect(cx, cy, CELL_W, CELL_H);
                    }

                    // 格子边框
                    ctx.strokeStyle = theme.borderColor;
                    ctx.lineWidth = 0.5;
                    ctx.strokeRect(cx, cy, CELL_W, CELL_H);

                    // --- 假日/调休 三角标 ---
                    const holiday = getHolidayInfo(date);
                    if (holiday) {
                        if (holiday.type === 'holiday') {
                            ctx.fillStyle = '#ef4444';
                            ctx.beginPath();
                            ctx.moveTo(cx, cy);
                            ctx.lineTo(cx + 24, cy);
                            ctx.lineTo(cx, cy + 24);
                            ctx.closePath();
                            ctx.fill();
                            // 休 文字
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 10px "PingFang SC", "Microsoft YaHei", sans-serif';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'top';
                            ctx.fillText('休', cx + 2, cy + 2);
                        } else if (holiday.type === 'workday') {
                            ctx.fillStyle = '#333333';
                            ctx.beginPath();
                            ctx.moveTo(cx, cy);
                            ctx.lineTo(cx + 24, cy);
                            ctx.lineTo(cx, cy + 24);
                            ctx.closePath();
                            ctx.fill();
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 10px "PingFang SC", "Microsoft YaHei", sans-serif';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'top';
                            ctx.fillText('班', cx + 2, cy + 2);
                        }
                    }

                    // --- 日期数字 ---
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    if (isToday) {
                        ctx.font = 'bold 20px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
                        ctx.fillStyle = theme.accentSecondary;
                    } else if (isWeekend) {
                        ctx.font = 'bold 18px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
                        ctx.fillStyle = theme.danger;
                    } else {
                        ctx.font = 'bold 18px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
                        ctx.fillStyle = theme.textPrimary;
                    }
                    ctx.fillText(String(dayNum), cx + 8, cy + 6);

                    // --- 农历 / 节气 / 假日名称 ---
                    const solarTerm = getSolarTerm(date);
                    let lunarText = getLunarDay(date);
                    let lunarColor = theme.textMuted;

                    if (holiday && holiday.name) {
                        lunarText = holiday.name;
                        lunarColor = theme.danger;
                    } else if (solarTerm) {
                        lunarText = solarTerm;
                        lunarColor = theme.success;
                    }

                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'top';
                    ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif';
                    ctx.fillStyle = lunarColor;
                    ctx.fillText(lunarText, cx + CELL_W - 6, cy + 8);

                    // --- 「今天」标签 ---
                    if (isToday) {
                        const todayTag = '今天';
                        const tagW = 32, tagH = 18, tagR = 4;
                        const tagX = cx + CELL_W - tagW - 4;
                        const tagY = cy + CELL_H - tagH - 4;
                        roundRect(ctx, tagX, tagY, tagW, tagH, tagR);
                        ctx.fillStyle = theme.accentPrimary;
                        ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 10px "PingFang SC", "Microsoft YaHei", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(todayTag, tagX + tagW / 2, tagY + tagH / 2);
                    }

                    // --- 班次卡片 ---
                    const shift = getShiftForDate(schedule, date);
                    if (shift) {
                        const cardPad = 6;
                        const cardX = cx + cardPad;
                        const cardY = cy + 30;
                        const cardW = CELL_W - cardPad * 2;
                        const cardH = CELL_H - 36;
                        const cardR = 10;

                        // 渐变背景
                        const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
                        grad.addColorStop(0, shift.color);
                        grad.addColorStop(1, adjustColor(shift.color, -20));
                        roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
                        ctx.fillStyle = grad;
                        ctx.fill();

                        // 亮光叠加层 (顶部半透明白色)
                        const overlayGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
                        overlayGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
                        overlayGrad.addColorStop(0.5, 'rgba(255,255,255,0)');
                        roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
                        ctx.fillStyle = overlayGrad;
                        ctx.fill();

                        // 阴影效果 — 简单用底部偏移再画一遍
                        // (Canvas 阴影已通过 shadowBlur 实现)

                        // Emoji 图标
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '22px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(shift.icon, cardX + cardW / 2, cardY + cardH / 2 - 8);

                        // 班次名称
                        ctx.font = 'bold 11px "PingFang SC", "Microsoft YaHei", sans-serif';
                        ctx.fillStyle = '#ffffff';
                        ctx.shadowColor = 'rgba(0,0,0,0.3)';
                        ctx.shadowBlur = 2;
                        ctx.shadowOffsetY = 1;
                        ctx.fillText(shift.name, cardX + cardW / 2, cardY + cardH / 2 + 16);
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetY = 0;
                    }

                    // --- 调班标记 ---
                    if (state.dayOverrides[dateStr]) {
                        ctx.fillStyle = hexToRgba(theme.accentPrimary, 0.9);
                        ctx.font = 'bold 9px "PingFang SC", "Microsoft YaHei", sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'bottom';
                        const badgeW = 16, badgeH = 14;
                        roundRect(ctx, cx + 4, cy + CELL_H - badgeH - 4, badgeW, badgeH, 3);
                        ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('调', cx + 4 + badgeW / 2, cy + CELL_H - badgeH / 2 - 4);
                    }

                    // --- 备注标记 ---
                    if (state.dayNotes[dateStr]) {
                        ctx.font = '12px sans-serif';
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText('📝', cx + 24, cy + CELL_H - 4);
                    }

                    // --- 重要日期标记 ---
                    if (state.importantDates && state.importantDates.length > 0) {
                        const monthDay = `${String(info.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                        const importantDate = state.importantDates.find(d => {
                            const [, m, dd] = d.date.split('-');
                            return `${m}-${dd}` === monthDay;
                        });
                        if (importantDate) {
                            ctx.font = '14px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
                            ctx.textAlign = 'right';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText(importantDate.icon, cx + CELL_W - 4, cy + CELL_H - 2);
                        }
                    }

                    // --- 待办标记 ---
                    if (state.todos && state.todos[dateStr]) {
                        const tbW = 16, tbH = 14;
                        const tbX = cx + 40, tbY = cy + CELL_H - tbH - 4;
                        roundRect(ctx, tbX, tbY, tbW, tbH, 3);
                        ctx.fillStyle = hexToRgba(theme.success, 0.9);
                        ctx.fill();
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 9px "PingFang SC", "Microsoft YaHei", sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('办', tbX + tbW / 2, tbY + tbH / 2);
                    }
                }
            }
        }

        curY = gridStartY + info.rows * CELL_H + MONTH_GAP;
    }

    // ---- 4. 底部水印 ----
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '12px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = hexToRgba(theme.textMuted, 0.5);
    ctx.fillText('排班日历 · ' + new Date().toLocaleDateString('zh-CN'), canvasW / 2, canvasH - 12);

    return canvas;
}


// ==========================================
// 导出函数（公开 API）
// ==========================================

/**
 * 导出为图片 - Canvas 原生绘制，高清精确
 */
export async function exportAsImage() {
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (!schedule) {
        showToast('没有可导出的日历', 'error');
        return;
    }

    showToast('正在生成高清图片...');

    try {
        // 使用 requestAnimationFrame 确保 UI 更新后再绘制
        await new Promise(resolve => requestAnimationFrame(resolve));

        const canvas = drawCalendarToCanvas();
        if (!canvas) {
            showToast('生成图片失败', 'error');
            return;
        }

        const link = document.createElement('a');
        const filename = `${schedule.name}-${new Date().toISOString().slice(0, 10)}.png`;
        link.download = filename;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        showToast('图片已导出！');
    } catch (error) {
        console.error('导出图片失败:', error);
        showToast('导出失败，请重试', 'error');
    }
}

/**
 * 导出为 JSON 数据备份
 */
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

/**
 * 从 JSON 导入数据
 */
export function importFromJson() {
    const input = $('#importFileInput');
    if (input) {
        input.click();
    }
}

/**
 * 处理文件导入
 * @param {Event} event
 */
export function handleFileImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // 验证数据格式
            if (!data.shiftTypes || !data.schedules) {
                throw new Error('无效的数据格式');
            }

            // 导入数据
            state.shiftTypes = data.shiftTypes;
            state.schedules = data.schedules;
            state.activeScheduleId = data.activeScheduleId;
            state.dayOverrides = data.dayOverrides || {};
            state.dayNotes = data.dayNotes || {};
            state.importantDates = data.importantDates || [];
            state.todos = data.todos || {};

            saveState();
            showToast('数据导入成功！请刷新页面');

            // 刷新页面以应用更改
            setTimeout(() => location.reload(), 1000);
        } catch (error) {
            console.error('导入失败:', error);
            showToast('导入失败：数据格式错误', 'error');
        }
    };
    reader.readAsText(file);

    // 清空 input，以便可以再次选择同一文件
    event.target.value = '';
}

/**
 * 打印日历
 */
export function printCalendar() {
    window.print();
}

// 导出菜单状态
let exportDropdownOpen = false;

/**
 * 切换导出下拉菜单
 */
export function toggleExportDropdown() {
    const dropdown = $('#exportDropdown');
    if (dropdown) {
        exportDropdownOpen = !exportDropdownOpen;
        dropdown.classList.toggle('active', exportDropdownOpen);
    }
}

/**
 * 关闭导出下拉菜单
 */
export function closeExportDropdown() {
    const dropdown = $('#exportDropdown');
    if (dropdown) {
        exportDropdownOpen = false;
        dropdown.classList.remove('active');
    }
}

/**
 * 初始化导出相关事件
 */
export function initExportEvents() {
    $('#exportBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExportDropdown();
    });

    $('#exportImageBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        exportAsImage();
    });

    $('#exportJsonBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        exportAsJson();
    });

    $('#importJsonBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        importFromJson();
    });

    $('#printBtn')?.addEventListener('click', () => {
        closeExportDropdown();
        printCalendar();
    });

    $('#importFileInput')?.addEventListener('change', handleFileImport);

    // 点击外部关闭下拉菜单
    document.addEventListener('click', (e) => {
        const dropdown = $('#exportDropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            closeExportDropdown();
        }
    });
}
