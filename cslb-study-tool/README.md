# CSLB Study Tool 项目说明

这个文件夹用于集中管理原来的 **CSLB C10 Electrical Study Tool** 项目。仓库根目录已经整理为“只放项目文件夹”，普通项目文件不再直接放在根目录。

## 当前仓库结构

```text
/
├── cslb-study-tool/              CSLB C10 学习工具项目
├── manager-hiring-checklist/     招聘面试必做清单网页项目
└── move-checkpoint/              迁移记录、测试文件、整理检查点
```

## 本项目用途

`cslb-study-tool/` 是 CSLB C10 电工考试学习工具，主要用于：

- 学习 CSLB C10 电工考试核心概念
- 查看学习卡片
- 做自测题
- 通过手机或电脑网页访问单文件学习工具

## 主要文件说明

```text
cslb-study-tool/
├── index.html                    可直接访问的网页版入口
├── C10StudyCardsPreview.jsx      React 源组件文件
├── build-standalone.ps1          将 React 源文件打包/生成 standalone HTML 的脚本
├── .gitignore                    本项目忽略规则
├── README.md                     当前项目管理说明
└── PROJECT_README.md             原始项目 README，保留作历史说明
```

## 访问地址

GitHub Pages 部署后，本项目应通过下面地址访问：

```text
https://louisong1021-ux.github.io/cslb/cslb-study-tool/
```

招聘面试清单项目访问地址：

```text
https://louisong1021-ux.github.io/cslb/manager-hiring-checklist/
```

注意：仓库根地址 `https://louisong1021-ux.github.io/cslb/` 现在不再作为具体项目入口使用，因为根目录已按“只放文件夹”的方式整理。

## 以后怎么管理

以后新增或修改项目时，按这个规则放：

1. CSLB 相关文件全部放进 `cslb-study-tool/`
2. 招聘面试清单相关文件全部放进 `manager-hiring-checklist/`
3. 测试文件、迁移记录、临时检查点放进 `move-checkpoint/`
4. 不要把 `.html`、`.jsx`、`.ps1`、`.txt`、`.md` 等普通项目文件直接放在仓库根目录

## 修改 CSLB 项目的推荐流程

如果只是改网页内容，优先修改：

```text
cslb-study-tool/C10StudyCardsPreview.jsx
```

修改完成后，再根据脚本生成或更新：

```text
cslb-study-tool/index.html
```

如果只是小幅调整线上页面，也可以直接修改：

```text
cslb-study-tool/index.html
```

## 版本与回滚说明

当前整理后的关键提交：

```text
074d2d341942a5e66463a7f3606bd436fc417bee
```

这个提交完成了根目录旧文件整理：

- `.gitignore` 移入 `cslb-study-tool/.gitignore`
- `C10StudyCardsPreview.jsx` 移入 `cslb-study-tool/C10StudyCardsPreview.jsx`
- `README.md` 移入 `cslb-study-tool/PROJECT_README.md`
- `build-standalone.ps1` 移入 `cslb-study-tool/build-standalone.ps1`

如果以后需要回滚，可以用 GitHub 的 commit history 找到对应提交恢复。

## 管理原则

这个仓库现在按“一个文件夹 = 一个项目”的方式管理。根目录只做项目分类，不直接放项目代码文件，这样后续新增网页、学习卡、工具页面时更容易维护。