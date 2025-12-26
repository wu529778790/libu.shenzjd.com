import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { ExcelImportResult } from '@/lib/backup';
import PageLayout from '@/components/layout/PageLayout';
import FormLayout from '@/components/layout/FormLayout';
import Button from '@/components/ui/Button';
import EventSelector from '@/components/business/EventSelector';
import { formatDate } from '@/utils/format';
import ImportExcelModal from '@/components/business/ImportExcelModal';

export default function Home() {
  const navigate = useNavigate();
  const { state, actions } = useAppStore();
  const [showSessionChoice, setShowSessionChoice] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [currentSessionEvent, setCurrentSessionEvent] = useState<any>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // 初始化时检查会话状态
  useEffect(() => {
    // 等待事件加载完成
    if (state.loading.events) {
      return;
    }

    // 检查当前会话
    const session = sessionStorage.getItem('currentEvent');
    if (session) {
      try {
        const { event: currentEvent } = JSON.parse(session);
        setShowSessionChoice(true);
        setCurrentSessionEvent(currentEvent);
        return;
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    }

    // 没有会话但有事件 → 显示事件选择界面
    if (state.events.length > 0) {
      setSelectedEvent(state.events[0]);
    }
  }, [state.events, state.loading.events, navigate]);

  // 处理选择事件并进入（无需密码）
  const handleSelectEvent = (event: any) => {
    actions.saveSession(event);
    navigate('/main', { replace: true });
  };

  // 处理继续使用当前会话
  const handleContinueSession = () => {
    navigate('/main');
  };

  // 处理切换到其他事件
  const handleSwitchFromSession = () => {
    actions.clearSession();
    setShowSessionChoice(false);
  };

  // 处理切换到特定事件
  const handleSwitchToSpecificEvent = (targetEvent: any) => {
    actions.saveSession(targetEvent);
    navigate('/main', { replace: true });
  };

  // 处理创建新事件
  const handleCreateNewEvent = () => {
    navigate('/setup');
  };

  // 处理导入Excel成功
  const handleImportSuccess = (result: ExcelImportResult) => {
    let msg = `成功导入 ${result.gifts} 条礼金记录`;
    if (result.events > 0) {
      msg += `、${result.events} 个事件`;
    }
    if (result.conflicts > 0) {
      msg += `，跳过 ${result.skipped} 条重复`;
    }
    setImportSuccessMsg(result.message || msg);
    setShowImportModal(false);
    actions.loadEvents();

    // 如果有导入事件，3秒后自动进入
    if (result.events > 0) {
      setTimeout(() => {
        actions.loadEvents().then(() => {
          if (state.events.length > 0) {
            handleSelectEvent(state.events[0]);
          }
        });
      }, 3000);
    }
  };

  // 监听事件列表变化，自动进入
  useEffect(() => {
    if (importSuccessMsg && state.events.length > 0) {
      setTimeout(() => {
        setImportSuccessMsg(null);
        handleSelectEvent(state.events[0]);
      }, 1000);
    }
  }, [state.events, importSuccessMsg]);

  // 会话选择界面
  if (showSessionChoice) {
    return (
      <>
        <PageLayout title="电子礼簿系统" subtitle="检测到当前会话">
          <FormLayout>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="font-bold text-blue-900 mb-1 text-sm">
                当前事件：
              </div>
              <div className="text-sm text-blue-800 font-semibold">
                {currentSessionEvent?.name}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {currentSessionEvent &&
                  `${formatDate(
                    currentSessionEvent.startDateTime
                  )} ~ ${formatDate(currentSessionEvent.endDateTime)}`}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full p-3 rounded-lg font-bold"
                onClick={handleContinueSession}
              >
                继续使用当前事件
              </Button>

              <Button
                variant="secondary"
                className="w-full p-3 rounded-lg font-bold"
                onClick={handleSwitchFromSession}
              >
                切换到其他事件
              </Button>

              {state.events.length > 1 && (
                <div className="pt-3 border-t themed-border">
                  <p className="text-sm text-gray-600 mb-2">
                    快速切换：
                  </p>
                  <div className="space-y-2">
                    {state.events.map(
                      (ev: any) =>
                        ev.id !== currentSessionEvent?.id && (
                          <Button
                            key={ev.id}
                            variant="secondary"
                            className="w-full text-left px-3 py-2 text-sm !bg-gray-100 !text-gray-800 !border-transparent hover:!bg-gray-200"
                            onClick={() => handleSwitchToSpecificEvent(ev)}
                          >
                            {ev.name}
                          </Button>
                        )
                    )}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t themed-border space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-sm p-2 rounded"
                    onClick={handleCreateNewEvent}
                  >
                    ✨ 创建新事件
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-sm p-2 rounded"
                    onClick={() => setShowImportModal(true)}
                  >
                    📥 导入数据
                  </Button>
                </div>
                <Button
                  variant="danger"
                  className="w-full p-2 rounded text-sm"
                  onClick={() => {
                    actions.clearSession();
                    navigate('/', { replace: true });
                  }}
                >
                  🔄 返回首页重新选择
                </Button>
              </div>
            </div>
          </FormLayout>
        </PageLayout>

        <ImportExcelModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={handleImportSuccess}
          currentEvent={selectedEvent}
          allEvents={state.events}
        />
      </>
    );
  }

  // 事件选择界面
  return (
    <>
      <PageLayout
        title="电子礼簿系统"
        subtitle={state.events.length > 0 ? "请选择事件" : "还没有事件，请选择操作"}
      >
        <FormLayout>
          {/* 导入成功提示 */}
          {importSuccessMsg && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2 text-green-800 text-sm">
                <span>✅</span>
                <span>{importSuccessMsg}</span>
              </div>
              <button
                onClick={() => setImportSuccessMsg(null)}
                className="text-green-600 hover:text-green-800 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* 有事件时显示事件选择器 */}
          {state.events.length > 0 ? (
            <>
              <EventSelector
                events={state.events}
                onSelect={handleSelectEvent}
                onCreateNew={handleCreateNewEvent}
                title="选择活动"
                subtitle="请选择要管理的活动"
              />

              <div className="pt-4 border-t themed-border space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 text-sm p-2 rounded"
                    onClick={handleCreateNewEvent}
                  >
                    ✨ 创建新事件
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1 text-sm p-2 rounded"
                    onClick={() => setShowImportModal(true)}
                  >
                    📥 导入数据
                  </Button>
                </div>
                <Button
                  variant="danger"
                  className="w-full text-sm p-2 rounded"
                  onClick={() => {
                    if (confirm("确定要删除所有事件吗？礼金记录会保留但无法访问。")) {
                      localStorage.removeItem('giftlist_events');
                      window.location.reload();
                    }
                  }}
                >
                  🗑️ 清除事件
                </Button>
              </div>
            </>
          ) : (
            // 没有事件时显示空状态
            <>
              <div className="space-y-3">
                <div className="text-center text-gray-600 mb-4">
                  <p className="text-sm">欢迎使用电子礼簿系统</p>
                  <p className="text-xs mt-1">您可以创建新事件或导入Excel数据</p>
                </div>

                <Button
                  variant="primary"
                  className="w-full p-3 rounded-lg font-bold"
                  onClick={handleCreateNewEvent}
                >
                  ✨ 创建新事件
                </Button>

                <Button
                  variant="secondary"
                  className="w-full p-3 rounded-lg font-bold"
                  onClick={() => setShowImportModal(true)}
                >
                  📥 导入数据
                </Button>

                <div className="pt-4 border-t themed-border">
                  <p className="text-xs text-gray-500 text-center">
                    💡 提示：支持导入Excel文件创建新事件或合并数据
                  </p>
                </div>
              </div>
            </>
          )}
        </FormLayout>
      </PageLayout>

      <ImportExcelModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
        currentEvent={selectedEvent}
        allEvents={state.events}
      />
    </>
  );
}