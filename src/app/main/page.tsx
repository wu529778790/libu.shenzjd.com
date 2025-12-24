"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Event, GiftData, GiftRecord } from "@/types";
import { CryptoService } from "@/lib/crypto";
import { Utils } from "@/lib/utils";
import { GitHubService } from "@/lib/github";
import * as XLSX from "xlsx";

export default function MainPage() {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [password, setPassword] = useState("");
  const [gifts, setGifts] = useState<
    { record: GiftRecord; data: GiftData | null }[]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 模态框状态
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "confirm" | "alert" | "prompt";
    onConfirm?: () => void;
    onCancel?: () => void;
    defaultValue?: string;
    inputRef?: any;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
  });

  // 详情弹窗状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    gift: GiftData | null;
    index: number;
  }>({
    isOpen: false,
    gift: null,
    index: -1,
  });

  // 编辑表单状态（用于修改）
  const [editFormData, setEditFormData] = useState<{
    name: string;
    amount: string;
    type: "现金" | "微信" | "支付宝" | "其他";
    remark: string;
    isEditing: boolean;
  }>({
    name: "",
    amount: "",
    type: "现金",
    remark: "",
    isEditing: false,
  });

  // 表单状态
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    type: "现金" as const,
    remark: "",
  });
  const [chineseAmount, setChineseAmount] = useState("");

  // GitHub 服务
  const [github, setGithub] = useState<GitHubService | null>(null);

  useEffect(() => {
    // 检查会话
    const session = sessionStorage.getItem("currentEvent");
    if (!session) {
      router.replace("/");
      return;
    }

    const { event, password } = JSON.parse(session);
    setEvent(event);
    setPassword(password);

    // 加载数据（直接使用从session获取的password，不依赖状态）
    loadData(event.id, password);

    // 检查 GitHub 配置
    const githubConfig = localStorage.getItem("giftlist_github");
    if (githubConfig) {
      try {
        const config = JSON.parse(githubConfig);
        setGithub(new GitHubService(config));
      } catch {}
    }
  }, []); // 移除 router 依赖，避免重复执行

  const loadData = async (eventId: string, pwd?: string) => {
    const records = JSON.parse(
      localStorage.getItem(`giftlist_gifts_${eventId}`) || "[]"
    );

    // 使用传入的password或当前状态
    const decryptPassword = pwd || password;

    console.log("[Main] Loading data for event:", eventId);
    console.log("[Main] Records count:", records.length);
    console.log("[Main] Using password length:", decryptPassword?.length);

    // 解密所有数据
    const decrypted = records.map((r: GiftRecord) => {
      const data = CryptoService.decrypt<GiftData>(
        r.encryptedData,
        decryptPassword
      );
      if (!data) {
        console.error("[Main] Failed to decrypt record:", r.id);
      }
      return {
        record: r,
        data,
      };
    });

    setGifts(decrypted);

    // 数据加载完成后立即同步到副屏
    // 使用 setTimeout 确保 setGifts 完成后再同步
    setTimeout(() => {
      // 从 localStorage 重新读取完整数据进行同步
      const allRecords = JSON.parse(
        localStorage.getItem(`giftlist_gifts_${eventId}`) || "[]"
      );
      const allDecrypted = allRecords.map((r: GiftRecord) => {
        const data = CryptoService.decrypt<GiftData>(
          r.encryptedData,
          decryptPassword
        );
        return data;
      }).filter((data: GiftData | null) => data !== null && !data.abolished);

      // 构建同步数据
      const session = sessionStorage.getItem("currentEvent");
      if (session) {
        const { event } = JSON.parse(session);
        const syncData = {
          eventName: event?.name,
          theme: event?.theme === "festive" ? "theme-festive" : "theme-solemn",
          gifts: allDecrypted.slice(-12),
        };
        localStorage.setItem("guest_screen_data", JSON.stringify(syncData));
        console.log("[Main] Initial data synced to guest screen:", allDecrypted.length, "gifts");
      }
    }, 100);
  };

  const handleAmountChange = (value: string) => {
    setFormData({ ...formData, amount: value });
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setChineseAmount(Utils.amountToChinese(num));
    } else {
      setChineseAmount("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !password) return;

    setLoading(true);

    try {
      const giftData: GiftData = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        type: formData.type,
        remark: formData.remark || undefined,
        timestamp: new Date().toISOString(),
        abolished: false,
      };

      const encrypted = CryptoService.encrypt(giftData, password);
      const record: GiftRecord = {
        id: Utils.generateId(),
        eventId: event.id,
        encryptedData: encrypted,
      };

      // 保存到 localStorage
      const key = `giftlist_gifts_${event.id}`;
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(record);
      localStorage.setItem(key, JSON.stringify(existing));

      // 同步到 GitHub（如果配置）
      if (github) {
        try {
          const allGifts = JSON.parse(localStorage.getItem(key) || "[]");
          await github.syncGifts(event.id, allGifts);
        } catch (err) {
          console.error("GitHub sync failed:", err);
        }
      }

      // 乐观更新 UI
      setGifts((prev) => [...prev, { record, data: giftData }]);

      // 重置表单
      setFormData({ name: "", amount: "", type: "现金", remark: "" });
      setChineseAmount("");

      // 聚焦
      const nameInput = document.getElementById(
        "name-input"
      ) as HTMLInputElement;
      nameInput?.focus();

      // 同步副屏（使用当前 gifts + 新数据）
      const updatedGifts = [...gifts, { record, data: giftData }];
      const allGifts = updatedGifts
        .filter((g) => g.data && !g.data.abolished)
        .map((g) => g.data!);
      const data = {
        eventName: event?.name,
        theme: event?.theme === "festive" ? "theme-festive" : "theme-solemn",
        gifts: allGifts.slice(-12),
      };
      localStorage.setItem("guest_screen_data", JSON.stringify(data));
    } catch (err) {
      console.error(err);
      alert("录入失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  // 分页
  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(gifts.length / ITEMS_PER_PAGE) || 1;
  const displayGifts = gifts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 统计
  const validGifts = gifts
    .filter((g) => g.data && !g.data.abolished)
    .map((g) => g.data!);
  const totalAmount = validGifts.reduce((sum, g) => sum + g.amount, 0);
  const totalGivers = validGifts.length;
  const pageSubtotal = displayGifts
    .filter((g) => g.data && !g.data.abolished)
    .reduce((sum, g) => sum + g.data!.amount, 0);

  // 导出 Excel
  const exportExcel = () => {
    const data = validGifts.map((g) => {
      const date = new Date(g.timestamp);
      const pad = (num: number) => num.toString().padStart(2, "0");
      const formattedTime = `${date.getFullYear()}-${pad(
        date.getMonth() + 1
      )}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
        date.getMinutes()
      )}`;

      return {
        姓名: g.name,
        金额: g.amount,
        类型: g.type,
        备注: g.remark || "",
        时间: formattedTime,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "礼金记录");
    XLSX.writeFile(wb, `${event?.name}_礼金簿.xlsx`);
  };

  // 导出 PDF（使用浏览器打印）
  const exportPDF = () => {
    window.print();
  };

  // 打开副屏
  const openGuestScreen = () => {
    window.open("/guest-screen", "_blank", "width=1200,height=800");
  };

  if (!event) return null;

  // 根据主题应用不同的容器类
  const themeClass =
    event.theme === "festive" ? "theme-festive" : "theme-solemn";

  // 获取所有事件列表
  const getAllEvents = () => {
    return JSON.parse(localStorage.getItem("giftlist_events") || "[]");
  };

  // 模态框辅助函数
  const showModal = (
    title: string,
    message: string,
    type: "confirm" | "alert" = "alert",
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    setModal({ isOpen: true, title, message, type, onConfirm, onCancel });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showModal(title, message, "confirm", onConfirm, onCancel);
  };

  const showAlert = (title: string, message: string) => {
    showModal(title, message, "alert");
  };

  const showPrompt = (
    title: string,
    message: string,
    defaultValue: string,
    onConfirm: (value: string) => void,
    onCancel?: () => void
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type: "prompt",
      onConfirm: () => {
        const input = document.getElementById(
          "prompt-input"
        ) as HTMLInputElement;
        if (input && onConfirm) onConfirm(input.value);
      },
      onCancel,
      defaultValue,
    });
  };

  // 返回首页（清除会话）
  const handleGoHome = () => {
    showConfirm(
      "返回首页",
      "返回首页将清除当前会话，需要重新选择事件并输入密码。确定吗？",
      () => {
        sessionStorage.removeItem("currentEvent");
        router.replace("/");
      }
    );
  };

  // 打开详情弹窗
  const openDetailModal = (gift: GiftData, index: number) => {
    setDetailModal({ isOpen: true, gift, index });
    setEditFormData({
      name: gift.name,
      amount: gift.amount.toString(),
      type: gift.type,
      remark: gift.remark || "",
      isEditing: false,
    });
  };

  // 关闭详情弹窗
  const closeDetailModal = () => {
    setDetailModal({ isOpen: false, gift: null, index: -1 });
  };

  // 删除记录
  const handleDeleteGift = () => {
    if (!detailModal.gift || detailModal.index === -1) return;

    showConfirm(
      "确认删除",
      `确定要删除 ${detailModal.gift.name} 的记录吗？金额：¥${detailModal.gift.amount}`,
      () => {
        if (!event) return;

        // 从 gifts 数组中移除
        const newGifts = [...gifts];
        newGifts.splice(detailModal.index, 1);
        setGifts(newGifts);

        // 从 localStorage 中移除
        const key = `giftlist_gifts_${event.id}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.splice(detailModal.index, 1);
        localStorage.setItem(key, JSON.stringify(existing));

        // 同步到副屏（使用新数组）
        const allGifts = newGifts
          .filter((g) => g.data && !g.data.abolished)
          .map((g) => g.data!);
        const syncData = {
          eventName: event.name,
          theme: event.theme === "festive" ? "theme-festive" : "theme-solemn",
          gifts: allGifts.slice(-12),
        };
        localStorage.setItem("guest_screen_data", JSON.stringify(syncData));

        // 关闭弹窗
        closeDetailModal();

        // 显示成功提示
        showAlert("删除成功", "记录已从礼簿中移除");
      }
    );
  };

  // 修改记录
  const handleUpdateGift = () => {
    if (!detailModal.gift || detailModal.index === -1 || !event) return;

    const amount = parseFloat(editFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      showAlert("错误", "请输入有效的金额");
      return;
    }

    if (!editFormData.name.trim()) {
      showAlert("错误", "请输入姓名");
      return;
    }

    // 更新数据
    const updatedGift: GiftData = {
      name: editFormData.name.trim(),
      amount: amount,
      type: editFormData.type,
      remark: editFormData.remark || undefined,
      timestamp: detailModal.gift.timestamp, // 保持原时间
      abolished: false,
    };

    // 更新 gifts 数组
    const newGifts = [...gifts];
    newGifts[detailModal.index] = { ...newGifts[detailModal.index], data: updatedGift };
    setGifts(newGifts);

    // 更新 localStorage（需要重新加密）
    const key = `giftlist_gifts_${event.id}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const encrypted = CryptoService.encrypt(updatedGift, password);
    existing[detailModal.index] = {
      ...existing[detailModal.index],
      encryptedData: encrypted,
    };
    localStorage.setItem(key, JSON.stringify(existing));

    // 同步到副屏（使用更新后的数组）
    const allGifts = newGifts
      .filter((g) => g.data && !g.data.abolished)
      .map((g) => g.data!);
    const syncData = {
      eventName: event.name,
      theme: event.theme === "festive" ? "theme-festive" : "theme-solemn",
      gifts: allGifts.slice(-12),
    };
    localStorage.setItem("guest_screen_data", JSON.stringify(syncData));

    // 关闭弹窗
    closeDetailModal();

    // 显示成功提示
    showAlert("修改成功", "记录已更新");
  };


  return (
    <div className={`min-h-screen bg-gray-50 ${themeClass}`}>
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* 头部 */}
        <div className="card themed-bg-light p-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold themed-header">{event.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {(() => {
                  const formatEventTime = (dt: string) => {
                    const date = new Date(dt);
                    const pad = (num: number) =>
                      num.toString().padStart(2, "0");
                    return `${date.getFullYear()}-${pad(
                      date.getMonth() + 1
                    )}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
                      date.getMinutes()
                    )}`;
                  };
                  return `${formatEventTime(
                    event.startDateTime
                  )} ~ ${formatEventTime(event.endDateTime)}`;
                })()}
                {event.recorder && ` | 记账人: ${event.recorder}`}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap no-print">
              <button
                onClick={handleGoHome}
                className="px-3 py-1 themed-button-danger text-sm">
                返回首页
              </button>
              <button
                onClick={exportPDF}
                className="themed-button-primary px-4 py-2 rounded-lg hover-lift">
                打印/PDF
              </button>
              <button
                onClick={exportExcel}
                className="themed-button-secondary px-4 py-2 rounded-lg hover-lift">
                导出Excel
              </button>
              <button
                onClick={openGuestScreen}
                className="themed-button-secondary px-4 py-2 rounded-lg hover-lift">
                开启副屏
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：录入表单 */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h2 className="text-2xl font-bold mb-4 text-center border-b pb-2 themed-header">
                礼金录入
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名
                  </label>
                  <input
                    id="name-input"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="来宾姓名"
                    className="themed-ring"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    金额
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="金额 (元)"
                    className="themed-ring"
                  />
                  {chineseAmount && (
                    <div className="text-sm text-gray-600 mt-1 text-right themed-text">
                      {chineseAmount}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    收款类型：
                  </label>
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {["现金", "微信", "支付宝", "其他"].map((type) => (
                      <label
                        key={type}
                        className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={type}
                          checked={formData.type === type}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              type: e.target.value as any,
                            })
                          }
                          className="themed-ring"
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    备注
                  </label>
                  <input
                    value={formData.remark}
                    onChange={(e) =>
                      setFormData({ ...formData, remark: e.target.value })
                    }
                    placeholder="备注内容（选填）"
                    className="themed-ring"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full themed-button-primary p-3 rounded-lg font-bold text-lg hover-lift">
                  {loading ? "录入中..." : "确认录入"}
                </button>
              </form>

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
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="themed-button-primary w-7 h-7 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-90">
                    ←
                  </button>
                  <span className="font-bold text-gray-700 px-1">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="themed-button-primary w-7 h-7 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-opacity-90">
                    →
                  </button>
                </div>
              </div>

              {/* 礼簿内容 - 每列独立卡片布局 */}
              <div className="gift-book-columns">
                {Array.from({ length: 12 }).map((_, idx) => {
                  const gift = displayGifts[idx];
                  const hasData = gift && gift.data && !gift.data.abolished;
                  const actualIndex = (currentPage - 1) * 12 + idx;
                  return (
                    <div
                      key={idx}
                      className="gift-book-column"
                      data-col-index={idx}
                      data-has-data={hasData ? "true" : "false"}
                      onClick={() => {
                        if (hasData) {
                          openDetailModal(gift.data!, actualIndex);
                        }
                      }}
                      style={{ cursor: hasData ? 'pointer' : 'default' }}
                    >
                      {/* 姓名区域 */}
                      <div className="book-cell name-cell column-top">
                        {hasData ? (
                          <div className="name">
                            {gift.data!.name.length === 2
                              ? `${gift.data!.name[0]}　${gift.data!.name[1]}`
                              : gift.data!.name}
                          </div>
                        ) : (
                          <span className="text-gray-300">+</span>
                        )}
                      </div>

                      {/* 金额区域 */}
                      <div className="book-cell amount-cell column-bottom">
                        {hasData ? (
                          <div className="amount-chinese">
                            {Utils.amountToChinese(gift.data!.amount)}
                          </div>
                        ) : (
                          <span className="text-gray-300">+</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 模态框 - 确认/提示弹窗使用更高层级 */}
        {modal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
              {/* 标题栏 */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">
                  {modal.type === "confirm"
                    ? "❓"
                    : modal.type === "prompt"
                    ? "📝"
                    : "🔔"}
                </span>
                <h3 className="text-xl font-bold text-gray-800">
                  {modal.title}
                </h3>
              </div>

              {/* 消息内容 */}
              <div className="mb-4 text-gray-600 whitespace-pre-line">
                {modal.message}
              </div>

              {/* 输入框（仅 prompt 类型） */}
              {modal.type === "prompt" && (
                <input
                  id="prompt-input"
                  type="text"
                  defaultValue={modal.defaultValue || ""}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none mb-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && modal.onConfirm) {
                      modal.onConfirm();
                      setModal({ ...modal, isOpen: false });
                    } else if (e.key === "Escape") {
                      modal.onCancel?.();
                      setModal({ ...modal, isOpen: false });
                    }
                  }}
                />
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 justify-end">
                {modal.type === "confirm" && (
                  <button
                    onClick={() => {
                      modal.onCancel?.();
                      setModal({ ...modal, isOpen: false });
                    }}
                    className="px-4 py-2 rounded-lg font-semibold themed-button-danger transition-all transform hover:scale-105 active:scale-95">
                    取消
                  </button>
                )}

                <button
                  onClick={() => {
                    if (modal.type === "confirm" || modal.type === "prompt") {
                      modal.onConfirm?.();
                    } else {
                      modal.onCancel?.();
                    }
                    setModal({ ...modal, isOpen: false });
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95 ${
                    modal.type === "confirm"
                      ? "themed-button-primary"
                      : "themed-button-primary"
                  }`}>
                  {modal.type === "confirm" ? "确定" : "确定"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 详情弹窗 */}
        {detailModal.isOpen && detailModal.gift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="text-xl font-bold themed-header">礼金详情</h3>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* 详情信息 - 查看模式 */}
              {!editFormData.isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="font-semibold text-gray-600">姓名：</div>
                    <div className="font-bold text-lg">{detailModal.gift.name}</div>

                    <div className="font-semibold text-gray-600">金额：</div>
                    <div className="font-bold text-lg text-red-600">
                      ¥{detailModal.gift.amount.toFixed(2)}
                    </div>

                    <div className="font-semibold text-gray-600">大写：</div>
                    <div className="font-bold text-lg font-kaiti">
                      {Utils.amountToChinese(detailModal.gift.amount)}
                    </div>

                    <div className="font-semibold text-gray-600">类型：</div>
                    <div className="font-bold">{detailModal.gift.type}</div>

                    <div className="font-semibold text-gray-600">时间：</div>
                    <div className="text-gray-700">
                      {(() => {
                        const date = new Date(detailModal.gift.timestamp);
                        const pad = (num: number) => num.toString().padStart(2, "0");
                        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
                      })()}
                    </div>

                    {detailModal.gift.remark && (
                      <>
                        <div className="font-semibold text-gray-600">备注：</div>
                        <div className="col-span-2 text-gray-700 bg-gray-50 p-2 rounded">
                          {detailModal.gift.remark}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                      onClick={() => setEditFormData({ ...editFormData, isEditing: true })}
                      className="flex-1 themed-button-primary py-2 rounded-lg font-bold hover-lift"
                    >
                      ✏️ 修改
                    </button>
                    <button
                      onClick={handleDeleteGift}
                      className="flex-1 themed-button-danger py-2 rounded-lg font-bold"
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>
              ) : (
                /* 编辑模式 */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="themed-ring"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">金额</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      className="themed-ring"
                    />
                    {editFormData.amount && !isNaN(parseFloat(editFormData.amount)) && (
                      <div className="text-sm text-gray-600 mt-1 text-right themed-text">
                        {Utils.amountToChinese(parseFloat(editFormData.amount))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      收款类型：
                    </label>
                    <div className="flex flex-wrap gap-x-3 gap-y-2">
                      {["现金", "微信", "支付宝", "其他"].map((type) => (
                        <label key={type} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="edit-type"
                            value={type}
                            checked={editFormData.type === type}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, type: e.target.value as any })
                            }
                            className="themed-ring"
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <textarea
                      value={editFormData.remark}
                      onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
                      placeholder="备注内容（选填）"
                      className="themed-ring"
                      rows={2}
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-3 mt-6 pt-4 border-t">
                    <button
                      onClick={() => setEditFormData({ ...editFormData, isEditing: false })}
                      className="flex-1 themed-button-secondary py-2 rounded-lg font-bold"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleUpdateGift}
                      className="flex-1 themed-button-primary py-2 rounded-lg font-bold hover-lift"
                    >
                      💾 保存
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
