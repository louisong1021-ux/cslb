# CSLB C10 Electrical Study Tool

这是一个单文件 React 学习工具。

## 运行方式

直接用 Chrome 或 Edge 打开 `index.html`。

这个入口页通过 CDN 加载 React、ReactDOM、Babel 和 Tailwind，所以首次打开需要联网。

## 修改源码后重新生成

源码在 `C10StudyCardsPreview.jsx`。修改后运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\build-standalone.ps1
```

脚本会重新生成 `index.html`。

## 说明

当前机器没有检测到 `node` / `npm`，所以这里没有使用 Vite 或 npm 依赖。后续如果想改成标准 React 项目，可以安装 Node.js 后再迁移到 Vite。
