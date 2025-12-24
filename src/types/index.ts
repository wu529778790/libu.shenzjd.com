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

// 礼金记录（加密存储）
export interface GiftRecord {
  id: string;
  eventId: string;
  encryptedData: string;
}

// GitHub 配置
export interface GitHubConfig {
  owner: string;
  repo: string;
  token: string;
}

// 存储配置
export interface StorageConfig {
  type: StorageType;
  github?: GitHubConfig;
}

// 类型定义常量
export type ThemeType = 'festive' | 'solemn';
export type GiftType = '现金' | '微信' | '支付宝' | '其他';
export type StorageType = 'local' | 'github';

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

// 模态框状态
export interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'prompt';
  onConfirm?: () => void;
  onCancel?: () => void;
  defaultValue?: string;
  inputRef?: any;
}

// 应用状态
export interface AppState {
  event: Event | null;
  password: string;
  gifts: { record: GiftRecord; data: GiftData | null }[];
  currentPage: number;
  loading: boolean;
  modal: ModalState;
  detailModal: DetailModalState;
  editFormData: {
    name: string;
    amount: string;
    type: GiftType;
    remark: string;
    isEditing: boolean;
  };
  formData: GiftFormState;
  chineseAmount: string;
}