"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CryptoService } from "@/lib/crypto";
import { Utils } from "@/lib/utils";
import { Event } from "@/types";
import { GitHubService } from "@/lib/github";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "张三李四婚礼之喜（测试）",
    startDate: Utils.getCurrentDateTime().date,
    startTime: "18:00",
    endDate: Utils.getCurrentDateTime().date,
    endTime: "22:00",
    password: "123456",
    theme: "festive" as "festive" | "solemn",
    recorder: "",
    githubSync: false,
    githubOwner: "",
    githubRepo: "",
    githubToken: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const event: Event = {
        id: Utils.generateId(),
        name: formData.name,
        startDateTime: `${formData.startDate}T${formData.startTime}`,
        endDateTime: `${formData.endDate}T${formData.endTime}`,
        passwordHash: CryptoService.hash(formData.password),
        theme: formData.theme,
        recorder: formData.recorder,
        createdAt: new Date().toISOString(),
      };

      // 保存到 localStorage
      const events = JSON.parse(
        localStorage.getItem("giftlist_events") || "[]"
      );
      events.push(event);
      localStorage.setItem("giftlist_events", JSON.stringify(events));

      // 保存 GitHub 配置（如果有）
      if (formData.githubSync) {
        const githubConfig = {
          owner: formData.githubOwner,
          repo: formData.githubRepo,
          token: formData.githubToken,
        };
        localStorage.setItem("giftlist_github", JSON.stringify(githubConfig));

        // 测试连接
        const github = new GitHubService(githubConfig);
        const connected = await github.testConnection();
        if (!connected) {
          alert("GitHub 连接失败，将只使用本地存储");
          localStorage.removeItem("giftlist_github");
        } else {
          // 初始化仓库数据
          await github.syncEvents(events);
        }
      }

      // 保存会话
      sessionStorage.setItem(
        "currentEvent",
        JSON.stringify({
          event,
          password: formData.password,
          timestamp: Date.now(),
        })
      );

      // 重置首页跳转标记，允许重新选择
      sessionStorage.removeItem("has_redirected");

      router.replace("/main");
    } catch (err) {
      console.error(err);
      alert("创建失败: " + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl p-8 fade-in">
        <h1 className="text-3xl font-bold mb-6 text-center themed-header">
          电子礼簿系统
        </h1>
        <h2 className="text-xl font-semibold mb-6 text-center border-b pb-2">
          创建新事项
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              事项名称
            </label>
            <input
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例如: 张三李四新婚之喜"
              className="themed-ring"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始时间
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="themed-ring"
                />
                <input
                  type="time"
                  required
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="themed-ring"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束时间
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="themed-ring"
                />
                <input
                  type="time"
                  required
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="themed-ring"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              管理密码
            </label>
            <input
              required
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="默认 123456，请牢记，丢失无法找回"
              className="themed-ring"
            />
          </div>

          {/* 更多设置 */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 group-hover:text-gray-900 list-none">
              <div className="flex items-center">
                <span>更多设置</span>
                <span className="text-lg ml-1 transition-transform transform group-open:rotate-180">
                  ▼
                </span>
              </div>
            </summary>
            <div className="mt-4 p-4 card themed-border space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  界面风格
                </label>
                <select
                  value={formData.theme}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      theme: e.target.value as "festive" | "solemn",
                    })
                  }
                  className="themed-ring">
                  <option value="festive">喜庆红 (喜事)</option>
                  <option value="solemn">肃穆灰 (白事)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  为不同性质的事项选择合适的界面配色风格。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  记账人
                </label>
                <input
                  value={formData.recorder}
                  onChange={(e) =>
                    setFormData({ ...formData, recorder: e.target.value })
                  }
                  placeholder="记账人 (例如: 王五，选填)"
                  className="themed-ring"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.githubSync}
                    onChange={(e) =>
                      setFormData({ ...formData, githubSync: e.target.checked })
                    }
                  />
                  <span className="font-medium">启用 GitHub 云端同步</span>
                </label>

                {formData.githubSync && (
                  <div className="mt-3 space-y-3 card p-4">
                    <p className="text-sm text-blue-800">
                      数据将加密存储在你的 GitHub 仓库中，支持多设备同步
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GitHub 用户名
                      </label>
                      <input
                        required={formData.githubSync}
                        placeholder="owner"
                        value={formData.githubOwner}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            githubOwner: e.target.value,
                          })
                        }
                        className="themed-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        仓库名
                      </label>
                      <input
                        required={formData.githubSync}
                        placeholder="repo"
                        value={formData.githubRepo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            githubRepo: e.target.value,
                          })
                        }
                        className="themed-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Personal Access Token
                      </label>
                      <input
                        required={formData.githubSync}
                        type="password"
                        placeholder="ghp_..."
                        value={formData.githubToken}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            githubToken: e.target.value,
                          })
                        }
                        className="themed-ring"
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      需要 repo 权限。数据将保存在 data/ 目录下。
                    </p>
                  </div>
                )}
              </div>
            </div>
          </details>

          <button
            type="submit"
            disabled={loading}
            className="w-full themed-button-primary p-3 rounded-lg transition duration-300 font-bold hover-lift">
            {loading ? "创建中..." : "创建并进入"}
          </button>
        </form>
      </div>
    </div>
  );
}
