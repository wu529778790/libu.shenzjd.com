import { Utils } from './utils';

/**
 * 语音播报服务
 * 使用浏览器原生的 Web Speech API 进行语音合成
 */

/**
 * 语音播报配置
 */
interface VoiceConfig {
  lang: string; // 语言
  rate: number; // 语速 (0.1 - 10)
  pitch: number; // 音调 (0 - 2)
  volume: number; // 音量 (0 - 1)
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: VoiceConfig = {
  lang: 'zh-CN',
  rate: 0.9, // 稍慢的语速，更清晰
  pitch: 1.0,
  volume: 1.0,
};

/**
 * 检查浏览器是否支持语音合成
 */
export function isVoiceSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * 获取可用的中文语音
 */
function getChineseVoice(): SpeechSynthesisVoice | null {
  if (!isVoiceSupported()) return null;

  const voices = speechSynthesis.getVoices();
  // 优先选择中文语音
  const chineseVoices = voices.filter(voice =>
    voice.lang.includes('zh') || voice.lang.includes('cmn')
  );

  return chineseVoices[0] || voices[0] || null;
}

/**
 * 停止当前的语音播报
 */
export function stopVoice(): void {
  if (isVoiceSupported()) {
    speechSynthesis.cancel();
  }
}

/**
 * 语音播报文本
 * @param text 要播报的文本
 * @param config 语音配置
 * @returns Promise，在播报完成后 resolve
 */
export function speakText(text: string, config: Partial<VoiceConfig> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isVoiceSupported()) {
      console.warn('浏览器不支持语音合成');
      resolve();
      return;
    }

    // 停止当前的播报
    stopVoice();

    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语音属性
    utterance.lang = finalConfig.lang;
    utterance.rate = finalConfig.rate;
    utterance.pitch = finalConfig.pitch;
    utterance.volume = finalConfig.volume;

    // 设置语音
    const voice = getChineseVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // 事件处理
    utterance.onstart = () => {
      console.log('开始播报:', text);
    };

    utterance.onend = () => {
      console.log('播报完成');
      resolve();
    };

    utterance.onerror = (event) => {
      console.error('语音播报错误:', event);
      reject(event);
    };

    // 开始播报
    speechSynthesis.speak(utterance);
  });
}

/**
 * 礼金数据播报
 * @param name 姓名
 * @param amount 金额
 * @param type 支付类型
 * @param remark 备注（可选）
 */
export function speakGiftData(
  name: string,
  amount: number,
  type: string,
  remark?: string
): Promise<void> {
  // 构建播报文本
  const amountChinese = Utils.amountToChinese(amount);
  let text = `${name}，${amountChinese}元，${type}`;

  if (remark) {
    text += `，备注：${remark}`;
  }

  return speakText(text);
}

/**
 * 成功提示播报
 */
export function speakSuccess(): Promise<void> {
  return speakText('录入成功');
}

/**
 * 错误提示播报
 */
export function speakError(): Promise<void> {
  return speakText('录入失败，请重试');
}

/**
 * 清空播报（用于测试）
 */
export function speakClear(): Promise<void> {
  return speakText('已清空表单');
}