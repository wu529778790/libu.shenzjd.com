// 事项类型
export interface Event {
  id: string;
  name: string;
  startDateTime: string;
  endDateTime: string;
  passwordHash: string;
  theme: ThemeType;
  recorder?: string;
  createdAt: string;
}

// 礼金数据（解密后）
export interface GiftData {
  name: string;
  amount: number;
  type: GiftType;
  remark?: string;
  timestamp: string;
  abolished?: boolean;
}

// 礼金记录（JSON 格式存储）
export interface GiftRecord {
  id: string;
  eventId: string;
  jsonData: string;
}

// 类型定义常量
export type ThemeType = 'festive' | 'solemn';
export type GiftType = '现金' | '微信' | '支付宝' | '其他';

// UI 组件类型
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

// 分页类型
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
}

// 表单状态类型
export interface GiftFormState {
  name: string;
  amount: string;
  type: GiftType;
  remark: string;
}

// 礼金详情弹窗状态
export interface DetailModalState {
  isOpen: boolean;
  gift: GiftData | null;
  index: number;
}