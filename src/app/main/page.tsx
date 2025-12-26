import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GiftType } from "@/types";
import { Utils } from "@/lib/utils";
import { useAppStore } from "@/store/appStore";
import MainLayout from "@/components/layout/MainLayout";
import GiftEntryForm from "@/components/business/GiftEntryForm";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/utils/format";
import { BackupService, ImportResult } from "@/lib/backup";
import ImportBackupModal from "@/components/business/ImportBackupModal";
import { speakError, speakText, isVoiceSupported } from "@/lib/voice";

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
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    amount: "",
    type: "现金" as GiftType,
    remark: "",
  });
  const [chineseAmount, setChineseAmount] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // 检查是否有会话，如果没有则返回首页
  useEffect(() => {
    if (!state.currentEvent || !state.currentPassword) {
      navigate("/", { replace: true });
    }
  }, [state.currentEvent, state.currentPassword, navigate]);

  // 当礼物数据变化时，同步到副屏
  useEffect(() => {
    syncDataToGuestScreen();
  }, [state.gifts, state.currentEvent?.id]);

  if (!state.currentEvent) {
    return null; // 或者显示加载状态
  }

  // 分页相关
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(state.gifts.length / ITEMS_PER_PAGE) || 1;
  const displayGifts = state.gifts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 统计相关
  const validGifts = state.gifts
    .filter((g) => g.data && !g.data.abolished)
    .map((g) => g.data!);
  const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
  const totalGivers = validGifts.length;
  const pageSubtotal = displayGifts
    .filter((g) => g.data && !g.data.abolished)
    .reduce((sum, g) => sum + g.data!.amount, 0);

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
      // 同步数据到副屏
      syncDataToGuestScreen();

      // 语音播报（在GiftEntryForm中已处理，这里可选额外提示）
      if (isVoiceSupported()) {
        // 可以在这里添加额外的播报逻辑
      }
    } else {
      // 保存失败时播报错误
      if (isVoiceSupported()) {
        speakError();
      }
    }
  };

  // 同步数据到副屏
  const syncDataToGuestScreen = () => {
    if (state.currentEvent) {
      // 获取所有有效的礼金数据（未作废的），按时间排序
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
    }
  };

  // 开始编辑礼物记录
  const startEditing = () => {
    if (selectedGift && selectedGift.data) {
      setIsEditing(true);
      setEditFormData({
        name: selectedGift.data.name || "",
        amount: selectedGift.data.amount.toString() || "",
        type: selectedGift.data.type || "现金",
        remark: selectedGift.data.remark || "",
      });
      // 设置初始的大写金额
      const amount = parseFloat(selectedGift.data.amount.toString());
      if (!isNaN(amount)) {
        setChineseAmount(Utils.amountToChinese(amount));
      } else {
        setChineseAmount("");
      }
    }
  };

  // 取消编辑
  const cancelEditing = () => {
    setIsEditing(false);
    setEditFormData({
      name: "",
      amount: "",
      type: "现金",
      remark: "",
    });
    setChineseAmount("");
  };

  // 处理编辑表单中的金额变化
  const handleEditAmountChange = (value: string) => {
    setEditFormData({ ...editFormData, amount: value });
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setChineseAmount(Utils.amountToChinese(num));
    } else {
      setChineseAmount("");
    }
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!selectedGift || !selectedGift.data) return;

    const amount = parseFloat(editFormData.amount);
    if (!editFormData.name.trim() || isNaN(amount) || amount <= 0) {
      alert("请填写正确的姓名和金额");
      return;
    }

    const updatedGiftData = {
      ...selectedGift.data,
      name: editFormData.name.trim(),
      amount: amount,
      type: editFormData.type,
      remark: editFormData.remark.trim() || undefined,
    };

    const success = await actions.updateGift(
      selectedGift.record.id,
      updatedGiftData
    );
    if (success) {
      // 更新选中的礼物数据
      setSelectedGift({
        ...selectedGift,
        data: updatedGiftData,
      });
      setIsEditing(false);
      // 同步数据到副屏
      syncDataToGuestScreen();

      // 语音播报修改成功
      if (isVoiceSupported()) {
        speakText(`修改成功，${editFormData.name.trim()}，${Utils.amountToChinese(amount)}元，${editFormData.type}`);
      }
    } else {
      alert("更新失败，请重试");
      // 语音播报错误
      if (isVoiceSupported()) {
        speakError();
      }
    }
  };

  // 返回首页（清除会话）
  const handleGoHome = () => {
    setConfirmConfig({
      title: "返回首页",
      message: "返回首页将清除当前会话，需要重新选择事件并输入密码。确定吗？",
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
    setIsEditing(false); // 确保退出编辑模式
    setEditFormData({
      name: "",
      amount: "",
      type: "现金",
      remark: "",
    });
    setChineseAmount("");
  };

  // 删除记录
  const handleDeleteGift = () => {
    if (!selectedGift) return;

    setConfirmConfig({
      title: "确认删除",
      message: `确定要删除 ${selectedGift.data.name} 的记录吗？金额：¥${selectedGift.data.amount}`,
      onConfirm: async () => {
        // 调用store中的删除方法
        const success = await actions.deleteGift(selectedGift.record.id);
        if (success) {
          closeDetailModal();
          // 语音播报删除成功
          if (isVoiceSupported()) {
            speakText(`已删除 ${selectedGift.data.name} 的记录`);
          }
        } else {
          alert("删除失败，请重试");
          // 语音播报错误
          if (isVoiceSupported()) {
            speakError();
          }
        }
      },
    });
    setShowConfirmModal(true);
  };

  // 导出 Excel
  const exportExcel = () => {
    try {
      // 获取所有有效礼金数据（已解密）
      const validGifts = state.gifts
        .filter((g) => g.data && !g.data.abolished)
        .map((g) => g.data!);

      if (validGifts.length === 0) {
        alert("暂无礼金记录可导出");
        return;
      }

      // 调用备份服务导出Excel
      BackupService.exportExcel(
        state.currentEvent!.name,
        validGifts,
        state.currentEvent!
      );
    } catch (error) {
      alert("导出Excel失败：" + (error as Error).message);
    }
  };

  // 导出 PDF（打印所有数据，横屏展示）
  const exportPDF = () => {
    // 获取所有有效礼金数据
    const validGifts = state.gifts
      .filter((g) => g.data && !g.data.abolished)
      .map((g) => g.data!);

    if (validGifts.length === 0) {
      alert("暂无礼金记录可打印");
      return;
    }

    // 打开新窗口进行打印
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("无法打开打印窗口，请检查浏览器设置");
      return;
    }

    // 判断主题
    const isFestive = state.currentEvent!.theme === "festive";

    // 按时间排序
    const sortedGifts = validGifts.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 生成礼簿内容HTML
    const giftColumnsHTML = sortedGifts
      .map((gift) => {
        const name =
          gift.name.length === 2
            ? `${gift.name[0]}　${gift.name[1]}`
            : gift.name;
        const amountChinese = Utils.amountToChinese(gift.amount);
        return `
        <div class="print-gift-column">
          <div class="book-cell name-cell">${name}</div>
          <div class="book-cell amount-cell">${amountChinese}</div>
        </div>
      `;
      })
      .join("");

    // 生成统计信息
    const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
    const typeStats = validGifts.reduce((acc, g) => {
      acc[g.type] = (acc[g.type] || 0) + g.amount;
      return acc;
    }, {} as Record<string, number>);
    const statsHTML = Object.entries(typeStats)
      .map(([type, amount]) => `<span>${type}: ¥${amount.toFixed(2)}</span>`)
      .join("");

    // 根据主题设置颜色
    const themeColors = {
      festive: {
        primary: "#d9534f", // 喜事红
        secondary: "#c9302c", // 深红
        border: "#f8d7da", // 浅红边框
        text: "#721c24", // 深红文字
        bg: "#fff5f5", // 浅红背景
        stats: "#d9534f", // 统计红色
      },
      solemn: {
        primary: "#343a40", // 丧事黑
        secondary: "#495057", // 深灰
        border: "#e9ecef", // 浅灰边框
        text: "#212529", // 深黑文字
        bg: "#f8f9fa", // 浅灰背景
        stats: "#495057", // 统计灰色
      },
    };

    const colors = themeColors[isFestive ? "festive" : "solemn"];

    // 生成打印HTML
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>礼金簿打印 - ${state.currentEvent!.name}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: "KaiTi", "楷体", serif;
            background: ${colors.bg};
          }

          .print-container {
            width: 100%;
            height: 100%;
            padding: 5mm;
            box-sizing: border-box;
          }

          .print-header {
            margin-bottom: 8mm;
            padding-bottom: 3mm;
            border-bottom: 3px solid ${colors.primary};
            background: linear-gradient(to right, ${colors.bg}, white);
            padding: 3mm 2mm;
            border-radius: 4px;
          }

          .print-header h1 {
            font-size: 26pt;
            margin: 0 0 5mm 0;
            font-weight: bold;
            text-align: center;
            color: ${colors.primary};
            letter-spacing: 2px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }

          .print-header .info {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            color: ${colors.text};
            margin-bottom: 3mm;
            font-weight: 500;
          }

          .print-header .stats {
            display: flex;
            justify-content: center;
            gap: 15mm;
            margin-top: 3mm;
            font-size: 11pt;
            font-weight: bold;
            flex-wrap: wrap;
          }

          .print-header .stats span {
            white-space: nowrap;
            color: ${colors.stats};
            background: white;
            padding: 2mm 3mm;
            border-radius: 4px;
            border: 1px solid ${colors.border};
          }

          .print-gift-columns {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 1.5mm;
            grid-auto-rows: minmax(38mm, auto);
            margin-bottom: 10mm;
          }

          .print-gift-column {
            display: grid;
            grid-template-rows: 1fr 1.2fr;
            border: 2px solid ${colors.border};
            border-radius: 4px;
            overflow: hidden;
            page-break-inside: avoid;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          .book-cell {
            display: grid;
            place-items: center;
            writing-mode: vertical-lr;
            text-orientation: mixed;
            font-weight: bold;
            padding: 10px 0;
            overflow: hidden;
            text-align: center;
            line-height: 1.2;
          }

          .name-cell {
            border-bottom: 2px solid ${colors.border};
            font-size: 19pt;
            color: ${colors.text};
            background: ${
              isFestive
                ? "linear-gradient(to bottom, #fff, #fff5f5)"
                : "linear-gradient(to bottom, #fff, #f8f9fa)"
            };
          }

          .amount-cell {
            font-size: 17pt;
            color: ${colors.primary};
            background: white;
          }

          .print-footer {
            position: fixed;
            bottom: 5mm;
            left: 10mm;
            right: 10mm;
            text-align: center;
            font-size: 8pt;
            color: ${colors.secondary};
            border-top: 1px solid ${colors.border};
            padding-top: 2mm;
            background: white;
            border-radius: 2px;
          }

          @media print {
            .print-footer::after {
              content: "页码: " counter(page);
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          <div class="print-header">
            <h1>${state.currentEvent!.name}</h1>
            <div class="info">
              <span>时间: ${formatDateTime(
                state.currentEvent!.startDateTime
              )} ~ ${formatDateTime(state.currentEvent!.endDateTime)}</span>
              ${
                state.currentEvent!.recorder
                  ? `<span>记账人: ${state.currentEvent!.recorder}</span>`
                  : ""
              }
            </div>
            <div class="stats">
              <span>总金额: ¥${totalAmount.toFixed(2)}</span>
              <span>总人数: ${validGifts.length}人</span>
              ${statsHTML}
            </div>
          </div>

          <div class="print-gift-columns">
            ${giftColumnsHTML}
          </div>

          <div class="print-footer">
            打印时间: ${new Date().toLocaleString("zh-CN")} | 共 ${
      validGifts.length
    } 条记录
          </div>
        </div>

        <script>
          // 自动打印
          setTimeout(() => {
            window.print();
            // 打印后关闭窗口
            setTimeout(() => {
              window.close();
            }, 500);
          }, 100);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  // 导出备份
  const exportBackup = () => {
    try {
      BackupService.exportEvent(
        state.currentEvent!.id,
        state.currentEvent!.name
      );
    } catch (error) {
      alert("导出失败：" + (error as Error).message);
    }
  };

  // 打开副屏
  const openGuestScreen = () => {
    // 获取当前页面的完整路径，替换 hash 部分为副屏路径
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.split("#")[0];
    // 打开最大化窗口，适合横屏展示
    window.open(
      `${baseUrl}#/guest-screen`,
      "_blank",
      "width=1920,height=1080,left=0,top=0,fullscreen=yes,menubar=no,toolbar=no,location=no,status=no"
    );
  };

  // 导入备份成功
  const handleImportSuccess = (result: ImportResult) => {
    // 刷新当前事件的礼物数据
    if (state.currentEvent) {
      actions.loadGifts(state.currentEvent.id, state.currentPassword!);
    }

    // 显示成功消息
    let msg = `成功导入 ${result.events} 个事件、${result.gifts} 条礼金记录`;
    if (result.conflicts > 0) {
      msg += `，跳过 ${result.conflicts} 条重复记录`;
    }
    setImportSuccessMsg(msg);

    // 3秒后自动清除消息
    setTimeout(() => {
      setImportSuccessMsg(null);
    }, 5000);
  };


  return (
    <MainLayout theme={state.currentEvent.theme}>
      <div className="space-y-4">
        {/* 头部 */}
        <div className="card themed-bg-light p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold themed-header">
                {state.currentEvent.name}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {formatDateTime(state.currentEvent.startDateTime)} ~{" "}
                {formatDateTime(state.currentEvent.endDateTime)}
                {state.currentEvent.recorder &&
                  ` | 记账人: ${state.currentEvent.recorder}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap no-print">
              <Button variant="danger" size="sm" onClick={handleGoHome}>
                返回首页
              </Button>
              <Button variant="primary" onClick={exportPDF}>
                打印/PDF
              </Button>
              <Button variant="secondary" onClick={exportExcel}>
                导出Excel
              </Button>
              <Button variant="secondary" onClick={openGuestScreen}>
                开启副屏
              </Button>
              <Button variant="secondary" onClick={exportBackup}>
                💾 导出备份
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowImportModal(true)}>
                📂 导入备份
              </Button>
            </div>
          </div>
        </div>

        {/* 导入成功提示 */}
        {importSuccessMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 text-green-800">
              <span>✅</span>
              <span className="text-sm">{importSuccessMsg}</span>
            </div>
            <button
              onClick={() => setImportSuccessMsg(null)}
              className="text-green-600 hover:text-green-800 font-bold">
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：录入表单 */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-4 text-center border-b pb-2 themed-header">
                礼金录入
              </h2>

              <GiftEntryForm
                onSubmit={handleGiftSubmit}
                loading={state.loading.submitting}
              />

              {/* 快捷统计 */}
              <div className="mt-4 pt-4 border-t themed-border grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/30 border themed-border">
                  <span className="text-gray-500">总金额</span>
                  <span className="font-bold themed-text">
                    {Utils.formatCurrency(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800/30 border themed-border">
                  <span className="text-gray-500">总人数</span>
                  <span className="font-bold themed-text">{totalGivers}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：礼簿展示 */}
          <div className="lg:col-span-2">
            <div className="gift-book-frame print-area">
              {/* 页码导航 */}
              <div className="flex justify-between items-center mb-3 pb-3 border-b themed-border no-print text-sm">
                <div className="flex items-center gap-3 font-bold themed-text">
                  <span>本页: {Utils.formatCurrency(pageSubtotal)}</span>
                  <span className="text-gray-400">|</span>
                  <span>
                    人数:{" "}
                    {
                      displayGifts.filter((g) => g.data && !g.data.abolished)
                        .length
                    }
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="primary"
                    className="w-7 h-7 rounded !p-0"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}>
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
                    disabled={currentPage === totalPages}>
                    →
                  </Button>
                </div>
              </div>

              {/* 礼簿内容 - 每列独立卡片布局 */}
              <div className="gift-book-columns">
                {Array.from({ length: 12 }).map((_, idx) => {
                  const gift = displayGifts[idx];
                  const hasData = gift && gift.data && !gift.data.abolished;
                  return (
                    <div
                      key={idx}
                      className="gift-book-column"
                      data-col-index={idx}
                      data-has-data={hasData ? "true" : "false"}
                      onClick={() => {
                        if (hasData && gift.data) {
                          openDetailModal(gift);
                        }
                      }}
                      style={{ cursor: hasData ? "pointer" : "default" }}>
                      {/* 姓名区域 */}
                      <div className="book-cell name-cell column-top">
                        {hasData ? (
                          <div className="name">
                            {gift.data!.name.length === 2
                              ? `${gift.data!.name[0]}　${gift.data!.name[1]}`
                              : gift.data!.name}
                          </div>
                        ) : (
                          <span className="text-gray-300 print-placeholder">
                            +
                          </span>
                        )}
                      </div>

                      {/* 金额区域 */}
                      <div className="book-cell amount-cell column-bottom">
                        {hasData ? (
                          <div className="amount-chinese">
                            {Utils.amountToChinese(gift.data!.amount)}
                          </div>
                        ) : (
                          <span className="text-gray-300 print-placeholder">
                            +
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 确认模态框 */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">❓</span>
                <h3 className="text-xl font-bold text-gray-800">
                  {confirmConfig.title}
                </h3>
              </div>
              <div className="mb-4 text-gray-600 whitespace-pre-line">
                {confirmConfig.message}
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="danger"
                  onClick={() => setShowConfirmModal(false)}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    confirmConfig.onConfirm();
                    setShowConfirmModal(false);
                  }}>
                  确定
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 详情弹窗 */}
        {showDetailModal && selectedGift && selectedGift.data && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="text-xl font-bold themed-header">
                  {isEditing ? "编辑礼金记录" : "礼金详情"}
                </h3>
                <button
                  onClick={() => {
                    if (isEditing) {
                      cancelEditing();
                    } else {
                      closeDetailModal();
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  // 编辑模式表单
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        姓名
                      </label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            name: e.target.value,
                          })
                        }
                        className="w-full p-2 border themed-ring rounded"
                        placeholder="来宾姓名"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        金额
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData.amount}
                        onChange={(e) => handleEditAmountChange(e.target.value)}
                        className="w-full p-2 border themed-ring rounded"
                        placeholder="金额 (元)"
                      />
                      {chineseAmount && (
                        <div className="text-sm text-gray-600 mt-1 text-right themed-text">
                          {chineseAmount}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        收款类型
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(["现金", "微信", "支付宝", "其他"] as GiftType[]).map(
                          (type) => (
                            <label
                              key={type}
                              className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                                editFormData.type === type
                                  ? "bg-[var(--select-bg)] border-[var(--select-border)] text-[var(--select-text)] font-semibold shadow-sm"
                                  : "bg-white border-[var(--primary-border-color)] text-[var(--primary-text-color)] hover:border-[var(--select-hover-border)] hover:bg-[var(--select-hover-bg)]"
                              }`}
                              onClick={() =>
                                setEditFormData({ ...editFormData, type })
                              }>
                              <input
                                type="radio"
                                name="editType"
                                value={type}
                                checked={editFormData.type === type}
                                onChange={() => {}}
                                className="sr-only"
                              />
                              <span>{type}</span>
                            </label>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        备注
                      </label>
                      <input
                        type="text"
                        value={editFormData.remark}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            remark: e.target.value,
                          })
                        }
                        className="w-full p-2 border themed-ring rounded"
                        placeholder="备注内容（选填）"
                      />
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={cancelEditing}>
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={saveEdit}>
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 详情模式
                  <div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="font-semibold text-gray-600">姓名：</div>
                      <div className="font-bold text-lg">
                        {selectedGift.data.name}
                      </div>

                      <div className="font-semibold text-gray-600">金额：</div>
                      <div className="font-bold text-lg text-red-600">
                        ¥{selectedGift.data.amount.toFixed(2)}
                      </div>

                      <div className="font-semibold text-gray-600">大写：</div>
                      <div className="font-bold text-lg font-kaiti">
                        {Utils.amountToChinese(selectedGift.data.amount)}
                      </div>

                      <div className="font-semibold text-gray-600">类型：</div>
                      <div className="font-bold">{selectedGift.data.type}</div>

                      <div className="font-semibold text-gray-600">时间：</div>
                      <div className="text-gray-700">
                        {(() => {
                          const date = new Date(selectedGift.data.timestamp);
                          const pad = (num: number) =>
                            num.toString().padStart(2, "0");
                          return `${date.getFullYear()}-${pad(
                            date.getMonth() + 1
                          )}-${pad(date.getDate())} ${pad(
                            date.getHours()
                          )}:${pad(date.getMinutes())}`;
                        })()}
                      </div>

                      {selectedGift.data.remark && (
                        <>
                          <div className="font-semibold text-gray-600">
                            备注：
                          </div>
                          <div className="col-span-2 text-gray-700 bg-gray-50 p-2 rounded">
                            {selectedGift.data.remark}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-3 mt-6 pt-4 border-t">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={startEditing}>
                        ✏️ 修改
                      </Button>
                      <Button
                        variant="danger"
                        className="flex-1"
                        onClick={handleDeleteGift}>
                        🗑️ 删除
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 导入备份模态框 */}
        <ImportBackupModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={handleImportSuccess}
        />
      </div>
    </MainLayout>
  );
}
