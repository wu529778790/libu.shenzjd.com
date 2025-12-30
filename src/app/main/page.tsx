import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GiftType } from "@/types";
import { useAppStore } from "@/store/appStore";
import MainLayout from "@/components/layout/MainLayout";
import GiftEntryForm from "@/components/business/GiftEntryForm";
import { formatDateTime, amountToChinese, formatCurrency } from "@/utils/format";
import { BackupService, ExcelImportResult } from "@/lib/backup";
import ImportExcelModal from "@/components/business/ImportExcelModal";
import { speakError, speakText, isVoiceSupported } from "@/lib/voice";
import Button from "@/components/ui/Button";
import { error, success, warning } from "@/components/ui/Toast";

// 导入拆分的组件
import MainHeader from "./components/MainHeader";
import GiftBookDisplay from "./components/GiftBookDisplay";
import ConfirmModal from "./components/ConfirmModal";
import GiftDetailModal from "./components/GiftDetailModal";

export default function MainPage() {
  const navigate = useNavigate();
  const { state, actions } = useAppStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
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

  // 备份提醒状态
  const [showBackupReminder, setShowBackupReminder] = useState(false);
  const [lastBackupReminder, setLastBackupReminder] = useState<number>(0);

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

  // 备份提醒逻辑：每10条新记录或30分钟后提醒一次
  useEffect(() => {
    if (!state.currentEvent || state.gifts.length === 0) return;

    const now = Date.now();
    const lastReminder = lastBackupReminder || 0;
    const timeSinceLastReminder = now - lastReminder;

    // 检查是否需要提醒：30分钟 = 30 * 60 * 1000 = 1,800,000ms
    const shouldTimeReminder = timeSinceLastReminder > 1800000;

    // 检查记录数量：每10条记录提醒一次
    const validGiftCount = state.gifts.filter(g => g.data && !g.data.abolished).length;
    const shouldCountReminder = validGiftCount > 0 && validGiftCount % 10 === 0;

    if ((shouldTimeReminder || shouldCountReminder) && !showBackupReminder) {
      setShowBackupReminder(true);
      setLastBackupReminder(now);
    }
  }, [state.gifts, state.currentEvent]);

  if (!state.currentEvent) {
    return null;
  }

  // 过滤和排序相关
  const filteredGifts = state.gifts
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
    .sort((a, b) => {
      if (!a.data || !b.data) return 0;
      // 按时间排序
      const timeA = new Date(a.data.timestamp).getTime();
      const timeB = new Date(b.data.timestamp).getTime();
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });

  // 分页相关
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(filteredGifts.length / ITEMS_PER_PAGE) || 1;

  // 重置页码当筛选条件改变时
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, sortOrder]);

  const displayGifts = filteredGifts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 统计相关（基于过滤后的数据）
  const validGifts = filteredGifts
    .filter((g) => g.data && !g.data.abolished)
    .map((g) => g.data!);
  const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
  const totalGivers = validGifts.length;
  const pageSubtotal = displayGifts
    .filter((g) => g.data && !g.data.abolished)
    .reduce((sum, g) => sum + g.data!.amount, 0);
  const pageGivers = displayGifts.filter((g) => g.data && !g.data.abolished).length;

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

  // 同步数据到副屏
  const syncDataToGuestScreen = () => {
    if (state.currentEvent) {
      const validGifts = state.gifts
        .filter((g) => g.data && !g.data.abolished)
        .map((g) => g.data!)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      const syncData = {
        eventName: state.currentEvent.name,
        theme:
          state.currentEvent.theme === "festive"
            ? "theme-festive"
            : "theme-solemn",
        gifts: validGifts,
      };

      localStorage.setItem("guest_screen_data", JSON.stringify(syncData));

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
  };

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

  // 打开详情弹窗
  const openDetailModal = (gift: any) => {
    setSelectedGift(gift);
    setShowDetailModal(true);
  };

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedGift(null);
  };

  // 保存编辑
  const saveEdit = async (giftId: string, updatedData: any) => {
    const success = await actions.updateGift(giftId, updatedData);
    if (success) {
      // 更新选中的礼物数据
      setSelectedGift({
        ...selectedGift,
        data: updatedData,
      });
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
      return true;
    } else {
      error("更新失败，请重试");
      if (isVoiceSupported()) {
        speakError();
      }
      return false;
    }
  };

  // 删除记录
  const deleteGift = async (giftId: string) => {
    const success = await actions.deleteGift(giftId);
    if (success) {
      // 语音播报删除成功
      if (isVoiceSupported()) {
        speakText(`已删除 ${selectedGift.data.name} 的记录`);
      }
      return true;
    } else {
      error("删除失败，请重试");
      if (isVoiceSupported()) {
        speakError();
      }
      return false;
    }
  };

  // 导出当前事件数据（Excel）
  const exportData = () => {
    try {
      const validGifts = state.gifts
        .filter((g) => g.data && !g.data.abolished)
        .map((g) => g.data!);

      if (validGifts.length === 0) {
        warning("暂无礼金记录可导出");
        return;
      }

      BackupService.exportExcel(
        state.currentEvent!.name,
        validGifts,
        state.currentEvent!
      );
      success("Excel导出成功");
    } catch (err) {
      error("导出Excel失败：" + (err as Error).message);
    }
  };

  // 导出 PDF（打印所有数据）
  const exportPDF = () => {
    const validGifts = state.gifts
      .filter((g) => g.data && !g.data.abolished)
      .map((g) => g.data!);

    if (validGifts.length === 0) {
      warning("暂无礼金记录可打印");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      error("无法打开打印窗口，请检查浏览器设置");
      return;
    }

    const isFestive = state.currentEvent!.theme === "festive";
    const sortedGifts = validGifts.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const giftColumnsHTML = sortedGifts
      .map((gift) => {
        const name =
          gift.name.length === 2
            ? `${gift.name[0]}　${gift.name[1]}`
            : gift.name;
        const amountChinese = amountToChinese(gift.amount);
        return `
        <div class="print-gift-column">
          <div class="book-cell name-cell">${name}</div>
          <div class="book-cell amount-cell">${amountChinese}</div>
        </div>
      `;
      })
      .join("");

    const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
    const typeStats = validGifts.reduce((acc, g) => {
      acc[g.type] = (acc[g.type] || 0) + g.amount;
      return acc;
    }, {} as Record<string, number>);
    const statsHTML = Object.entries(typeStats)
      .map(([type, amount]) => `<span class="type-stat"><em>${type}</em><b>¥${amount.toFixed(2)}</b></span>`)
      .join("");

    const themeColors = {
      festive: {
        primary: "#d9534f",
        secondary: "#c9302c",
        border: "#f8d7da",
        text: "#721c24",
        bg: "#fff5f5",
        stats: "#d9534f",
      },
      solemn: {
        primary: "#343a40",
        secondary: "#495057",
        border: "#e9ecef",
        text: "#212529",
        bg: "#f8f9fa",
        stats: "#495057",
      },
    };

    const colors = themeColors[isFestive ? "festive" : "solemn"];

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>礼金簿打印 - ${state.currentEvent!.name}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; padding: 0; font-family: "KaiTi", "楷体", serif; background: ${colors.bg}; }
          .print-container { width: 100%; height: 100%; padding: 5mm; box-sizing: border-box; }
          .print-header { margin-bottom: 8mm; padding-bottom: 3mm; border-bottom: 3px solid ${colors.primary}; background: linear-gradient(to right, ${colors.bg}, white); padding: 3mm 2mm; border-radius: 4px; }
          .print-header h1 { font-size: 26pt; margin: 0 0 5mm 0; font-weight: bold; text-align: center; color: ${colors.primary}; letter-spacing: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
          .print-header .info { display: flex; justify-content: space-between; font-size: 10pt; color: ${colors.secondary}; margin-bottom: 3mm; font-weight: 500; }
          .print-header .stats { display: flex; justify-content: center; gap: 8mm; margin-top: 2mm; font-size: 10pt; flex-wrap: wrap; align-items: center; }
          .print-header .stats .type-stat { display: inline-flex; flex-direction: column; align-items: center; white-space: nowrap; color: ${colors.stats}; background: white; padding: 1mm 2mm; border-radius: 3px; border: 1px solid ${colors.border}; min-width: 18mm; }
          .print-header .stats .type-stat em { font-style: normal; font-size: 8pt; margin-bottom: 0.5mm; opacity: 0.8; }
          .print-header .stats .type-stat b { font-weight: bold; font-size: 11pt; }
          .print-gift-columns { display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.5mm; grid-auto-rows: minmax(38mm, auto); margin-bottom: 10mm; }
          .print-gift-column { display: grid; grid-template-rows: 1fr 1.2fr; border: 2px solid ${colors.border}; border-radius: 4px; overflow: hidden; page-break-inside: avoid; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .book-cell { display: grid; place-items: center; writing-mode: vertical-lr; text-orientation: mixed; font-weight: bold; padding: 10px 0; overflow: hidden; text-align: center; line-height: 1.2; }
          .name-cell { border-bottom: 2px solid ${colors.border}; font-size: 19pt; color: ${colors.primary}; background: white; }
          .amount-cell { font-size: 17pt; color: ${colors.primary}; background: white; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-header">
            <h1>${state.currentEvent!.name}</h1>
            <div class="info">
              <span>时间: ${formatDateTime(state.currentEvent!.startDateTime)} ~ ${formatDateTime(state.currentEvent!.endDateTime)}</span>
              ${state.currentEvent!.recorder ? `<span>记账人: ${state.currentEvent!.recorder}</span>` : ""}
            </div>
            <div class="stats">
              <span class="type-stat"><em>总金额</em><b>¥${totalAmount.toFixed(2)}</b></span>
              <span class="type-stat"><em>总人数</em><b>${validGifts.length}人</b></span>
              ${statsHTML}
            </div>
          </div>
          <div class="print-gift-columns">${giftColumnsHTML}</div>
        </div>
        <script>
          setTimeout(() => { window.print(); setTimeout(() => { window.close(); }, 500); }, 100);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

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
          onExportPDF={exportPDF}
          onImport={() => setShowImportModal(true)}
          onExportExcel={exportData}
          onOpenGuestScreen={openGuestScreen}
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

        {/* 备份提醒 */}
        {showBackupReminder && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 text-yellow-800 flex-1">
              <span>💾</span>
              <span className="text-sm">
                <strong>数据备份提醒：</strong>您已录入 {state.gifts.filter(g => g.data && !g.data.abolished).length} 条礼金记录，
                建议及时导出Excel备份，防止数据丢失！
              </span>
            </div>
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => {
                  exportData();
                  setShowBackupReminder(false);
                }}
                className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs font-bold"
              >
                立即备份
              </button>
              <button
                onClick={() => setShowBackupReminder(false)}
                className="text-yellow-600 hover:text-yellow-800 font-bold px-1"
              >
                ×
              </button>
            </div>
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
              {/* 搜索和筛选工具栏 - 只在有数据时显示 */}
              {state.gifts.length > 0 && (
                <div className="mb-3 p-4 bg-gray-50 rounded-lg border themed-border no-print">
                  {/* 第一行：搜索框 */}
                  <div className="flex gap-2 items-center mb-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="🔍 搜索姓名或备注..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm themed-ring"
                      />
                    </div>
                    {(searchTerm || filterType !== "all") && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setFilterType("all");
                          setSortOrder("desc");
                        }}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
                      >
                        清空
                      </button>
                    )}
                  </div>

                  {/* 第二行：筛选和排序 */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="px-3 py-2 border rounded-lg text-sm themed-ring flex-1 min-w-[140px]"
                    >
                      <option value="all">📋 全部类型</option>
                      <option value="现金">💵 现金</option>
                      <option value="微信">💚 微信</option>
                      <option value="支付宝">💙 支付宝</option>
                      <option value="其他">📦 其他</option>
                    </select>

                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="px-3 py-2 border rounded-lg text-sm themed-ring flex-1 min-w-[120px]"
                    >
                      <option value="desc">⏰ 时间倒序</option>
                      <option value="asc">⏰ 时间正序</option>
                    </select>
                  </div>

                  {/* 筛选结果统计 */}
                  {searchTerm || filterType !== "all" ? (
                    <div className="mt-2 text-xs text-gray-600 bg-white/50 p-2 rounded">
                      📊 筛选结果: <strong>{filteredGifts.length}</strong> 条记录
                      {searchTerm && <span className="ml-2">关键词: <strong>\"{searchTerm}\"</strong></span>}
                      {filterType !== "all" && <span className="ml-2">类型: <strong>{filterType}</strong></span>}
                    </div>
                  ) : null}
                </div>
              )}

              {/* 页码导航和本页统计 */}
              <div className="flex justify-between items-center mb-3 pb-3 border-b themed-border no-print text-sm">
                <div className="flex items-center gap-3 font-bold themed-text">
                  <span>本页: {formatCurrency(pageSubtotal)}</span>
                  <span className="text-gray-400">|</span>
                  <span>人数: {pageGivers}</span>
                  {searchTerm || filterType !== "all" ? (
                    <span className="text-xs text-gray-500 ml-2">
                      (总计: {totalGivers}人, ¥{totalAmount.toFixed(2)})
                    </span>
                  ) : null}
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

              <GiftBookDisplay
                displayGifts={displayGifts}
                onGiftClick={openDetailModal}
              />
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
      </div>
    </MainLayout>
  );
}
