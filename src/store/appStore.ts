import { useState, useEffect } from 'react';
import { Event, GiftData, GiftRecord } from '@/types';
import { CryptoService } from '@/lib/crypto';

// 全局应用状态接口
interface AppState {
  currentEvent: Event | null;
  currentPassword: string | null;
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
  currentPassword: null,
  events: [],
  gifts: [],
  loading: {
    events: true,  // 初始为true，因为需要从localStorage加载
    gifts: false,
    submitting: false,
  },
  error: null,
};

// 全局状态管理Hook
export const useAppStore = () => {
  const [state, setState] = useState<AppState>(() => {
    // 从sessionStorage恢复当前会话
    const session = sessionStorage.getItem('currentEvent');
    if (session) {
      try {
        const { event, password } = JSON.parse(session);
        return {
          ...initialState,
          currentEvent: event,
          currentPassword: password,
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
      console.error('Failed to load events:', error);
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, events: false }, 
        error: '加载事件失败' 
      }));
    }
  };

  // 从localStorage加载礼物数据
  const loadGifts = async (eventId: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, gifts: true } }));
      const storedGifts = localStorage.getItem(`giftlist_gifts_${eventId}`);
      const records: GiftRecord[] = storedGifts ? JSON.parse(storedGifts) : [];
      
      // 解密所有礼物数据
      const gifts = records.map(record => {
        const data = CryptoService.decrypt<GiftData>(record.encryptedData, password);
        return { record, data };
      });

      setState(prev => ({ 
        ...prev, 
        gifts, 
        loading: { ...prev.loading, gifts: false } 
      }));
    } catch (error) {
      console.error('Failed to load gifts:', error);
      setState(prev => ({ 
        ...prev, 
        loading: { ...prev.loading, gifts: false }, 
        error: '加载礼金数据失败' 
      }));
    }
  };

  // 保存会话到sessionStorage
  const saveSession = (event: Event, password: string) => {
    sessionStorage.setItem('currentEvent', JSON.stringify({
      event,
      password,
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
      console.error('Failed to add event:', error);
      setState(prev => ({ ...prev, error: '添加事件失败' }));
      return false;
    }
  };

  // 添加礼物记录
  const addGift = async (giftData: GiftData) => {
    if (!state.currentEvent || !state.currentPassword) {
      setState(prev => ({ ...prev, error: '未选择事件或密码' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, submitting: true } }));

      // 加密礼物数据
      const encrypted = CryptoService.encrypt(giftData, state.currentPassword);
      const record: GiftRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        eventId: state.currentEvent.id,
        encryptedData: encrypted,
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
      console.error('Failed to add gift:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, submitting: false },
        error: '添加礼金记录失败'
      }));
      return false;
    }
  };

  // 删除礼物记录（标记为作废）
  const deleteGift = async (giftId: string) => {
    if (!state.currentEvent || !state.currentPassword) {
      setState(prev => ({ ...prev, error: '未选择事件或密码' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, submitting: true } }));

      // 从localStorage加载现有记录
      const key = `giftlist_gifts_${state.currentEvent.id}`;
      const existingRecords: GiftRecord[] = JSON.parse(localStorage.getItem(key) || "[]");

      // 查找并修改目标记录（标记为作废而非物理删除）
      const updatedRecords = existingRecords.map(record => {
        if (record.id === giftId) {
          // 解密原数据
          const decryptedData = CryptoService.decrypt<GiftData>(record.encryptedData, state.currentPassword);
          // 修改数据标记为作废
          const updatedData = { ...decryptedData, abolished: true };
          // 重新加密
          const encrypted = CryptoService.encrypt(updatedData, state.currentPassword);
          return { ...record, encryptedData: encrypted };
        }
        return record;
      });

      // 保存回localStorage
      localStorage.setItem(key, JSON.stringify(updatedRecords));

      // 更新状态
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
      console.error('Failed to delete gift:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, submitting: false },
        error: '删除礼金记录失败'
      }));
      return false;
    }
  };

  // 更新礼物记录
  const updateGift = async (giftId: string, updatedData: GiftData) => {
    if (!state.currentEvent || !state.currentPassword) {
      setState(prev => ({ ...prev, error: '未选择事件或密码' }));
      return false;
    }

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, submitting: true } }));

      // 从localStorage加载现有记录
      const key = `giftlist_gifts_${state.currentEvent.id}`;
      const existingRecords: GiftRecord[] = JSON.parse(localStorage.getItem(key) || "[]");

      // 查找并更新目标记录
      const updatedRecords = existingRecords.map(record => {
        if (record.id === giftId) {
          // 重新加密更新后的数据
          const encrypted = CryptoService.encrypt(updatedData, state.currentPassword);
          return { ...record, encryptedData: encrypted };
        }
        return record;
      });

      // 保存回localStorage
      localStorage.setItem(key, JSON.stringify(updatedRecords));

      // 更新状态
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
      console.error('Failed to update gift:', error);
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, submitting: false },
        error: '更新礼金记录失败'
      }));
      return false;
    }
  };

  // 初始化时加载事件
  useEffect(() => {
    loadEvents();
  }, []);

  // 当前会话变化时加载礼物
  useEffect(() => {
    if (state.currentEvent && state.currentPassword) {
      loadGifts(state.currentEvent.id, state.currentPassword);
    }
  }, [state.currentEvent?.id, state.currentPassword]);

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