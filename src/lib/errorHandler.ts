/**
 * 统一的错误处理系统
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<string, string> = {
  'LOAD_EVENTS_FAILED': '加载事件列表失败，请刷新页面重试',
  'LOAD_GIFTS_FAILED': '加载礼金数据失败，请刷新页面重试',
  'ADD_EVENT_FAILED': '创建事件失败，请重试',
  'ADD_GIFT_FAILED': '添加礼金记录失败，请重试',
  'UPDATE_GIFT_FAILED': '更新礼金记录失败，请重试',
  'DELETE_GIFT_FAILED': '删除礼金记录失败，请重试',
  'NO_EVENT_SELECTED': '请先选择或创建一个事件',
  'INVALID_FORM_DATA': '表单数据无效，请检查输入',
  'STORAGE_ERROR': '存储操作失败，请检查浏览器设置',
};

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage || error.message;
  }

  if (error instanceof Error) {
    // 检查是否是已知错误
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      if (error.message.includes(code) || error.message.includes(message)) {
        return message;
      }
    }
    return error.message || '操作失败，请重试';
  }

  return '操作失败，请重试';
}

/**
 * 创建标准错误
 */
export function createError(
  code: string,
  message: string,
  userMessage?: string
): AppError {
  return new AppError(message, code, userMessage || ERROR_MESSAGES[code]);
}
