import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Event, GiftData, GiftRecord } from '@/types';
import { generateId } from '@/utils/format';
import {
  getEvents,
  saveEvents,
  getGiftsByEventId,
  saveGiftsByEventId,
  getCurrentEvent,
  saveCurrentEvent,
  clearCurrentEvent,
  saveGuestScreenData,
} from '@/lib/storage';
import { createError, getUserFriendlyError } from '@/lib/errorHandler';

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

// Actions 接口
interface AppActions {
  loadEvents: () => Promise<void>;
  loadGifts: (eventId: string) => Promise<void>;
  saveSession: (event: Event) => void;
  clearSession: () => void;
  addEvent: (event: Event) => Promise<boolean>;
  addGift: (giftData: GiftData) => Promise<boolean>;
  deleteGift: (giftId: string) => Promise<boolean>;
  updateGift: (giftId: string, updatedData: GiftData) => Promise<boolean>;
}

// Context 类型
interface AppContextType {
  state: AppState;
  actions: AppActions;
}

// 创建 Context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Props
interface AppProviderProps {
  children: ReactNode;
}

// Provider 组件
export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>(() => {
    // 从sessionStorage恢复当前会话
    const currentEvent = getCurrentEvent();
    return {
      ...initialState,
      currentEvent,
    };
  });

  // 从localStorage加载事件
  const loadEvents = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: { ...prev.loading, events: true } }));
      const events = getEvents();
      setState((prev) => ({ ...prev, events, loading: { ...prev.loading, events: false } }));
    } catch (error) {
      const errorMessage = getUserFriendlyError(error);
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: { ...prev.loading, events: false },
      }));
      throw createError('LOAD_EVENTS_FAILED', errorMessage);
    }
  }, []);

  // 从localStorage加载礼物数据
  const loadGifts = useCallback(async (eventId: string) => {
    try {
      setState((prev) => ({ ...prev, loading: { ...prev.loading, gifts: true } }));
      const records = getGiftsByEventId(eventId);

      // 解析JSON数据
      const gifts = records.map((record) => {
        try {
          const data = JSON.parse(record.dataJson) as GiftData;
          return { record, data };
        } catch (e) {
          console.warn('解析礼金数据失败:', e);
          return { record, data: null };
        }
      });

      setState((prev) => ({
        ...prev,
        gifts,
        loading: { ...prev.loading, gifts: false },
      }));
    } catch (error) {
      const errorMessage = getUserFriendlyError(error);
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: { ...prev.loading, gifts: false },
      }));
      throw createError('LOAD_GIFTS_FAILED', errorMessage);
    }
  }, []);

  // 保存会话到sessionStorage
  const saveSession = useCallback((event: Event) => {
    try {
      saveCurrentEvent(event);
      setState((prev) => ({ ...prev, currentEvent: event }));
    } catch (error) {
      console.error('保存会话失败:', error);
    }
  }, []);

  // 清除会话
  const clearSession = useCallback(() => {
    clearCurrentEvent();
    setState((prev) => ({ ...prev, currentEvent: null, gifts: [] }));
  }, []);

  // 添加事件
  const addEvent = useCallback(async (event: Event): Promise<boolean> => {
    try {
      const events = getEvents();
      const newEvents = [...events, event];
      saveEvents(newEvents);
      setState((prev) => ({ ...prev, events: newEvents }));
      return true;
    } catch (error) {
      const errorMessage = getUserFriendlyError(error);
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      throw createError('ADD_EVENT_FAILED', errorMessage);
    }
  }, []);

  // 添加礼物记录
  const addGift = useCallback(
    async (giftData: GiftData): Promise<boolean> => {
      if (!state.currentEvent) {
        const errorMessage = '未选择事件';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw createError('NO_EVENT_SELECTED', errorMessage);
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, submitting: true },
        }));

        // 创建记录
        const record: GiftRecord = {
          id: generateId(),
          eventId: state.currentEvent.id,
          dataJson: JSON.stringify(giftData),
        };

        // 保存到localStorage
        const existing = getGiftsByEventId(state.currentEvent.id);
        const updated = [...existing, record];
        saveGiftsByEventId(state.currentEvent.id, updated);

        // 更新状态
        const newGifts = [...state.gifts, { record, data: giftData }];
        setState((prev) => ({
          ...prev,
          gifts: newGifts,
          loading: { ...prev.loading, submitting: false },
        }));

        return true;
      } catch (error) {
        const errorMessage = getUserFriendlyError(error);
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: { ...prev.loading, submitting: false },
        }));
        throw createError('ADD_GIFT_FAILED', errorMessage);
      }
    },
    [state.currentEvent, state.gifts]
  );

  // 删除礼物记录（标记为作废）
  const deleteGift = useCallback(
    async (giftId: string): Promise<boolean> => {
      if (!state.currentEvent) {
        const errorMessage = '未选择事件';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw createError('NO_EVENT_SELECTED', errorMessage);
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, submitting: true },
        }));

        const existingRecords = getGiftsByEventId(state.currentEvent.id);

        const updatedRecords = existingRecords.map((record) => {
          if (record.id === giftId) {
            const data = JSON.parse(record.dataJson) as GiftData;
            const updatedData = { ...data, abolished: true };
            return { ...record, dataJson: JSON.stringify(updatedData) };
          }
          return record;
        });

        saveGiftsByEventId(state.currentEvent.id, updatedRecords);

        const updatedGifts = state.gifts.map((item) => {
          if (item.record.id === giftId) {
            return { ...item, data: { ...item.data!, abolished: true } };
          }
          return item;
        });

        setState((prev) => ({
          ...prev,
          gifts: updatedGifts,
          loading: { ...prev.loading, submitting: false },
        }));

        return true;
      } catch (error) {
        const errorMessage = getUserFriendlyError(error);
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: { ...prev.loading, submitting: false },
        }));
        throw createError('DELETE_GIFT_FAILED', errorMessage);
      }
    },
    [state.currentEvent, state.gifts]
  );

  // 更新礼物记录
  const updateGift = useCallback(
    async (giftId: string, updatedData: GiftData): Promise<boolean> => {
      if (!state.currentEvent) {
        const errorMessage = '未选择事件';
        setState((prev) => ({ ...prev, error: errorMessage }));
        throw createError('NO_EVENT_SELECTED', errorMessage);
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, submitting: true },
        }));

        const existingRecords = getGiftsByEventId(state.currentEvent.id);

        const updatedRecords = existingRecords.map((record) => {
          if (record.id === giftId) {
            return { ...record, dataJson: JSON.stringify(updatedData) };
          }
          return record;
        });

        saveGiftsByEventId(state.currentEvent.id, updatedRecords);

        const updatedGifts = state.gifts.map((item) => {
          if (item.record.id === giftId) {
            return { ...item, data: updatedData };
          }
          return item;
        });

        setState((prev) => ({
          ...prev,
          gifts: updatedGifts,
          loading: { ...prev.loading, submitting: false },
        }));

        return true;
      } catch (error) {
        const errorMessage = getUserFriendlyError(error);
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: { ...prev.loading, submitting: false },
        }));
        throw createError('UPDATE_GIFT_FAILED', errorMessage);
      }
    },
    [state.currentEvent, state.gifts]
  );

  // 初始化时加载事件
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 当前会话变化时加载礼物
  useEffect(() => {
    if (state.currentEvent) {
      loadGifts(state.currentEvent.id);
    }
  }, [state.currentEvent?.id, loadGifts]);

  const value: AppContextType = {
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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook 用于使用 Context
export function useAppStore(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
