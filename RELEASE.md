# 自动发布说明

本项目配置了 GitHub Actions 自动发布工作流，可以一键打包并发布 Release。

## 📦 发布方式

### 方式1: 通过 Git Tag 发布（推荐）

```bash
# 1. 创建并推送 tag
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions 会自动：
#    - 构建项目
#    - 打包文件
#    - 创建 Release
#    - 上传压缩包
```

### 方式2: 手动触发工作流

1. 进入 GitHub 仓库页面
2. 点击 **Actions** 标签
3. 选择 **Release** 工作流
4. 点击 **Run workflow**
5. 输入版本号（如：v1.0.0）
6. 点击 **Run workflow** 按钮

## 📝 发布内容

每次发布会自动创建包含以下内容的 Release：

```
release-package.tar.gz
├── out/                    # Next.js 构建产物
│   ├── index.html
│   ├── _next/
│   └── ...
├── package.json           # 项目配置
├── pnpm-lock.yaml        # 依赖锁定
├── README-部署说明.md     # 详细部署指南
└── VERSION.txt           # 版本信息
```

## 🚀 部署流程

### 1. 下载 Release

访问 GitHub Releases 页面，下载 `release-package.tar.gz`

### 2. 解压文件

```bash
tar -xzf release-package.tar.gz
cd release-package
```

### 3. 选择部署方式

#### 选项A: 部署到 GitHub Pages

```bash
# 将 out 目录推送到 gh-pages 分支
cd out
git init
git add .
git commit -m "Deploy v1.0.0"
git remote add origin <your-repo>
git push -f origin main:gh-pages
```

#### 选项B: 部署到 Vercel

1. 登录 [Vercel](https://vercel.com)
2. 导入仓库
3. 设置构建命令为 `next build`
4. 设置输出目录为 `out`
5. 部署

#### 选项C: 部署到自定义服务器

```bash
# 将 out 目录上传到服务器
scp -r out/* user@your-server:/var/www/html/
```

#### 选项D: 本地运行（推荐）

```bash
# 1. 解压发布包
tar -xzf release-package.tar.gz
cd release-package

# 2. 进入 out 目录
cd out

# 3. 启动服务
npx serve .

# 4. 浏览器访问
# http://localhost:3000
```

> **注意**: 由于浏览器安全限制，需要通过 HTTP 服务器访问，不能直接双击 HTML 文件打开。

## 🔧 首次使用

1. 访问 `/test-data` 生成测试数据
2. 或访问 `/setup` 创建新事件
3. 默认密码: `123456`

## 📋 工作流配置说明

### 触发条件

- **Push Tag**: 推送以 `v` 开头的 tag
- **手动触发**: 在 Actions 页面手动运行

### 权限要求

需要 GitHub Token 具有 `contents: write` 权限（默认已具备）

### 环境变量

无需额外配置，使用项目中的 `.env.example` 作为参考

## 🔒 安全建议

1. **修改默认密码**: 首次部署后立即修改
2. **定期备份**: 备份 localStorage 数据
3. **访问控制**: 考虑添加基础认证

## 🆘 常见问题

### Q: 发布失败怎么办？

A: 检查 Actions 日志，常见原因：

- 依赖安装失败
- 构建错误
- 权限不足

### Q: 如何更新已发布的版本？

A: 创建新的 tag 并推送，会自动发布新版本

### Q: 可以发布测试版本吗？

A: 可以，在 tag 名称中使用 `-beta`、`-alpha` 等后缀

## 📞 技术支持

如有问题，请提交 Issue 或查看 GitHub Actions 日志。
