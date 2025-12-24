import { GiftType } from '@/types';

export const Utils = {
  // 格式化货币
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount || 0);
  },

  // 数字转中文大写金额
  amountToChinese: (n: number): string => {
    if (typeof n !== 'number') return '';
    if (n === 0) return '零元整';

    let unit = '京亿万仟佰拾兆万仟佰拾亿仟佰拾万仟佰拾元角分';
    let str = '';
    let s = n.toString();

    if (s.indexOf('.') > -1) s = (n * 100).toFixed(0);
    else s += '00';

    if (s.length > unit.length) return '金额过大';
    unit = unit.substr(unit.length - s.length);

    for (let i = 0; i < s.length; i++) {
      const digit = parseInt(s.charAt(i), 10);
      str += '零壹贰叁肆伍陆柒捌玖'.charAt(digit) + unit.charAt(i);
    }

    return str
      .replace(/零(仟|佰|拾|角)/g, '零')
      .replace(/(零)+/g, '零')
      .replace(/零(兆|万|亿|元)/g, '$1')
      .replace(/(兆|亿)万/g, '$1')
      .replace(/(京|兆)亿/g, '$1')
      .replace(/(京)兆/g, '$1')
      .replace(/(亿)万/g, '$1')
      .replace(/(京|兆|亿|仟|佰|拾)(万?)(.)/g, '$1$2$3')
      .replace(/零元/g, '元')
      .replace(/零分/g, '')
      .replace(/零角/g, '零')
      .replace(/元$/g, '元整')
      .replace(/角$/g, '角整');
  },

  // 获取当前日期时间
  getCurrentDateTime: (): { date: string; time: string } => {
    const now = new Date();
    const pad = (num: number) => num.toString().padStart(2, '0');
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
  },

  // 生成唯一ID
  generateId: (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // 验证礼金类型
  isValidGiftType: (type: string): type is GiftType => {
    return ['现金', '微信', '支付宝', '其他'].includes(type);
  },

  // 验证金额
  isValidAmount: (amount: number): boolean => {
    return !isNaN(amount) && amount > 0 && amount <= 999999;
  },

  // 验证姓名长度
  isValidName: (name: string): boolean => {
    const trimmedName = name.trim();
    return trimmedName.length >= 1 && trimmedName.length <= 20;
  },
};