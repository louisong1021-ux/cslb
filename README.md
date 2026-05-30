# cslb 仓库管理说明

这个仓库用于集中存放多个网页工具项目。当前管理方式是：**根目录作为项目总入口和说明区，具体项目代码全部放进对应文件夹**。

## 根目录管理规则

根目录只保留：

- 项目文件夹
- 本仓库总说明文件 `README.md`

不要把普通项目文件直接放在根目录，例如：

```text
.html
.jsx
.js
.css
.ps1
.txt
临时测试文件
单个项目专用 README
```

如果某个文件只属于一个项目，就必须放进该项目文件夹。

## 当前目录结构

```text
/
├── README.md                     仓库总说明，只说明管理方式
├── cslb-study-tool/              CSLB C10 电工学习工具
├── manager-hiring-checklist/     招聘面试必做清单网页
└── move-checkpoint/              迁移记录、测试文件、整理检查点
```

## 项目文件夹说明

### `cslb-study-tool/`

用于管理 CSLB C10 电工学习工具。

主要文件包括：

```text
cslb-study-tool/index.html
cslb-study-tool/C10StudyCardsPreview.jsx
cslb-study-tool/build-standalone.ps1
cslb-study-tool/README.md
cslb-study-tool/PROJECT_README.md
```

访问地址：

```text
https://louisong1021-ux.github.io/cslb/cslb-study-tool/
```

### `manager-hiring-checklist/`

用于管理招聘面试必做清单网页。

主要文件包括：

```text
manager-hiring-checklist/index.html
manager-hiring-checklist/RealtimeReactPage.jsx
```

访问地址：

```text
https://louisong1021-ux.github.io/cslb/manager-hiring-checklist/
```

### `move-checkpoint/`

用于保存整理过程中的检查点、测试文件和迁移记录。

这个文件夹不是正式网页项目，主要用于保留历史记录，方便后续排查或回滚。

## 新增项目规则

新增一个网页或工具时，必须新建独立文件夹，例如：

```text
new-project-name/
├── index.html
├── README.md
└── 其他项目文件
```

不要直接把新项目的 `index.html`、源码文件或临时文件放到根目录。

## 修改项目规则

修改某个项目时，先进入对应文件夹：

```text
cslb-study-tool/
manager-hiring-checklist/
```

只修改该项目内部文件，不影响其他项目。

如果修改会影响访问路径、部署方式或文件结构，需要同步更新对应项目文件夹里的 `README.md`。

## GitHub Pages 说明

当前仓库使用 GitHub Pages 部署静态网页。由于根目录主要作为管理区，推荐直接访问具体项目路径：

```text
/cslb-study-tool/
/manager-hiring-checklist/
```

根目录不建议作为具体项目页面使用。

## 版本与回滚

重要整理提交：

```text
074d2d341942a5e66463a7f3606bd436fc417bee
```

该提交完成了根目录旧项目文件整理，将原先散落在根目录的 CSLB 文件移入 `cslb-study-tool/`。

后续如果要回滚某个项目，优先通过 GitHub commit history 找对应项目文件夹的历史版本，不要手动混合多个项目文件。

## 总原则

```text
一个文件夹 = 一个项目
根目录 = 仓库说明 + 项目分类
项目文件不直接放根目录
```
