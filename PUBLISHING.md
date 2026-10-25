# 发布流程

给自己留的清单。基于 2026-10-25 那次真实发布（v0.1.4，首个 npm 版本）写成。

**首次都做一遍；之后每次发版只走「发一个版本」。**

---

## 一次性准备（已完成，留档备查）

### 1. GitHub 仓库

公开仓库：https://github.com/sunzphy/dsh-sidebar-status

### 2. 精选列表收录（市场只允许装这里的来源）

`data/plugins/sunzphy__dsh-sidebar-status.yml` 已提交，`category: usage`。

```yaml
url: https://github.com/sunzphy/dsh-sidebar-status
name: sunzphy/dsh-sidebar-status
category: usage
description:
  en: '...'
  zh: '...'
```

> ⚠️ **不要手写 `npm:` 字段。** 官方 contributing.md 写明：npm 映射从 registry
> **自动采集**，yml 里手写 `npm:` 会被校验拒绝。前提是包的 `repository` 字段指回
> 收录的这个仓库 —— 这点 `package.json` 已经满足。
> 采集有滞后，刚发布时 `plugins.json` 里还是 `npm: null`，属于正常。

### 3. npm 账号与 2FA

- 账号：**`sunzphy18`**（`sunzphy` 那名字注册时绑在一个找不回的旧 Gmail 上，废了；
  **npm 用户名注册后永久不能改**，别在这上面浪费时间）
- `package.json` 的 `author` 要跟 npm 账号一致
- **必须开 2FA 才能发布**，否则报 `E403 ... Two-factor authentication ... required to publish`

开 2FA 的方式：网页 `https://www.npmjs.com/settings/<用户名>/security` →
Enable 2FA → 选 **Authorization and Publishing** → 验证器 App 扫码。

> ⛔ **`npm profile enable-2fa` 命令行方式会失败**（`E403 - POST /-/npm/v1/user`）。
> 原因：按 GitHub 2026-07-31 公告，bypass-2FA 的 granular token 不能再做账号设置类操作。
> 只能用网页。

### 4. `.npmrc` 的坑

本机 `~/.npmrc` 默认 `registry=https://registry.npmmirror.com` —— **那是只读镜像，发布必失败**。
所有发布命令都要显式带 `--registry=https://registry.npmjs.org/`，不要去改全局配置。

---

## 发一个版本

### 1. 升版本号

改 `package.json` 的 `version`。

### 2. 检查包内容

```powershell
npm pack --dry-run
```

应当只有 6 个文件：`package.json`、`cordis.patch.yml`、`README.md`、`LICENSE`、
`lib/index.js`、`lib/client.js`。

### 3. 提交并推 GitHub

```powershell
git add -A
git commit -F <提交信息文件>
git push origin main
```

### 4. 发布到 npm

```powershell
cd E:\ai程序\dsh\dsh-sidebar-status
npm publish --registry=https://registry.npmjs.org/
```

会弹出授权链接并要求 2FA 动态码（验证器 App 里的 6 位数字，**不是**邮箱验证码）。

**成功标志**：`+ dsh-sidebar-status@<版本>`

> npm 会先建一个 `0.0.0-stage` 占位包（`Temporary package placeholder for staged publishing`），
> 这是正常的暂存机制，不占版本号。刚发布时 `curl` 可能只看到它 —— **等几分钟再查**，
> 那时 `versions` 里才会出现真实版本，`latest` 也指向它。

### 5. 挂 Release

```powershell
$dest="$env:TEMP\release"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
npm pack --pack-destination $dest
gh release create v<版本> "$dest\dsh-sidebar-status-<版本>.tgz" `
  --repo sunzphy/dsh-sidebar-status --title "v<版本> — 一句话" --notes-file "$dest\notes.md"
```

> `gh release create` **必须带 `--repo`**，否则非 git 目录下会报
> `failed to run git: fatal: not a git repository`。

### 6. 验证（别省，这次踩过）

```powershell
# 官方源
curl.exe -sS -o NUL -w "%{http_code}`n" https://registry.npmjs.org/dsh-sidebar-status/<版本>
# 国内镜像（200 且版本对 = 国内免代理）
curl.exe -sS https://registry.npmmirror.com/dsh-sidebar-status/latest
# 真装一遍
dsh plugin --profile tX add dsh-sidebar-status
dsh plugin --profile tX remove dsh-sidebar-status
```

**测完删掉 `~/.dsh/profiles/tX`**，别留在真实 profile 列表里。

---

## 已知的坑（都踩过）

| 坑 | 现象 | 处理 |
|---|---|---|
| 手写 `insert` 行装桌面版 | 插件**永久无法卸载**，提示「其他配置仍在使用」 | 只用 设置 → 插件 安装。详见 README |
| 手工拷包进 `node_modules` | pnpm 挪进 `.ignored/`，日志 `not in the dependency tree` | 别拷。用 `dsh plugin add` 建 junction |
| 往 npmmirror 发布 | 失败 | 显式 `--registry=https://registry.npmjs.org/` |
| 命令行开 2FA | `E403 - POST /-/npm/v1/user` | 只能用网页开 |
| 发布后立刻查 registry | 只看到 `0.0.0-stage` | 等几分钟；npm 在异步处理 |
| 用 `author: sunzphy` 配 `sunzphy18` 账号 | 能发但作者名对不上 | 保持一致 |

---

## 本地开发与部署

**仓库是源码，profile 里应该是同一个目录 —— 不要再手工拷文件。**

```powershell
dsh plugin --profile desktop add "E:\ai程序\dsh\dsh-sidebar-status"
```

桌面端这条会被拒，改用 设置 → 插件 里用本地绝对路径装。装完
`~/.dsh/profiles/desktop/node_modules/dsh-sidebar-status` 是指向仓库的 **junction**，
改仓库就等于改 profile，没有"同步"这一步。

只改 `lib/client.js` 时，客户端 HMR 约一秒重载，**不用重启**。改了 `lib/index.js`
（宿主半侧）或接线行的 `inject` 才需要重启 —— 宿主模块被 ESM 缓存，热更不会重新导入。

**验证接线是否生效**：在 `apply()` 里临时写一行日志到文件，重启后确认文件出现。
踩过的坑：补丁行写了 `inject: [slots, locale]` —— 那是**客户端**服务名，宿主没有，
fiber 永远 pending、`apply()` 从不执行，而界面看起来完全正常。

---

## 发布前自检

- [ ] `npm pack --dry-run` 只有 6 个文件
- [ ] `package.json` 的 `version` 已升
- [ ] `author` 与 npm 账号（`sunzphy18`）一致
- [ ] 补丁行**没有** `inject:` 字段
- [ ] 一次性 profile 里 `add` 装得上、`remove` 卸得掉
- [ ] `npm publish` 后官方源 + npmmirror 都查到了新版本
- [ ] `lib/client.js` 通过 `node --check`
