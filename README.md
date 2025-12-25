# 🎁 电子礼簿系统

基于 **Vite + React + TypeScript** 的现代化电子礼簿系统，支持本地存储和 GitHub 云端同步。

**✨ 核心特性**：支持直接 HTML 打开（file:// 协议），无需服务器，双击即可使用！

## 🚀 快速开始

### 方式1：直接打开（推荐，无需服务器）

```bash
# 1. 下载 release-package.tar.gz
# 2. 解压
tar -xzf release-package.tar.gz
cd release-package

# 3. 双击 index.html 或在浏览器中按 Ctrl+O 选择文件
# ✅ 支持 file:// 协议，无需任何服务器！
```

### 方式2：本地开发

```bash
pnpm install
pnpm dev
# 访问 http://localhost:3000
```

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 📦 **本地存储** | 使用 localStorage，数据完全在本地 |
| 🔒 **AES 加密** | 256位加密 + SHA-256 密码哈希 |
| 🎨 **双主题** | 喜庆红 / 肃穆灰 |
| 📜 **传统格式** | 竖排文字 + 12列网格布局 |
| 📄 **导出** | PDF 打印 / Excel 导出 |
| 🖥️ **双屏联动** | 副屏实时同步展示 |
| 🌐 **离线可用** | 支持 file:// 协议 |

## 📖 使用流程

1. **创建事件**：填写名称、时间、密码，选择主题
2. **录入礼金**：输入姓名、金额（自动显示中文大写）
3. **查看/导出**：打印 PDF 或导出 Excel
4. **副屏展示**：点击"开启副屏"实时同步

## 🛠️ 开发命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本（单文件 HTML）
pnpm build

# 预览构建结果
pnpm preview
```

## 🎯 技术栈

- **框架**: Vite 5.x + React 18.3.1
- **路由**: React Router 6.x (HashRouter)
- **语言**: TypeScript 5.x
- **样式**: Tailwind CSS 3.4.0
- **加密**: CryptoJS 4.2.0
- **导出**: xlsx 0.18.5
- **打包**: vite-plugin-singlefile

## 🔒 数据安全

- **AES-256 加密**: 所有数据加密存储
- **SHA-256 哈希**: 密码单向加密
- **零后端**: 数据仅存储在本地浏览器
- **客户端加密**: 数据加密后才存储

## 📂 项目结构

```
dist/
├── index.html          # 单文件应用（298KB，可直接打开）
└── (其他文件已内联到 index.html)

src/
├── app/                # 页面组件
│   ├── page.tsx        # 首页/登录
│   ├── setup/          # 创建事件
│   ├── main/           # 主界面（礼金录入）
│   ├── guest-screen/   # 副屏展示
│   └── not-found.tsx   # 404 页面
├── lib/                # 工具库
│   ├── crypto.ts       # 加密服务
│   ├── utils.ts        # 通用工具
│   └── github.ts       # GitHub 同步（可选）
├── store/              # 状态管理
│   └── appStore.ts     # 应用状态
└── components/         # UI 组件
    ├── business/       # 业务组件
    ├── layout/         # 布局组件
    └── ui/             # 通用 UI 组件
```

## 🔄 架构变更

从 **Next.js** 迁移到 **Vite**：

| 变更 | 旧 (Next.js) | 新 (Vite) |
|------|-------------|----------|
| 构建工具 | Next.js | Vite |
| 路由 | Next.js Router | React Router + HashRouter |
| 部署 | 需要服务器 | 支持 file:// 协议 |
| 优势 | SSR/SSG | 单文件、更快、更简单 |

**主要优势**：
- ✅ 可直接双击 HTML 使用
- ✅ 更快的构建速度
- ✅ 更小的包体积
- ✅ 无需服务器配置

## 📦 发布流程

```bash
# 1. 构建
pnpm build

# 2. 打包 dist 目录
cd dist && tar -czf ../release-package.tar.gz ./*

# 3. 发布到 GitHub Releases
git tag v1.0.0
git push origin v1.0.0
```

## 🎯 快速体验

首次访问自动创建演示数据：
- **事件**: 张三李四婚礼
- **密码**: `123456` (已预填)
- **数据**: 6条礼金记录

## 📝 注意事项

1. **路由**: 使用 HashRouter，URL 格式为 `index.html#/path`
2. **副屏**: 点击"开启副屏"会打开新窗口
3. **数据**: 所有数据存储在 localStorage，清除浏览器数据会丢失
4. **加密**: 必须记住密码，无法找回

---

**开始使用**：下载 release → 解压 → 双击 `index.html` 🎉
