import { Event, GiftRecord, GiftData, GiftType } from '@/types';
import { amountToChinese, formatDate } from '@/utils/format';
import { Utils } from '@/lib/utils';
import * as XLSX from 'xlsx';

// Excel 导入结果接口
export interface ExcelImportResult {
  success: boolean;
  message: string;
  events: number;
  gifts: number;
  conflicts: number;
  skipped: number;
  warnings: string[];
}

// Excel 数据预览接口
export interface ExcelPreview {
  fileName: string;
  sheetNames: string[];
  events: Event[];
  gifts: GiftData[];
  hasEventInfo: boolean;
}

// 导入结果接口
export interface ImportResult {
  events: number;
  gifts: number;
  conflicts: number;
}

// 备份数据格式
interface BackupData {
  version: string;
  timestamp: string;
  events: Event[];
  gifts: Record<string, GiftRecord[]>;
}

/**
 * 备份服务 - 处理数据的导入和导出
 */
export class BackupService {
  /**
   * 导出完整数据为 JSON 文件
   */
  static exportAll(): void {
    const data: BackupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      events: this.getAllEvents(),
      gifts: this.getAllGifts(),
    };

    // 创建 JSON 字符串
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    // 生成文件名（包含日期）
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `礼簿备份_${dateStr}.json`;

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 导入备份数据
   * @param file 文件对象
   * @returns 导入结果
   */
  static async import(file: File): Promise<ImportResult> {
    // 读取文件内容
    const text = await file.text();

    // 解析 JSON
    let data: BackupData;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('文件格式错误，无法解析 JSON');
    }

    // 验证数据结构
    if (!data.version || !data.timestamp || !data.events || !data.gifts) {
      throw new Error('备份文件格式不正确，缺少必要字段');
    }

    const result: ImportResult = {
      events: 0,
      gifts: 0,
      conflicts: 0,
    };

    // 合并事件数据
    const existingEvents = this.getAllEvents();
    const existingEventIds = new Set(existingEvents.map(e => e.id));

    data.events.forEach((event: Event) => {
      if (!existingEventIds.has(event.id)) {
        existingEvents.push(event);
        result.events++;
      } else {
        result.conflicts++;
      }
    });

    // 保存事件到 localStorage
    localStorage.setItem('giftlist_events', JSON.stringify(existingEvents));

    // 合并礼物数据
    for (const eventId in data.gifts) {
      const incomingGifts = data.gifts[eventId];
      const existingGifts = this.getGiftsByEventId(eventId);
      const existingGiftIds = new Set(existingGifts.map(g => g.id));

      incomingGifts.forEach((gift: GiftRecord) => {
        if (!existingGiftIds.has(gift.id)) {
          existingGifts.push(gift);
          result.gifts++;
        } else {
          result.conflicts++;
        }
      });

      // 保存礼物到 localStorage
      if (existingGifts.length > 0) {
        localStorage.setItem(`giftlist_gifts_${eventId}`, JSON.stringify(existingGifts));
      }
    }

    return result;
  }

  /**
   * 导出指定事件的数据
   */
  static exportEvent(eventId: string, eventName: string): void {
    const event = this.getEventById(eventId);
    if (!event) {
      throw new Error('事件不存在');
    }

    const gifts = this.getGiftsByEventId(eventId);

    const data = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      events: [event],
      gifts: { [eventId]: gifts },
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    // 清理文件名中的特殊字符
    const safeName = eventName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `礼簿_${safeName}_${dateStr}.json`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 获取所有事件
   */
  private static getAllEvents(): Event[] {
    const stored = localStorage.getItem('giftlist_events');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * 根据 ID 获取事件
   */
  private static getEventById(id: string): Event | null {
    const events = this.getAllEvents();
    return events.find(e => e.id === id) || null;
  }

  /**
   * 获取所有礼物数据
   */
  private static getAllGifts(): Record<string, GiftRecord[]> {
    const gifts: Record<string, GiftRecord[]> = {};
    const events = this.getAllEvents();

    events.forEach((event: Event) => {
      const data = this.getGiftsByEventId(event.id);
      if (data.length > 0) {
        gifts[event.id] = data;
      }
    });

    return gifts;
  }

  /**
   * 根据事件 ID 获取礼物数据
   */
  private static getGiftsByEventId(eventId: string): GiftRecord[] {
    const stored = localStorage.getItem(`giftlist_gifts_${eventId}`);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * 检查是否有备份数据
   */
  static hasData(): boolean {
    const events = localStorage.getItem('giftlist_events');
    if (!events) return false;

    const eventList: Event[] = JSON.parse(events);
    if (eventList.length === 0) return false;

    // 检查是否有礼物数据
    for (const event of eventList) {
      const gifts = localStorage.getItem(`giftlist_gifts_${event.id}`);
      if (gifts && JSON.parse(gifts).length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取数据统计信息
   */
  static getStats(): { events: number; gifts: number; lastModified: string | null } {
    const events = this.getAllEvents();
    let totalGifts = 0;
    let lastModified: string | null = null;

    events.forEach((event: Event) => {
      const gifts = this.getGiftsByEventId(event.id);
      totalGifts += gifts.length;

      // 找出最后修改时间
      gifts.forEach((gift: GiftRecord) => {
        if (!lastModified || gift.id > lastModified) {
          // 这里用 id 作为近似时间戳
          lastModified = gift.id;
        }
      });
    });

    return {
      events: events.length,
      gifts: totalGifts,
      lastModified,
    };
  }

  /**
   * 预览 Excel 文件内容
   * @param file Excel 文件
   * @returns 预览数据
   */
  static async previewExcel(file: File): Promise<ExcelPreview> {
    // 读取 Excel 文件
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const preview: ExcelPreview = {
      fileName: file.name,
      sheetNames: workbook.SheetNames,
      events: [],
      gifts: [],
      hasEventInfo: false,
    };

    // 尝试读取事件信息工作表（支持多种命名）
    // 优先级：事件信息 > 包含"信息"的工作表 > 第二个工作表
    let eventSheet = workbook.Sheets['事件信息'];

    if (!eventSheet) {
      // 查找包含"信息"的工作表
      const infoSheetName = workbook.SheetNames.find(name => name.includes('信息'));
      if (infoSheetName) {
        eventSheet = workbook.Sheets[infoSheetName];
      } else if (workbook.SheetNames.length > 1) {
        // 如果有多个工作表，尝试第二个（可能是事件信息表）
        const secondSheet = workbook.Sheets[workbook.SheetNames[1]];
        // 简单检查是否包含事件信息格式
        const jsonData = XLSX.utils.sheet_to_json(secondSheet, { header: 1 }) as any[][];
        if (jsonData.length > 0 && jsonData[0] && jsonData[0].length === 2) {
          eventSheet = secondSheet;
        }
      }
    }

    if (eventSheet) {
      preview.hasEventInfo = true;
      const eventData = XLSX.utils.sheet_to_json(eventSheet, { header: 1 });

      // 解析事件信息（兼容多种格式）
      const eventInfo: any = {};

      // 尝试多种解析方式
      const parseRow = (row: any) => {
        if (!row) return null;

        // 方式1: row是数组 [key, value]
        if (Array.isArray(row) && row.length >= 2) {
          return { key: row[0], value: row[1] };
        }

        // 方式2: row是对象 {0: key, 1: value}
        if (row[0] !== undefined && row[1] !== undefined) {
          return { key: row[0], value: row[1] };
        }

        // 方式3: row是对象 {key: value} (header:2格式)
        const keys = Object.keys(row);
        if (keys.length === 2) {
          return { key: keys[0], value: row[keys[0]] };
        }

        return null;
      };

      eventData.forEach((row: any) => {
        const parsed = parseRow(row);
        if (!parsed) return;

        const key = String(parsed.key || '').trim();
        const value = String(parsed.value || '').trim();

        if (key && value) {
          if (key.includes('事件名称')) eventInfo.name = value;
          if (key.includes('开始时间')) eventInfo.startDateTime = value;
          if (key.includes('结束时间')) eventInfo.endDateTime = value;
          if (key.includes('记账人')) eventInfo.recorder = value;
        }
      });

      if (eventInfo.name) {
        preview.events.push({
          id: Utils.generateId(),
          name: eventInfo.name,
          startDateTime: eventInfo.startDateTime || new Date().toISOString(),
          endDateTime: eventInfo.endDateTime || new Date().toISOString(),
          passwordHash: '', // 密码需要用户重新设置
          theme: 'festive',
          recorder: eventInfo.recorder,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 尝试读取礼金明细工作表
    const detailSheet = workbook.Sheets['礼金明细'] || workbook.Sheets[workbook.SheetNames[0]];
    if (detailSheet) {
      const jsonData = XLSX.utils.sheet_to_json(detailSheet, { header: 1 });

      // 找到表头行（通常是第一行）
      const headers = jsonData[0] as string[];
      const nameIndex = headers.findIndex(h => h.includes('姓名'));
      const amountIndex = headers.findIndex(h => h.includes('金额') && !h.includes('大写'));
      const typeIndex = headers.findIndex(h => h.includes('支付') || h.includes('方式'));
      const remarkIndex = headers.findIndex(h => h.includes('备注'));
      const timeIndex = headers.findIndex(h => h.includes('时间'));

      // 从第二行开始读取数据
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;

        const name = nameIndex >= 0 ? String(row[nameIndex] || '').trim() : '';
        const amount = amountIndex >= 0 ? Number(row[amountIndex] || 0) : 0;

        if (!name || !amount || amount <= 0) continue;

        const type = typeIndex >= 0 ? String(row[typeIndex] || '现金').trim() as GiftType : '现金';
        const remark = remarkIndex >= 0 ? String(row[remarkIndex] || '').trim() : '';
        const timestamp = timeIndex >= 0 ?
          (row[timeIndex] ? new Date(row[timeIndex]).toISOString() : new Date().toISOString()) :
          new Date().toISOString();

        // 验证支付类型
        const validTypes: GiftType[] = ['现金', '微信', '支付宝', '其他'];
        const validatedType = validTypes.includes(type) ? type : '其他';

        preview.gifts.push({
          name,
          amount,
          type: validatedType,
          remark: remark || undefined,
          timestamp,
        });
      }
    }

    return preview;
  }

  /**
   * 从 Excel 导入数据
   * @param file Excel 文件
   * @param options 导入选项
   * @returns 导入结果
   */
  static async importExcel(
    file: File,
    options: {
      conflictStrategy: 'skip' | 'overwrite' | 'both'; // 跳过、覆盖、都保留
      targetEventId?: string; // 目标事件ID（如果导入到现有事件）
      createNewEvent?: boolean; // 是否创建新事件
    }
  ): Promise<ExcelImportResult> {
    const result: ExcelImportResult = {
      success: false,
      message: '',
      events: 0,
      gifts: 0,
      conflicts: 0,
      skipped: 0,
      warnings: [],
    };

    try {
      // 预览数据
      const preview = await this.previewExcel(file);

      if (preview.gifts.length === 0) {
        result.message = 'Excel 文件中没有找到有效的礼金数据';
        return result;
      }

      // 处理事件
      let targetEventId = options.targetEventId;
      if (preview.events.length > 0) {
        // Excel 中包含事件信息
        if (options.createNewEvent || !targetEventId) {
          // 创建新事件
          const event = preview.events[0];
          event.id = Utils.generateId();
          event.passwordHash = ''; // 不再需要密码

          // 保存事件
          const existingEvents = this.getAllEvents();
          existingEvents.push(event);
          localStorage.setItem('giftlist_events', JSON.stringify(existingEvents));

          targetEventId = event.id;
          result.events = 1;
        }
      }

      if (!targetEventId) {
        result.message = '无法确定目标事件，请选择或创建事件';
        return result;
      }

      // 获取现有礼金数据（明文JSON）
      const existingRecords = this.getGiftsByEventId(targetEventId);

      // 检测重复数据（无需密码，直接解析JSON）
      const existingGiftKeys = new Set<string>();
      if (existingRecords.length > 0) {
        existingRecords.forEach(record => {
          try {
            const data = JSON.parse(record.encryptedData) as GiftData;
            if (data && !data.abolished) {
              const key = `${data.name}_${data.amount}_${data.timestamp}`;
              existingGiftKeys.add(key);
            }
          } catch (e) {
            // 解析失败，跳过这条记录
          }
        });
      }

      // 处理礼金数据
      const giftsToImport: GiftRecord[] = [];
      const existingGiftsCopy = [...existingRecords]; // 用于overwrite策略

      preview.gifts.forEach(gift => {
        const key = `${gift.name}_${gift.amount}_${gift.timestamp}`;
        const isConflict = existingGiftKeys.has(key);

        if (isConflict) {
          result.conflicts++;

          if (options.conflictStrategy === 'skip') {
            result.skipped++;
            return; // 跳过
          } else if (options.conflictStrategy === 'overwrite') {
            // 删除旧的记录
            const index = existingGiftsCopy.findIndex(record => {
              try {
                const data = JSON.parse(record.encryptedData) as GiftData;
                if (!data) return false;
                const recordKey = `${data.name}_${data.amount}_${data.timestamp}`;
                return recordKey === key;
              } catch {
                return false;
              }
            });
            if (index >= 0) {
              existingGiftsCopy.splice(index, 1);
            }
          }
          // both 策略：保留旧的，添加新的（什么都不做）
        }

        // 创建记录（直接存储JSON，无需加密）
        const record: GiftRecord = {
          id: Utils.generateId(),
          eventId: targetEventId,
          encryptedData: JSON.stringify(gift),
        };

        giftsToImport.push(record);
        result.gifts++;
      });

      // 合并并保存
      const allGifts = [...existingGiftsCopy, ...giftsToImport];
      if (allGifts.length > 0) {
        localStorage.setItem(`giftlist_gifts_${targetEventId}`, JSON.stringify(allGifts));
      }

      result.success = true;
      result.message = `成功导入 ${result.gifts} 条礼金记录${result.conflicts > 0 ? `（跳过 ${result.skipped} 条重复）` : ''}`;

      return result;

    } catch (error) {
      result.success = false;
      result.message = `导入失败：${(error as Error).message}`;
      return result;
    }
  }

  /**
   * 导出指定事件为 Excel 文件
   * @param eventName 事件名称
   * @param gifts 解密后的礼金数据列表
   * @param eventInfo 事件详细信息（可选，用于在Excel中显示事件信息）
   */
  static exportExcel(
    eventName: string,
    gifts: GiftData[],
    eventInfo?: Event
  ): void {
    // 过滤掉已作废的记录
    const validGifts = gifts.filter(g => !g.abolished);

    if (validGifts.length === 0) {
      alert('没有可导出的有效礼金记录');
      return;
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // ========== 第一页：礼金明细表 ==========

    // 准备表头数据
    const headers = [
      '序号',
      '姓名',
      '金额（元）',
      '金额大写',
      '支付方式',
      '备注',
      '录入时间'
    ];

    // 准备数据行
    const dataRows = validGifts.map((gift, index) => [
      index + 1,
      gift.name,
      gift.amount,
      amountToChinese(gift.amount),
      gift.type,
      gift.remark || '',
      formatDate(gift.timestamp)
    ]);

    // 合并表头和数据
    const sheetData = [headers, ...dataRows];

    // 创建工作表
    const detailSheet = XLSX.utils.aoa_to_sheet(sheetData);

    // 设置列宽
    detailSheet['!cols'] = [
      { wch: 6 },   // 序号
      { wch: 12 },  // 姓名
      { wch: 12 },  // 金额
      { wch: 25 },  // 金额大写
      { wch: 10 },  // 支付方式
      { wch: 20 },  // 备注
      { wch: 12 }   // 时间
    ];

    // 设置单元格样式（表头加粗）
    for (let C = 0; C < headers.length; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!detailSheet[cellAddress]) continue;
      detailSheet[cellAddress].s = {
        font: { bold: true, name: '宋体' },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: 'FFE3E3E3' } }
      };
    }

    // 数据行样式
    for (let R = 1; R < sheetData.length; ++R) {
      for (let C = 0; C < headers.length; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!detailSheet[cellAddress]) continue;
        detailSheet[cellAddress].s = {
          font: { name: '宋体' },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    }

    // 添加到工作簿
    XLSX.utils.book_append_sheet(workbook, detailSheet, '礼金明细');

    // ========== 第二页：统计汇总 ==========

    // 计算统计数据
    const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
    const totalPeople = validGifts.length;

    // 按支付方式统计
    const typeStats: Record<string, number> = {};
    const typeCount: Record<string, number> = {};
    validGifts.forEach(g => {
      typeStats[g.type] = (typeStats[g.type] || 0) + g.amount;
      typeCount[g.type] = (typeCount[g.type] || 0) + 1;
    });

    // 准备统计数据
    const statsData = [
      ['==========', '========', '========', '========'],
      ['统计项目', '数值', '说明', ''],
      ['==========', '========', '========', '========'],
      ['总人数', totalPeople, '人', ''],
      ['总金额', totalAmount, '元', amountToChinese(totalAmount)],
      ['', '', '', ''],
      ['支付方式统计', '', '', ''],
      ['----------', '--------', '--------', '--------']
    ];

    // 添加各支付方式统计
    Object.keys(typeStats).forEach(type => {
      statsData.push([
        type,
        typeStats[type],
        `${typeCount[type]}笔`,
        amountToChinese(typeStats[type])
      ]);
    });

    // 事件信息（如果有）
    if (eventInfo) {
      statsData.push(['', '', '', '']);
      statsData.push(['事件信息', '', '', '']);
      statsData.push(['----------', '--------', '--------', '--------']);
      statsData.push(['事件名称', eventInfo.name, '', '']);
      statsData.push(['开始时间', formatDate(eventInfo.startDateTime), '', '']);
      statsData.push(['结束时间', formatDate(eventInfo.endDateTime), '', '']);
      if (eventInfo.recorder) {
        statsData.push(['记账人', eventInfo.recorder, '', '']);
      }
      statsData.push(['导出时间', formatDate(new Date().toISOString()), '', '']);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(statsData);

    // 设置统计表的列宽
    summarySheet['!cols'] = [
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 }
    ];

    // 设置统计表样式
    for (let R = 0; R < statsData.length; ++R) {
      for (let C = 0; C < 4; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!summarySheet[cellAddress]) continue;

        // 表头加粗
        if (R <= 2 || statsData[R][0] === '支付方式统计' || statsData[R][0] === '事件信息') {
          summarySheet[cellAddress].s = {
            font: { bold: true, name: '宋体' },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        } else {
          summarySheet[cellAddress].s = {
            font: { name: '宋体' },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }
    }

    // 添加到工作簿
    XLSX.utils.book_append_sheet(workbook, summarySheet, '统计汇总');

    // ========== 第三页：事件信息表（用于导入识别） ==========
    if (eventInfo) {
      const eventData = [
        ['==========', '========'],
        ['事件信息', ''],
        ['==========', '========'],
        ['事件名称', eventInfo.name],
        ['开始时间', formatDate(eventInfo.startDateTime)],
        ['结束时间', formatDate(eventInfo.endDateTime)],
        ['记账人', eventInfo.recorder || ''],
        ['主题', eventInfo.theme === 'festive' ? '喜事' : '丧事'],
        ['创建时间', formatDate(eventInfo.createdAt)],
        ['导出时间', formatDate(new Date().toISOString())]
      ];

      const eventSheet = XLSX.utils.aoa_to_sheet(eventData);
      eventSheet['!cols'] = [{ wch: 18 }, { wch: 30 }];

      // 样式
      for (let R = 0; R < eventData.length; ++R) {
        for (let C = 0; C < 2; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!eventSheet[cellAddress]) continue;

          if (R <= 2 || eventData[R][0] === '事件信息') {
            eventSheet[cellAddress].s = {
              font: { bold: true, name: '宋体' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else {
            eventSheet[cellAddress].s = {
              font: { name: '宋体' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      }

      // 添加到工作簿
      XLSX.utils.book_append_sheet(workbook, eventSheet, '事件信息');
    }

    // ========== 生成文件并下载 ==========

    // 清理文件名中的特殊字符
    const safeName = eventName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `礼簿_${safeName}_${dateStr}.xlsx`;

    // 生成 Excel 文件（二进制）
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // 创建 Blob 并下载
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出所有事件的数据为 Excel（多工作表）
   * @param giftDataGetter 获取礼金数据的函数（无需密码）
   */
  static async exportAllExcel(
    giftDataGetter: (eventId: string) => GiftData[]
  ): Promise<void> {
    const events = this.getAllEvents();

    if (events.length === 0) {
      alert('没有可导出的事件数据');
      return;
    }

    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 为每个事件创建一个工作表
    for (const event of events) {
      // 获取礼金数据（无需密码）
      const gifts = giftDataGetter(event.id);

      if (gifts.length === 0) {
        continue; // 跳过无数据的事件
      }

      // 过滤已作废
      const validGifts = gifts.filter(g => !g.abolished);

      if (validGifts.length === 0) continue;

      // 创建礼金明细表
      const headers = ['序号', '姓名', '金额（元）', '金额大写', '支付方式', '备注', '录入时间'];
      const dataRows = validGifts.map((gift, index) => [
        index + 1,
        gift.name,
        gift.amount,
        amountToChinese(gift.amount),
        gift.type,
        gift.remark || '',
        formatDate(gift.timestamp)
      ]);

      const sheetData = [headers, ...dataRows];
      const detailSheet = XLSX.utils.aoa_to_sheet(sheetData);

      // 设置列宽和样式
      detailSheet['!cols'] = [
        { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 25 },
        { wch: 10 }, { wch: 20 }, { wch: 12 }
      ];

      // 表头样式
      for (let C = 0; C < headers.length; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!detailSheet[cellAddress]) continue;
        detailSheet[cellAddress].s = {
          font: { bold: true, name: '宋体' },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { fgColor: { rgb: 'FFE3E3E3' } }
        };
      }

      // 数据行样式
      for (let R = 1; R < sheetData.length; ++R) {
        for (let C = 0; C < headers.length; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!detailSheet[cellAddress]) continue;
          detailSheet[cellAddress].s = {
            font: { name: '宋体' },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      // 添加事件信息表
      const eventData = [
        ['==========', '========'],
        ['事件信息', ''],
        ['==========', '========'],
        ['事件名称', event.name],
        ['开始时间', formatDate(event.startDateTime)],
        ['结束时间', formatDate(event.endDateTime)],
        ['记账人', event.recorder || ''],
        ['主题', event.theme === 'festive' ? '喜事' : '丧事'],
        ['创建时间', formatDate(event.createdAt)],
        ['导出时间', formatDate(new Date().toISOString())]
      ];

      const eventSheet = XLSX.utils.aoa_to_sheet(eventData);
      eventSheet['!cols'] = [{ wch: 18 }, { wch: 30 }];

      // 样式
      for (let R = 0; R < eventData.length; ++R) {
        for (let C = 0; C < 2; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          if (!eventSheet[cellAddress]) continue;

          if (R <= 2 || eventData[R][0] === '事件信息') {
            eventSheet[cellAddress].s = {
              font: { bold: true, name: '宋体' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          } else {
            eventSheet[cellAddress].s = {
              font: { name: '宋体' },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
          }
        }
      }

      // 添加到工作簿（工作表名称限制31字符）
      const safeEventName = event.name.substring(0, 20);
      XLSX.utils.book_append_sheet(workbook, detailSheet, `${safeEventName}_礼金`);
      XLSX.utils.book_append_sheet(workbook, eventSheet, `${safeEventName}_信息`);
    }

    // 生成文件名
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `礼簿数据_${dateStr}.xlsx`;

    // 下载文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
