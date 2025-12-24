// 应用常量
export const APP_NAME = '电子礼簿系统';
export const APP_DESCRIPTION = '纯本地、零后端、安全的礼金管理系统';

// 主题常量
export const THEMES = {
  FESTIVE: 'festive',
  SOLEMN: 'solemn',
} as const;

export type ThemeType = keyof typeof THEMES;

// 路由常量
export const ROUTES = {
  HOME: '/',
  SETUP: '/setup',
  MAIN: '/main',
  GUEST_SCREEN: '/guest-screen',
  TEST_DATA: '/test-data',
  TEST_REDIRECT: '/test-redirect',
  NOT_FOUND: '*',
} as const;

// 事件类型常量
export const GIFT_TYPES = ['现金', '微信', '支付宝', '其他'] as const;
export type GiftType = typeof GIFT_TYPES[number];

// 存储键常量
export const STORAGE_KEYS = {
  EVENTS: 'giftlist_events',
  CURRENT_EVENT: 'currentEvent',
  GUEST_DATA: 'guest_data',
} as const;

// 默认值常量
export const DEFAULT_VALUES = {
  PASSWORD: '123456',
  THEME: THEMES.FESTIVE,
} as const;

// 校验规则常量
export const VALIDATION_RULES = {
  EVENT_NAME_MIN_LENGTH: 1,
  EVENT_NAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 20,
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 20,
  AMOUNT_MIN: 0,
  AMOUNT_MAX: 999999,
  REMARK_MAX_LENGTH: 100,
} as const;