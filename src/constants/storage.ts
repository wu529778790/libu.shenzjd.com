/**
 * 存储相关的常量定义
 */

export const STORAGE_KEYS = {
  EVENTS: 'giftlist_events',
  GUEST_SCREEN_DATA: 'guest_screen_data',
  CURRENT_EVENT: 'currentEvent',
} as const;

/**
 * 生成礼金数据的存储 key
 */
export function getGiftsStorageKey(eventId: string): string {
  return `giftlist_gifts_${eventId}`;
}
