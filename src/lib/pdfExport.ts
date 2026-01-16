import { Event, GiftData } from '@/types';
import { formatDateTime, amountToChinese } from '@/utils/format';

interface ThemeColors {
  primary: string;
  secondary: string;
  border: string;
  text: string;
  bg: string;
  stats: string;
}

const themeColors: Record<'festive' | 'solemn', ThemeColors> = {
  festive: {
    primary: "#d9534f",
    secondary: "#c9302c",
    border: "#f8d7da",
    text: "#721c24",
    bg: "#fff5f5",
    stats: "#d9534f",
  },
  solemn: {
    primary: "#343a40",
    secondary: "#495057",
    border: "#e9ecef",
    text: "#212529",
    bg: "#f8f9fa",
    stats: "#495057",
  },
};

/**
 * 导出 PDF（打印所有数据）
 */
export function exportPDF(event: Event, gifts: GiftData[]): void {
  const validGifts = gifts.filter((g) => !g.abolished);

  if (validGifts.length === 0) {
    throw new Error('暂无礼金记录可打印');
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error('无法打开打印窗口，请检查浏览器设置');
  }

  const isFestive = event.theme === "festive";
  const sortedGifts = [...validGifts].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const giftColumnsHTML = sortedGifts
    .map((gift) => {
      const name =
        gift.name.length === 2
          ? `${gift.name[0]}　${gift.name[1]}`
          : gift.name;
      const amountChinese = amountToChinese(gift.amount);
      return `
        <div class="print-gift-column">
          <div class="book-cell name-cell">${name}</div>
          <div class="book-cell amount-cell">${amountChinese}</div>
        </div>
      `;
    })
    .join("");

  const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
  const typeStats = validGifts.reduce((acc, g) => {
    acc[g.type] = (acc[g.type] || 0) + g.amount;
    return acc;
  }, {} as Record<string, number>);
  const statsHTML = Object.entries(typeStats)
    .map(([type, amount]) => `<span class="type-stat"><em>${type}</em><b>¥${amount.toFixed(2)}</b></span>`)
    .join("");

  const colors = themeColors[isFestive ? "festive" : "solemn"];

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>礼金簿打印 - ${event.name}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 0; padding: 0; font-family: "KaiTi", "楷体", serif; background: ${colors.bg}; }
        .print-container { width: 100%; height: 100%; padding: 5mm; box-sizing: border-box; }
        .print-header { margin-bottom: 8mm; padding-bottom: 3mm; border-bottom: 3px solid ${colors.primary}; background: linear-gradient(to right, ${colors.bg}, white); padding: 3mm 2mm; border-radius: 4px; }
        .print-header h1 { font-size: 26pt; margin: 0 0 5mm 0; font-weight: bold; text-align: center; color: ${colors.primary}; letter-spacing: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
        .print-header .info { display: flex; justify-content: space-between; font-size: 10pt; color: ${colors.secondary}; margin-bottom: 3mm; font-weight: 500; }
        .print-header .stats { display: flex; justify-content: center; gap: 8mm; margin-top: 2mm; font-size: 10pt; flex-wrap: wrap; align-items: center; }
        .print-header .stats .type-stat { display: inline-flex; flex-direction: column; align-items: center; white-space: nowrap; color: ${colors.stats}; background: white; padding: 1mm 2mm; border-radius: 3px; border: 1px solid ${colors.border}; min-width: 18mm; }
        .print-header .stats .type-stat em { font-style: normal; font-size: 8pt; margin-bottom: 0.5mm; opacity: 0.8; }
        .print-header .stats .type-stat b { font-weight: bold; font-size: 11pt; }
        .print-gift-columns { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.5mm; grid-auto-rows: minmax(38mm, auto); margin-bottom: 10mm; }
        .print-gift-column { display: grid; grid-template-rows: 1fr 1.2fr; border: 2px solid ${colors.border}; border-radius: 4px; overflow: hidden; page-break-inside: avoid; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .book-cell { display: grid; place-items: center; writing-mode: vertical-lr; text-orientation: mixed; font-weight: bold; padding: 10px 0; overflow: hidden; text-align: center; line-height: 1.2; }
        .name-cell { border-bottom: 2px solid ${colors.border}; font-size: 19pt; color: ${colors.primary}; background: white; }
        .amount-cell { font-size: 17pt; color: ${colors.primary}; background: white; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="print-header">
          <h1>${event.name}</h1>
          <div class="info">
            <span>时间: ${formatDateTime(event.startDateTime)} ~ ${formatDateTime(event.endDateTime)}</span>
            ${event.recorder ? `<span>记账人: ${event.recorder}</span>` : ""}
          </div>
          <div class="stats">
            <span class="type-stat"><em>总金额</em><b>¥${totalAmount.toFixed(2)}</b></span>
            <span class="type-stat"><em>总人数</em><b>${validGifts.length}人</b></span>
            ${statsHTML}
          </div>
        </div>
        <div class="print-gift-columns">${giftColumnsHTML}</div>
      </div>
      <script>
        setTimeout(() => { window.print(); setTimeout(() => { window.close(); }, 500); }, 100);
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(printHTML);
  printWindow.document.close();
}
