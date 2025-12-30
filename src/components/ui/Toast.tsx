import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

// 全局状态管理
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

    // 自动移除
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

// Toast 组件
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  React.useEffect(() => {
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
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastState }> = ({ toast }) => {
  const bgColor = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }[toast.type];

  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }[toast.type];

  return (
    <div className={`border ${bgColor} px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-md animate-slide-in-right`}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button
        onClick={() => ToastManager.getInstance().dismiss(toast.id)}
        className="text-current opacity-70 hover:opacity-100 font-bold px-1"
      >
        ✕
      </button>
    </div>
  );
};

// 快捷方法
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
