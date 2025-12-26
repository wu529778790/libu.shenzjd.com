import React, { useState, useEffect } from 'react';
import { isVoiceSupported, stopVoice } from '@/lib/voice';

interface VoiceControlProps {
  onTest?: () => void;
  className?: string;
}

/**
 * 语音播报控制组件
 * 显示语音状态并提供控制按钮
 */
const VoiceControl: React.FC<VoiceControlProps> = ({ onTest, className = '' }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setIsSupported(isVoiceSupported());

    // 监听语音播报状态
    const handleSpeechStart = () => setIsSpeaking(true);
    const handleSpeechEnd = () => setIsSpeaking(false);

    if (isVoiceSupported()) {
      const synth = window.speechSynthesis;

      // 使用定时器检查播报状态
      const checkInterval = setInterval(() => {
        setIsSpeaking(synth.speaking);
      }, 100);

      synth.addEventListener('start', handleSpeechStart);
      synth.addEventListener('end', handleSpeechEnd);

      return () => {
        clearInterval(checkInterval);
        synth.removeEventListener('start', handleSpeechStart);
        synth.removeEventListener('end', handleSpeechEnd);
      };
    }
  }, []);

  const handleStop = () => {
    stopVoice();
    setIsSpeaking(false);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isSpeaking ? (
        <>
          <span className="text-sm text-green-600 font-semibold animate-pulse">
            🔊 正在播报...
          </span>
          <button
            onClick={handleStop}
            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
          >
            停止
          </button>
        </>
      ) : (
        <span className="text-sm text-gray-500">🔊 语音就绪</span>
      )}
      {onTest && (
        <button
          onClick={onTest}
          className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
        >
          测试
        </button>
      )}
    </div>
  );
};

export default VoiceControl;