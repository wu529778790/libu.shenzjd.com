import { useState, useEffect } from 'react';
import { Event } from '@/types';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 从localStorage加载事件
  useEffect(() => {
    const loadEvents = () => {
      try {
        setLoading(true);
        const storedEvents = localStorage.getItem('giftlist_events');
        if (storedEvents) {
          const parsedEvents = JSON.parse(storedEvents);
          setEvents(parsedEvents);
        }
      } catch (err) {
        console.error('加载事件失败:', err);
        setError('加载事件失败');
      } finally {
        setLoading(false);
      }
    };

    loadEvents();

    // 监听storage变化
    const handleStorageChange = () => {
      loadEvents();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 添加事件
  const addEvent = (event: Event) => {
    try {
      const newEvents = [...events, event];
      localStorage.setItem('giftlist_events', JSON.stringify(newEvents));
      setEvents(newEvents);
    } catch (err) {
      console.error('添加事件失败:', err);
      setError('添加事件失败');
    }
  };

  // 更新事件
  const updateEvent = (updatedEvent: Event) => {
    try {
      const newEvents = events.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
      localStorage.setItem('giftlist_events', JSON.stringify(newEvents));
      setEvents(newEvents);
    } catch (err) {
      console.error('更新事件失败:', err);
      setError('更新事件失败');
    }
  };

  // 删除事件
  const removeEvent = (eventId: string) => {
    try {
      const newEvents = events.filter(event => event.id !== eventId);
      localStorage.setItem('giftlist_events', JSON.stringify(newEvents));
      setEvents(newEvents);
    } catch (err) {
      console.error('删除事件失败:', err);
      setError('删除事件失败');
    }
  };

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    removeEvent,
  };
};