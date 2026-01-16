import React, { useState } from "react";
import { GiftType } from "@/types";
import { amountToChinese } from "@/utils/format";
import { speakGiftData, speakSuccess, isVoiceSupported } from "@/lib/voice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { error } from "@/components/ui/Toast";

interface GiftEntryFormProps {
  onSubmit: (giftData: {
    name: string;
    amount: number;
    type: GiftType;
    remark?: string;
  }) => void;
  loading?: boolean;
  onError?: (message: string) => void;
}

const GiftEntryForm: React.FC<GiftEntryFormProps> = ({
  onSubmit,
  loading = false,
  onError,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    type: "现金" as GiftType,
    remark: "",
  });
  const [chineseAmount, setChineseAmount] = useState("");

  const handleAmountChange = (value: string) => {
    setFormData({ ...formData, amount: value });
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setChineseAmount(amountToChinese(num));
    } else {
      setChineseAmount("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (!formData.name.trim() || isNaN(amount) || amount <= 0) {
      const errorMsg = "请填写正确的姓名和金额";
      if (onError) {
        onError(errorMsg);
      } else {
        alert(errorMsg);
      }
      return;
    }

    // 先执行提交
    onSubmit({
      name: formData.name.trim(),
      amount,
      type: formData.type,
      remark: formData.remark.trim() || undefined,
    });

    // 语音播报（异步执行，不阻塞表单提交）
    if (isVoiceSupported()) {
      speakGiftData(
        formData.name.trim(),
        amount,
        formData.type,
        formData.remark.trim() || undefined
      ).then(() => {
        // 播报成功后提示
        speakSuccess();
      }).catch(() => {
        // 播报失败也提示成功，因为数据已保存
        console.log('语音播报失败，但数据已保存');
      });
    }

    // 重置表单
    setFormData({
      name: "",
      amount: "",
      type: "现金",
      remark: "",
    });
    setChineseAmount("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="姓名"
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="来宾姓名"
        required
        autoFocus
      />

      <div>
        <Input
          label="金额"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="金额 (元)"
          required
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
          {(["现金", "微信", "支付宝", "其他"] as GiftType[]).map((type) => (
            <label
              key={type}
              className={`flex items-center justify-center p-2 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                formData.type === type
                  ? "bg-[var(--select-bg)] border-[var(--select-border)] text-[var(--select-text)] font-semibold shadow-sm"
                  : "bg-white border-[var(--primary-border-color)] text-[var(--primary-text-color)] hover:border-[var(--select-hover-border)] hover:bg-[var(--select-hover-bg)]"
              }`}>
              <input
                type="radio"
                name="type"
                value={type}
                checked={formData.type === type}
                onChange={() => setFormData({ ...formData, type })}
                className="sr-only"
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </div>

      <Input
        label="备注"
        type="text"
        value={formData.remark}
        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
        placeholder="备注内容（选填）"
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full p-3 rounded-lg font-bold text-lg"
        disabled={loading}>
        {loading ? "录入中..." : "确认录入"}
      </Button>

      {/* 语音状态提示 */}
      {isVoiceSupported() && (
        <div className="pt-3 border-t themed-border text-xs text-gray-500 text-center">
          ✅ 语音播报已就绪
        </div>
      )}
    </form>
  );
};

export default GiftEntryForm;
