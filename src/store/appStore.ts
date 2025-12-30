import { useState, useEffect } from 'react';
import { Event, GiftData, GiftRecord } from '@/types';
import { generateId } from '@/utils/format';

// 全局应用状态接口
interface AppState {
  currentEvent: Event | null;
  events: Event[];
  gifts: { record: GiftRecord; data: GiftData | null }[];
  loading: {
    events: boolean;
    gifts: boolean;
    submitting: boolean;
  };
  error: string | null;
}

// 初始状态
const initialState: AppState = {
  currentEvent: null,
  events: [],
  gifts: [],
  loading: {
    events: true,
    gifts: false,
    submitting: false,
  },
  error: null,
};

// 错误处理辅助函数
const handleError = (error: unknown, message: string, setState: any) => {
  console.error(message, error);
  setState((prev: AppState) => ({
    ...prev,
    error: message,
    loading: { ...prev.loading, events: false, gifts: false, submitting: false }
  }));
};

// 全局状态管理Hook
export const useAppStore = () => {
  const [state, setState] = useState<AppState>(() => {
    // 从sessionStorage恢复当前会话
    const session = sessionStorage.getItem('currentEvent');
    if (session) {
      try {
        const { event } = JSON.parse(session);
        return {
          ...initialState,
          currentEvent: event,
        };
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    }
    return initialState;
  });

  // 从localStorage加载事件
  const loadEvents = async () => {
    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, events: true } }));
      const storedEvents = localStorage.getItem('giftlist_events');
      const events: Event[] = storedEvents ? JSON.parse(storedEvents) : [];
      setState(prev => ({ ...prev, events, loading: { ...prev.loading, events: false } }));
    } catch (error) {
      handleError(error, '加载事件失败', setState);
    }
  };

  // 从localStorage加载礼物数据（明文读取）
  const loadGifts = async (eventId: string) => {
    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, gifts: true } }));
      const storedGifts = localStorage.getItem(`giftlist_gifts_${eventId}`);
      const records: GiftRecord[] = storedGifts ? JSON.parse(storedGifts) : [];

      // 直接解析JSON（数据已经是明文JSON字符串）
      const gifts = records.map(record => {
        try {
          const data = JSON.parse(record.jsonData) as GiftData;
          return { record, data };
        } catch (e) {
          console.warn('解析礼金数据失败:', e);
          return { record, data: null };
        }
      });

      setState(prev => ({
        ...prev,
        gifts,
        loading: { ...prev.loading, gifts: false }
      }));
    } catch (error) {
      handleError(error, '加载礼金数据失败', setState);
    }
  };

  // 保存会话到sessionStorage（无需密码）
  const saveSession = (event: Event) => {
    sessionStorage.setItem('currentEvent', JSON.stringify({
      event,
      timestamp: Date.now(),
    }));
  };

  // 清除会话
  const clearSession = () => {
    sessionStorage.removeItem('currentEvent');
  };

  // 添加事件
  const addEvent = async (event: Event) => {
    try {
      const newEvents = [...state.events, event];
      localStorage.setItem('giftlist_events', JSON.stringify(newEvents));
      setState(prev => ({ ...prev, events: newEvents }));
      return true;
    } catch (error) {
      handleError(error, '添加事件失败', setState);
      return false;
    }
  };

  // 添加礼物记录（直接存储JSON）
  const addGift = async (giftData: GiftData) => {
    if (!state.currentEvent) {
      setState(prev => ({ ...prev, error: '未选择事件' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, submitting: true } }));

      // 直接序列化为JSON字符串
      const record: GiftRecord = {
        id: generateId(),
        eventId: state.currentEvent.id,
        jsonData: JSON.stringify(giftData),
      };

      // 保存到localStorage
      const key = `giftlist_gifts_${state.currentEvent.id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(record);
      localStorage.setItem(key, JSON.stringify(existing));

      // 更新状态
      const newGifts = [...state.gifts, { record, data: giftData }];
      setState(prev => ({
        ...prev,
        gifts: newGifts,
        loading: { ...prev.loading, submitting: false }
      }));

      return true;
    } catch (error) {
      handleError(error, '添加礼金记录失败', setState);
      return false;
    }
  };

  // 删除礼物记录（标记为作废）
  const deleteGift = async (giftId: string) => {
    if (!state.currentEvent) {
      setState(prev => ({ ...prev, error: '未选择事件' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, submitting: true } }));

      const key = `giftlist_gifts_${state.currentEvent.id}`;
      const existingRecords: GiftRecord[] = JSON.parse(localStorage.getItem(key) || "[]");

      const updatedRecords = existingRecords.map(record => {
        if (record.id === giftId) {
          const data = JSON.parse(record.jsonData) as GiftData;
          const updatedData = { ...data, abolished: true };
          return { ...record, jsonData: JSON.stringify(updatedData) };
        }
        return record;
      });

      localStorage.setItem(key, JSON.stringify(updatedRecords));

      const updatedGifts = state.gifts.map(item => {
        if (item.record.id === giftId) {
          return { ...item, data: { ...item.data!, abolished: true } };
        }
        return item;
      });

      setState(prev => ({
        ...prev,
        gifts: updatedGifts,
        loading: { ...prev.loading, submitting: false }
      }));

      return true;
    } catch (error) {
      handleError(error, '删除礼金记录失败', setState);
      return false;
    }
  };

  // 更新礼物记录
  const updateGift = async (giftId: string, updatedData: GiftData) => {
    if (!state.currentEvent) {
      setState(prev => ({ ...prev, error: '未选择事件' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, submitting: true } }));

      const key = `giftlist_gifts_${state.currentEvent.id}`;
      const existingRecords: GiftRecord[] = JSON.parse(localStorage.getItem(key) || "[]");

      const updatedRecords = existingRecords.map(record => {
        if (record.id === giftId) {
          return { ...record, jsonData: JSON.stringify(updatedData) };
        }
        return record;
      });

      localStorage.setItem(key, JSON.stringify(updatedRecords));

      const updatedGifts = state.gifts.map(item => {
        if (item.record.id === giftId) {
          return { ...item, data: updatedData };
        }
        return item;
      });

      setState(prev => ({
        ...prev,
        gifts: updatedGifts,
        loading: { ...prev.loading, submitting: false }
      }));

      return true;
    } catch (error) {
      handleError(error, '更新礼金记录失败', setState);
      return false;
    }
  };

  // 初始化时加载事件
  useEffect(() => {
    loadEvents();
  }, []);

  // 当前会话变化时加载礼物
  useEffect(() => {
    if (state.currentEvent) {
      loadGifts(state.currentEvent.id);
    }
  }, [state.currentEvent?.id]);

  return {
    state,
    actions: {
      loadEvents,
      loadGifts,
      saveSession,
      clearSession,
      addEvent,
      addGift,
      deleteGift,
      updateGift,
    },
  };
};
