import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { GiftType, GiftData } from "@/types";
import { useAppStore } from "@/store/appStore";
import MainLayout from "@/components/layout/MainLayout";
import GiftEntryForm from "@/components/business/GiftEntryForm";
import { amountToChinese, formatCurrency } from "@/utils/format";
import { BackupService, ExcelImportResult } from "@/lib/backup";
import { exportPDF } from "@/lib/pdfExport";
import ImportExcelModal from "@/components/business/ImportExcelModal";
import { speakError, speakText, isVoiceSupported } from "@/lib/voice";
import { useToast } from "@/components/ui/Toast";
import { saveGuestScreenData } from "@/lib/storage";
import { useGiftStats } from "@/hooks/useGiftStats";
import { PAGINATION } from "@/constants/pagination";
import Button from "@/components/ui/Button";

// 导入拆分的组件
import MainHeader from "./components/MainHeader";
import GiftBookDisplay from "./components/GiftBookDisplay";
import ConfirmModal from "./components/ConfirmModal";
import GiftDetailModal from "./components/GiftDetailModal";
import SearchFilterModal from "./components/SearchFilterModal";

interface GiftWithRecord {
  record: { id: string };
  data: GiftData | null;
}

interface ConfirmConfig {
  title: string;
  message: string;
  onConfirm: () => void;
}

export default function MainPage() {
  const navigate = useNavigate();
  const { state, actions } = useAppStore();
  const { error: showErrorToast, success: showSuccessToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftWithRecord | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | GiftType>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showSearchModal, setShowSearchModal] = useState(false);

  // 检查是否有会话，如果没有则返回首页
  useEffect(() => {
    if (!state.currentEvent) {
      navigate("/", { replace: true });
    }
  }, [state.currentEvent, navigate]);

  // 当礼物数据变化时，同步到副屏
  useEffect(() => {
    syncDataToGuestScreen();
  }, [state.gifts, state.currentEvent?.id]);

  if (!state.currentEvent) {
    return null;
  }

  // 统计相关 - 使用自定义 Hook
  const { validGifts, totalAmount, totalGivers } = useGiftStats(state.gifts);

  // 重置页码当数据变化时
  useEffect(() => {
    setCurrentPage(1);
  }, [state.gifts]);

  // 主界面显示的数据（不受搜索筛选影响，按时间倒序）- 使用 useMemo 优化
  const displayGifts = useMemo(
    () =>
      state.gifts
        .filter((g) => g.data && !g.data.abolished)
        .sort((a, b) => {
          if (!a.data || !b.data) return 0;
          return new Date(b.data.timestamp).getTime() - new Date(a.data.timestamp).getTime();
        })
        .slice(
          (currentPage - 1) * PAGINATION.ITEMS_PER_PAGE,
          currentPage * PAGINATION.ITEMS_PER_PAGE
        ),
    [state.gifts, currentPage]
  );

  // 总页数 - 使用 useMemo 优化
  const totalValidCount = useMemo(
    () => state.gifts.filter((g) => g.data && !g.data.abolished).length,
    [state.gifts]
  );
  const totalPages = useMemo(
    () => Math.ceil(totalValidCount / PAGINATION.ITEMS_PER_PAGE) || 1,
    [totalValidCount]
  );

  const pageSubtotal = useMemo(
    () =>
      displayGifts
        .filter((g) => g.data && !g.data.abolished)
        .reduce((sum, g) => sum + g.data!.amount, 0),
    [displayGifts]
  );
  const pageGivers = displayGifts.filter((g) => g.data && !g.data.abolished).length;

  // 模态框内使用的筛选数据（不影响主界面）
  const modalFilteredGifts = state.gifts
    .filter((g) => {
      if (!g.data || g.data.abolished) return false;

      // 类型筛选
      if (filterType !== "all" && g.data.type !== filterType) return false;

      // 搜索筛选（姓名或备注）
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = g.data.name.toLowerCase().includes(searchLower);
        const remarkMatch = g.data.remark?.toLowerCase().includes(searchLower) || false;
        if (!nameMatch && !remarkMatch) return false;
      }

      return true;
    })
    .map((g) => g.data!)
    .sort((a, b) => {
      // 按时间排序
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

  // 处理礼金录入
  const handleGiftSubmit = async (giftData: {
    name: string;
    amount: number;
    type: GiftType;
    remark?: string;
  }) => {
    const success = await actions.addGift({
      ...giftData,
      timestamp: new Date().toISOString(),
      abolished: false,
    });

    if (success) {
      syncDataToGuestScreen();
    } else {
      if (isVoiceSupported()) {
        speakError();
      }
    }
  };

  // 同步数据到副屏 - 使用 useCallback 优化
  const syncDataToGuestScreen = useCallback(() => {
    if (state.currentEvent) {
      const sortedGifts = validGifts.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      saveGuestScreenData({
        eventName: state.currentEvent.name,
        theme:
          state.currentEvent.theme === "festive"
            ? "theme-festive"
            : "theme-solemn",
        gifts: sortedGifts,
      });

      // 使用 BroadcastChannel 通知副屏（如果浏览器支持）
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const bc = new BroadcastChannel("guest_screen_sync");
          bc.postMessage({ type: "update" });
          bc.close();
        } catch (e) {
          console.warn("BroadcastChannel not available:", e);
        }
      }
    }
  }, [state.currentEvent, validGifts]);

  // 返回首页（清除会话）
  const handleGoHome = () => {
    setConfirmConfig({
      title: "返回首页",
      message: "返回首页将清除当前会话，需要重新选择事件。确定吗？",
      onConfirm: () => {
        actions.clearSession();
        navigate("/", { replace: true });
      },
    });
    setShowConfirmModal(true);
  };

  // 打开详情弹窗 - 使用 useCallback 优化
  const openDetailModal = useCallback((gift: GiftWithRecord) => {
    setSelectedGift(gift);
    setShowDetailModal(true);
  }, []);

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedGift(null);
  };

  // 保存编辑 - 使用 useCallback 优化
  const saveEdit = useCallback(
    async (giftId: string, updatedData: GiftData): Promise<boolean> => {
      try {
        const success = await actions.updateGift(giftId, updatedData);
        if (success) {
          // 更新选中的礼物数据
          if (selectedGift) {
            setSelectedGift({
              ...selectedGift,
              data: updatedData,
            });
          }
          // 同步数据到副屏
          syncDataToGuestScreen();

          // 语音播报修改成功
          if (isVoiceSupported()) {
            speakText(
              `修改成功，${updatedData.name}，${amountToChinese(
                updatedData.amount
              )}元，${updatedData.type}`
            );
          }
          showSuccessToast("修改成功");
          return true;
        } else {
          showErrorToast("更新失败，请重试");
          if (isVoiceSupported()) {
            speakError();
          }
          return false;
        }
      } catch (error) {
        showErrorToast("更新失败，请重试");
        if (isVoiceSupported()) {
          speakError();
        }
        return false;
      }
    },
    [actions, selectedGift, syncDataToGuestScreen, showSuccessToast, showErrorToast]
  );

  // 删除记录 - 使用 useCallback 优化
  const deleteGift = useCallback(
    async (giftId: string): Promise<boolean> => {
      try {
        const success = await actions.deleteGift(giftId);
        if (success) {
          // 语音播报删除成功
          if (isVoiceSupported() && selectedGift?.data) {
            speakText(`已删除 ${selectedGift.data.name} 的记录`);
          }
          showSuccessToast("删除成功");
          return true;
        } else {
          showErrorToast("删除失败，请重试");
          if (isVoiceSupported()) {
            speakError();
          }
          return false;
        }
      } catch (error) {
        showErrorToast("删除失败，请重试");
        if (isVoiceSupported()) {
          speakError();
        }
        return false;
      }
    },
    [actions, selectedGift, showSuccessToast, showErrorToast]
  );

  // 导出当前事件数据（Excel） - 使用 useCallback 优化
  const exportData = useCallback(() => {
    try {
      if (validGifts.length === 0) {
        showErrorToast("暂无礼金记录可导出");
        return;
      }

      if (!state.currentEvent) {
        showErrorToast("未选择事件");
        return;
      }

      BackupService.exportExcel(
        state.currentEvent.name,
        validGifts,
        state.currentEvent
      );
      showSuccessToast("导出成功");
    } catch (error) {
      showErrorToast("导出Excel失败：" + (error instanceof Error ? error.message : "未知错误"));
    }
  }, [validGifts, state.currentEvent, showSuccessToast, showErrorToast]);

  // 导出 PDF（打印所有数据） - 使用 useCallback 优化
  const handleExportPDF = useCallback(() => {
    if (!state.currentEvent) {
      showErrorToast("未选择事件");
      return;
    }

    try {
      exportPDF(state.currentEvent, validGifts);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "打印失败");
    }
  }, [validGifts, state.currentEvent, showErrorToast]);

  // 打开副屏
  const openGuestScreen = () => {
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.split("#")[0];
    window.open(
      `${baseUrl}#/guest-screen`,
      "_blank",
      "width=1920,height=1080,left=0,top=0,fullscreen=yes,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  // 导入Excel成功
  const handleImportSuccess = (result: ExcelImportResult) => {
    if (state.currentEvent) {
      actions.loadGifts(state.currentEvent.id);
    }

    let msg = `成功导入 ${result.gifts} 条礼金记录`;
    if (result.events > 0) {
      msg += `、${result.events} 个事件`;
    }
    if (result.conflicts > 0) {
      msg += `，跳过 ${result.skipped} 条重复`;
    }
    setImportSuccessMsg(msg);

    setTimeout(() => {
      setImportSuccessMsg(null);
    }, 5000);
  };

  return (
    <MainLayout theme={state.currentEvent.theme}>
      <div className="space-y-4">
        {/* 头部 */}
        <MainHeader
          event={state.currentEvent}
          onGoHome={handleGoHome}
          onExportPDF={handleExportPDF}
          onImport={() => setShowImportModal(true)}
          onExportExcel={exportData}
          onOpenGuestScreen={openGuestScreen}
          onOpenSearch={() => setShowSearchModal(true)}
        />

        {/* 导入成功提示 */}
        {importSuccessMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 text-green-800">
              <span>✅</span>
              <span className="text-sm">{importSuccessMsg}</span>
            </div>
            <button
              onClick={() => setImportSuccessMsg(null)}
              className="text-green-600 hover:text-green-800 font-bold"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：录入表单 + 总统计 */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-4 text-center border-b pb-2 themed-header">
                礼金录入
              </h2>

              <GiftEntryForm
                onSubmit={handleGiftSubmit}
                loading={state.loading.submitting}
              />

              {/* 总统计 */}
              <div className="mt-4 pt-4 border-t themed-border grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/30 border themed-border">
                  <span className="text-gray-500">总金额</span>
                  <span className="font-bold themed-text">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/30 border themed-border">
                  <span className="text-gray-500">总人数</span>
                  <span className="font-bold themed-text">{totalGivers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：礼簿展示 + 页码统计 */}
          <div className="lg:col-span-2">
            <div className="gift-book-frame print-area">
              {/* 页码导航和本页统计 */}
              <div className="flex justify-between items-center mb-3 pb-3 border-b themed-border no-print text-sm">
                <div className="flex items-center gap-3 font-bold themed-text">
                  <span>本页: {formatCurrency(pageSubtotal)}</span>
                  <span className="text-gray-400">|</span>
                  <span>人数: {pageGivers}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="primary"
                    className="w-7 h-7 rounded !p-0"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    ←
                  </Button>
                  <span className="font-bold text-gray-700 px-1">
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="primary"
                    className="w-7 h-7 rounded !p-0"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    →
                  </Button>
                </div>
              </div>

              {/* 礼簿展示区域 - 列式布局 */}
              <div className="gift-book-columns-wrapper">
                <GiftBookDisplay
                  displayGifts={displayGifts}
                  onGiftClick={openDetailModal}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 确认模态框 */}
        <ConfirmModal
          isOpen={showConfirmModal}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={() => {
            confirmConfig.onConfirm();
            setShowConfirmModal(false);
          }}
          onCancel={() => setShowConfirmModal(false)}
        />

        {/* 详情弹窗 */}
        <GiftDetailModal
          isOpen={showDetailModal}
          gift={selectedGift}
          onClose={closeDetailModal}
          onEdit={saveEdit}
          onDelete={deleteGift}
        />

        {/* 导入Excel模态框 */}
        <ImportExcelModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={handleImportSuccess}
          currentEvent={state.currentEvent}
          allEvents={state.events}
        />

        {/* 搜索筛选模态框 */}
        <SearchFilterModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterType={filterType}
          setFilterType={setFilterType}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          filteredCount={modalFilteredGifts.length}
          totalCount={allValidGifts.length}
          theme={state.currentEvent.theme}
          filteredGifts={modalFilteredGifts}
        />
      </div>
    </MainLayout>
  );
}