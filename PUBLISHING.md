# 发布流程

给自己留的清单。**首次发布**做一遍「一次性准备」，之后每次发版走「发一个版本」。

`YOUR-GITHUB-NAME` 是仓库里唯一的占位符，散落在 3 个地方：`package.json` 的 `repository` / `homepage` / `bugs`，以及 `README.md` 的安装命令与 Releases 链接。替换一次即可。

---

## 一次性准备

### 1. 建仓库

```sh
cd dsh-sidebar-status
git init
git add -A
git commit -m "feat: DeepSeek account balance and live peak/off-peak period in the sidebar foot"
git branch -M main
git remote add origin https://github.com/YOUR-GITHUB-NAME/dsh-sidebar-status.git
git push -u origin main
```

仓库**必须是公开的** —— 精选列表的条目就以 GitHub 地址为身份。

### 2. 确认包内容干净

```sh
npm pack --dry-run
```

应当只有 6 个文件：`package.json`、`cordis.patch.yml`、`README.md`、`LICENSE`、`lib/index.js`、`lib/client.js`。多出来的东西说明 `package.json` 的 `files` 需要调整。

---

## 发一个版本

### 1. 升版本号

改 `package.json` 的 `version`，同步更新 README 里出现的版本号。

### 2. 打包并挂 Release

```sh
npm pack
```

到 GitHub 建一个 tag 与 Release，把生成的 `dsh-sidebar-status-<版本>.tgz` 作为附件传上去。

Release 是给「拉不动 GitHub 源码」的用户准备的 —— 市场安装会优先用 npm 包，其次才是 Release tarball，最后才回退整仓源码下载。

### 3. 上架精选列表（只需做一次，除非改了名字）

市场只允许安装 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 里的来源。fork 它，新建一个文件：

**路径**：`data/plugins/YOUR-GITHUB-NAME__dsh-sidebar-status.yml`

**内容**：

```yaml
url: https://github.com/YOUR-GITHUB-NAME/dsh-sidebar-status
name: YOUR-GITHUB-NAME/dsh-sidebar-status
category: usage
description:
  en: DeepSeek account wallet balance plus the live peak/off-peak billing period, in a fixed status region at the sidebar foot, with an official top-up link.
  zh: 侧边栏底部固定状态区：DeepSeek 账号钱包余额、当前计费时段（高峰/空闲）、手动刷新与官方充值入口。
```

提交 PR，加一条即可。站点（awesome-dsh-plugin.com）与 DSH 插件市场由 CI 每日刷新，通常一天内生效。**不要往市场自己的仓库提插件条目。**

### 4. 截图（可选，但值得）

市场卡片支持多图轮播。在 PR 里策展截图列表，或让市场在打开安装弹窗时从 README 自动抽取（图片需托管在 GitHub 图床上）。

---

## 本地开发与部署

**仓库是源码，profile 里的那份是部署。** 改完同步过去：

```powershell
$repo = "E:\ai程序\dsh\dsh-sidebar-status"
$deploy = "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-sidebar-status"
Copy-Item "$repo\lib\client.js","$repo\lib\index.js" "$deploy\lib\" -Force
Copy-Item "$repo\package.json","$repo\cordis.patch.yml","$repo\README.md","$repo\LICENSE" $deploy -Force
```

只改 `lib/client.js` 时，DSH 的客户端 HMR 会在约一秒内重载该 bundle，**不用重启**。改了 `lib/index.js`（宿主半侧）或接线行的 `inject` 字段才需要重启应用 —— 宿主模块会被 ESM 缓存，热更不会重新导入。

**验证接线是否真的生效**：在宿主半侧的 `apply()` 里临时写一行日志到文件，重启后确认文件出现。曾经踩过的坑：补丁行写了 `inject: [slots, locale]` —— 那是**客户端**服务名，宿主没有，导致 fiber 永远 pending、`apply()` 从不执行，而插件在界面上看起来完全正常（client-modules 扫的是已启用条目，不等宿主激活）。

---

## 发布前自检

- [ ] `npm pack --dry-run` 只有 6 个文件
- [ ] `package.json` 的 `version` 已升
- [ ] 3 处 `YOUR-GITHUB-NAME` 已替换
- [ ] 补丁行**没有** `inject:` 字段
- [ ] 在自己的 profile 里装上、刷新、确认余额与时段都正常
- [ ] `lib/client.js` 通过 `node --check`
