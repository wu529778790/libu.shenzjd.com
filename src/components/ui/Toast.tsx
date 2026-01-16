import React, { useEffect, useState, createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration ?? 3000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const bgColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  return (
    <div
      className={`${bgColors[toast.type]} border rounded-lg p-3 flex items-center justify-between animate-fade-in shadow-md min-w-[300px] max-w-[500px]`}
    >
      <div className="flex items-center gap-2">
        <span>{icons[toast.type]}</span>
        <span className="text-sm">{toast.message}</span>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="text-gray-600 hover:text-gray-800 font-bold ml-4"
      >
        ×
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Toast 管理器 Hook
let toastIdCounter = 0;

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // 如果没有 Provider，返回一个默认实现（使用单例 Toast 作为后备）
    const manager = ToastManager.getInstance();
    return {
      showToast: () => '',
      removeToast: () => {},
      success: (msg: string, duration?: number) => {
        manager.show(msg, 'success', duration);
        return '';
      },
      error: (msg: string, duration?: number) => {
        manager.show(msg, 'error', duration);
        return '';
      },
      info: (msg: string, duration?: number) => {
        manager.show(msg, 'info', duration);
        return '';
      },
      warning: (msg: string, duration?: number) => {
        manager.show(msg, 'warning', duration);
        return '';
      },
    };
  }
  return context;
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string,
    type: ToastType = 'info',
    duration?: number
  ) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message: string, duration?: number) =>
    showToast(message, 'success', duration);
  const error = (message: string, duration?: number) =>
    showToast(message, 'error', duration);
  const info = (message: string, duration?: number) =>
    showToast(message, 'info', duration);
  const warning = (message: string, duration?: number) =>
    showToast(message, 'warning', duration);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}

export { ToastContext };

// 单例 Toast Manager（兼容远程代码）
interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

class ToastManager {
  private static instance: ToastManager;
  private counter = 0;
  private listeners: Array<(toasts: ToastState[]) => void> = [];
  private toasts: ToastState[] = [];

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(message: string, type: ToastType = 'info', duration = 3000): number {
    const id = ++this.counter;
    const toast: ToastState = { id, message, type, duration };

    this.toasts = [...this.toasts, toast];
    this.notify();

    setTimeout(() => {
      this.dismiss(id);
    }, duration);

    return id;
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  subscribe(listener: (toasts: ToastState[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }
}

// 单例 Toast 组件（兼容远程代码）
export const ToastContainerSingleton: React.FC = () => {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    const manager = ToastManager.getInstance();
    return manager.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`border ${
            toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            toast.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          } px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md animate-slide-in-right`}
        >
          <span className="text-lg">
            {toast.type === 'success' ? '✅' :
             toast.type === 'error' ? '❌' :
             toast.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button
            onClick={() => ToastManager.getInstance().dismiss(toast.id)}
            className="text-current opacity-70 hover:opacity-100 font-bold px-1"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

// 快捷方法（兼容远程代码）
export const showToast = (message: string, type: ToastType = 'info', duration?: number): number => {
  return ToastManager.getInstance().show(message, type, duration);
};

export const success = (message: string, duration?: number): number =>
  showToast(message, 'success', duration);

export const error = (message: string, duration?: number): number =>
  showToast(message, 'error', duration);

export const warning = (message: string, duration?: number): number =>
  showToast(message, 'warning', duration);

export const info = (message: string, duration?: number): number =>
  showToast(message, 'info', duration);
