// 日期格式化工具
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// 日期时间格式化工具
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// 金额转中文大写
export const amountToChinese = (num: number): string => {
  if (isNaN(num)) return '';

  // 处理整数部分
  const integerPart = Math.floor(num);
  if (integerPart === 0) return '零元整';

  // 转换整数部分
  let result = '';
  let numStr = integerPart.toString();

  // 简化处理，实际项目中可能需要更复杂的逻辑
  if (numStr.length <= 4) {
    // 小于万的数字处理
    result = convertBelowTenThousand(integerPart);
  } else {
    // 更复杂的数字处理
    result = convertComplexNumber(integerPart);
  }

  // 添加"元整"后缀
  result += '元整';

  return result;
};

// 简单转换小于万的数字
function convertBelowTenThousand(num: number): string {
  if (num === 0) return '零';
  
  const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const unit = ['', '拾', '佰', '仟'];
  
  let result = '';
  const str = num.toString();
  const len = str.length;
  
  for (let i = 0; i < len; i++) {
    const digitNum = parseInt(str[i]);
    if (digitNum !== 0) {
      result += digit[digitNum] + unit[len - 1 - i];
    } else if (result && !result.endsWith('零')) {
      result += '零';
    }
  }
  
  // 清理多余的零
  result = result.replace(/零+$/, '');
  if (result.endsWith('零')) {
    result = result.slice(0, -1);
  }
  
  return result;
}

// 复杂数字转换
function convertComplexNumber(num: number): string {
  // 这里可以实现更复杂的数字转换逻辑
  // 暂时返回简化版本
  return num.toString();
}

// 生成唯一ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// 深拷贝函数
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as any;
  
  const clonedObj: any = {};
  Object.keys(obj).forEach(key => {
    clonedObj[key] = deepClone((obj as any)[key]);
  });
  
  return clonedObj;
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 金额格式化
export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

// 验证函数
export const validateAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 1 && name.trim().length <= 20;
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6 && password.length <= 20;
};