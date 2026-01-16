/**
 * 统一的数据访问层
 * 封装所有 localStorage 和 sessionStorage 操作
 */

import { Event, GiftRecord } from '@/types';

// Storage Keys
export const STORAGE_KEYS = {
  EVENTS: 'giftlist_events',
  GUEST_SCREEN_DATA: 'guest_screen_data',
  CURRENT_EVENT: 'currentEvent',
} as const;

/**
 * 获取事件列表
 */
export function getEvents(): Event[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.EVENTS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('读取事件列表失败:', error);
    return [];
  }
}

/**
 * 保存事件列表
 */
export function saveEvents(events: Event[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  } catch (error) {
    console.error('保存事件列表失败:', error);
    throw new Error('保存事件列表失败');
  }
}

/**
 * 获取指定事件的礼金记录
 */
export function getGiftsByEventId(eventId: string): GiftRecord[] {
  try {
    const key = `giftlist_gifts_${eventId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('读取礼金记录失败:', error);
    return [];
  }
}

/**
 * 保存指定事件的礼金记录
 */
export function saveGiftsByEventId(eventId: string, gifts: GiftRecord[]): void {
  try {
    const key = `giftlist_gifts_${eventId}`;
    localStorage.setItem(key, JSON.stringify(gifts));
  } catch (error) {
    console.error('保存礼金记录失败:', error);
    throw new Error('保存礼金记录失败');
  }
}

/**
 * 获取当前会话事件
 */
export function getCurrentEvent(): Event | null {
  try {
    const session = sessionStorage.getItem(STORAGE_KEYS.CURRENT_EVENT);
    if (!session) return null;
    const parsed = JSON.parse(session);
    return parsed.event || null;
  } catch (error) {
    console.error('读取当前会话失败:', error);
    return null;
  }
}

/**
 * 保存当前会话事件
 */
export function saveCurrentEvent(event: Event): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_EVENT, JSON.stringify({
      event,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error('保存当前会话失败:', error);
    throw new Error('保存当前会话失败');
  }
}

/**
 * 清除当前会话
 */
export function clearCurrentEvent(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_EVENT);
  } catch (error) {
    console.error('清除当前会话失败:', error);
  }
}

/**
 * 保存副屏数据
 */
export function saveGuestScreenData(data: {
  eventName: string;
  theme: string;
  gifts: any[];
}): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GUEST_SCREEN_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('保存副屏数据失败:', error);
  }
}
