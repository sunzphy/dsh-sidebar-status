# dsh-sidebar-status

侧边栏底部的**固定状态区**：显示 DeepSeek 账号钱包余额、当前**计费时段**（高峰 / 空闲）、一个**手动刷新按钮**，并带一个官方充值按钮。

```
  余额 ¥10.46  ⟳  ● 空闲时段            去充值
```

- 用**账号钱包**（充值余额 + 赠金余额），不需要 `DEEPSEEK_API_KEY`，不直接请求 `api.deepseek.com`。
- 计费时段**完全在本地按官方规则计算**，不发任何请求，**没有任何需要每年维护的数据**。
- 只写入**一个官方插槽**（`sidebar.footer.action`），不覆盖、不替换任何官方 UI。
- 不改动 DSH 安装目录里的任何文件；删掉下面两处即可完全回滚。

## 安装

**还没有发到 npm** —— 目前三种方式，都实测过。

### A. 直接从 GitHub 安装（最省事）

```sh
dsh plugin --profile web add github:sunzphy/dsh-sidebar-status
```

一条命令搞定：pnpm 拉源码，`dsh` 自动把包写进 profile 的 `dsh.profile.bundles`，再由包内的 `cordis.patch.yml` 挂载 —— **不用手写任何 YAML**。

### B. 用 Release 里的预构建 tarball（不依赖 GitHub 网络）

到 [Releases](https://github.com/sunzphy/dsh-sidebar-status/releases) 下载 `dsh-sidebar-status-<版本>.tgz`，然后：

```sh
dsh plugin --profile web add /path/to/dsh-sidebar-status-0.1.0.tgz
```

### C. 桌面端（Electron）

`dsh plugin --profile desktop …` 会被拒绝（`profile "desktop" is managed exclusively by the Electron application`）。两条路：

- 在市场里一键安装（市场自己会写 profile 补丁层）；
- 或手工接线：把包解到 `~/.dsh/profiles/desktop/node_modules/dsh-sidebar-status/`，再往 `~/.dsh/profiles/desktop/cordis.patch.yml` 追加

  ```yaml
  - insert:
      - id: sidebar-status
        name: 'dsh-sidebar-status'
  ```

  详见下面「接线方式」。

装完刷新页面即可（多数情况下不用重启）。

## 环境要求

| 需要 | 说明 |
| --- | --- |
| DSH | `>= 0.1.7-rc.2`（需要 `@deepseek-ai/dsh-api-remotes` 已挂载 `account` Remote 命名空间） |
| 登录 | **已登录 DeepSeek 账号**。这是本插件与同类插件的关键区别：余额走账号钱包，不读 API Key |
| 平台 | 只要渲染出 `sidebar.footer.action` 插槽的 Web GUI（`dsh web` 与各桌面客户端） |
| 计价 | DeepSeek **中国大陆**价目表（高峰/空闲 + 中国法定节假日） |

**未登录时会整块隐藏**，不留空行。如果你只用 API Key 而不登录账号，这个插件不会显示余额 —— 那是另一条实现路线（`DEEPSEEK_API_KEY` + `api.deepseek.com/user/balance`），本插件刻意不走。

## 它在哪里

侧边栏从上到下的实际结构（读自 `@deepseek-ai/dsh-client-ui-sidebar` 的 `SidebarRoot`）：

```
logoRow          品牌行
newSession       新会话按钮
panelList        全局面板
regionArea       ← sidebar.workspaces   工作区 / 会话列表（滚动区）
footArea         纵向 flex、flex:none（固定，不滚动）
  ├─ footerActions  ← sidebar.footer.action   ← 本插件在这里
  └─ settingsArea   ← sidebar.settings        设置 / 账号入口
```

所以状态区固定在**工作区列表下方、账号入口上方**，整宽、不参与滚动。

### 一个必须知道的布局细节

`footerActions` 在官方的 CSS 里是 `display:flex`（**横排**），而官方的 Cordis 面板行把自己渲染成 `width:100%` 的整行（42px 高）。两个整行没法共存于一个 nowrap 横排里 —— 直接并排会把两边都挤扁。

本插件因此注入了一条规则：

```css
div:has(> [data-sidebar-status]) { flex-direction:column; align-items:stretch }
```

用 `:has(> …)` 选中父容器，好处是**不依赖官方那个内容哈希类名**（`n_2Q3W_footerActions` 会随版本变化），而且只改 `flex-direction`，`display:flex` 仍归官方所有。注册 `order: -1` 让状态区排在最上，于是结果是：

```
[ 工作区 / 会话列表 ]
────────────────────
  余额 ¥10.46        去充值      ← 本插件
  [ Cordis 面板 (n) ]            ← 官方行，被我们挤到下一行
────────────────────
  [ 设置 / 账号 ]
```

- 需要 `:has()`（Chromium 105+，本应用的 Electron 远高于此）。万一不支持，父容器仍是横排：会退化成并排但不会坏。
- 折叠成 56px 轨道时，Windows 桌面端的官方 CSS 会整体隐藏 `footArea`，状态区随之自动隐藏（`[data-windows-titlebar] .collapsed .footArea{display:none}`）。非 Windows 的轨道态下渲染一个极简数字。

## 数据与刷新

| 用途 | 调用 |
| --- | --- |
| 余额 | `ctx.remote.account.getBalance({version, locale, timezoneOffsetSeconds})` |
| 充值链接 / 登录态 | `ctx.remote.account.getState()` → `links.topUpUrl` |

这两个方法由 `@deepseek-ai/dsh-api-account-controller` 挂在 `account` Remote 命名空间上，桌面端由 `@deepseek-ai/dsh-api-remotes` 装配，所以**任何客户端插件都能直接用**。

**刷新策略（刻意不做定时轮询）：**

1. 插件激活时读一次；
2. 窗口重新获得焦点时（或标签页重新可见时）；
3. 每轮回答结束时 —— 监听转发事件 `api-session/status(sessionId, running)`，`running === false` 即一轮结束；
4. 第 3 条之后再延迟 4 秒补读一次：Platform 的扣款在一轮结束的瞬间还没结算完，立刻读会读到旧值。

重叠的触发会被合并成"最多一次尾随读"，不会堆请求。

**手动刷新按钮**位于余额药丸右侧，图标是官方 `IconRefreshOutline`（路径数据逐字取自 `@deepseek-ai/dsh-client-ui-primitives`，所以和 App 其它图标同一套笔画）。它在**所有阶段都渲染** —— 包括余额查询失败时，那正是最需要重试的场合。读取期间 `aria-busy="true"`、图标旋转（`prefers-reduced-motion` 下不转）、重复点击被忽略，`busy` 标记会跨尾随读保持，因此连续两次请求之间不会闪一下。

这个按钮复用同一个 `refresh()`，所以它和自动触发共享去重与尾随读逻辑，不会额外制造并发。

未登录（`getBalance` 返回 `null`）时整块**不渲染**，不留空行。查询失败时显示"余额暂不可用"。

金额格式完全对齐官方 Platform Web 规则（`formatBalance`）：两位小数 + 千分位、正数**截断**到分、小于一分的正数显示 `<¥0.01`、负数按四舍五入且不会坍缩成 0。赠金为 0 时那一枚药丸不显示。

## 计费时段（高峰 / 空闲）

显示的名称**用官方原文**：**高峰时段** / **空闲时段**。官方规则（<https://api-docs.deepseek.com/zh-cn/quick_start/pricing>）：

> 空闲时段价格为高峰时段价格的一半。北京时间周一至周五（不含中国法定节假日）9:00 - 12:00、14:00 - 18:00 为高峰时段；其余时段，包括周末及中国法定节假日全天均为空闲时段。

DeepSeek 另说明：**调休上班的周末**同样全天按空闲时段计费（<https://tech.ifeng.com/c/8wYE8addLCR>）。

### 设计原则：只认固定下来的，不按年份查表

**没有任何按年维护的表。** 判定完全由规则算出，2027、2028、2035 都一样，不需要每年回来补数据。

法定节假日**本身就由规则定义**，《全国年节及纪念日放假办法》（国务院令第 795 号，2024-11-10 修订，2025-01-01 施行）原文：

> （一）元旦，放假1天（1月1日）；
> （二）春节，放假4天（农历除夕、正月初一至初三）；
> （三）清明节，放假1天（农历清明当日）；
> （四）劳动节，放假2天（5月1日、2日）；
> （五）端午节，放假1天（农历端午当日）；
> （六）中秋节，放假1天（农历中秋当日）；
> （七）国庆节，放假3天（10月1日至3日）。

于是判定是三步：

1. 周六 / 周日 → 空闲时段（无条件）
2. 命中上面 13 天法定节假日 → 空闲时段
3. 否则看北京时间是否在 9:00–12:00 / 14:00–18:00 → 高峰时段，其余空闲时段

**逐条怎么算：**

| 节日 | 算法 | 是否与年份无关 |
| --- | --- | --- |
| 元旦 / 劳动节 / 国庆 | 固定公历日期 1/1、5/1–5/2、10/1–10/3 | ✅ 永久精确 |
| 清明 | 寿星公式 `floor(Y×0.2422+4.81) − floor(Y/4)`（21 世纪） | ✅ 永久精确，已核对 2020–2028 |
| 春节 / 端午 / 中秋 | **精确新月天文计算** + `Intl` 的月份标签 | ✅ 无需查表，2025–2036 已逐年验证 |
| 调休拼出的连休 | **刻意不管** | ❌ 有意不建模 |

### 刻意不建模的部分（以及为什么误差是安全的）

每年国务院的《部分节假日安排通知》会用调休把法定假日拼成长假（2026 国庆 10/1–10/7 里的 10/5–10/7，春节 9 天里的多数工作日）。**这部分本插件一概不猜。**

结果是：一个只因为调休而放假的工作日，会显示成**高峰时段**。这个误差方向是**安全的**——它只会把价格说得比实际贵，绝不会让你以为便宜、结果被双倍扣费。反过来（把真实高峰误报成空闲）才是花钱的错误，而本实现不会产生它。

### 农历三节是怎么算准的（关键在这）

农历节日不能靠"照抄一张年表"来保证准确 —— 实测发现**能查到的成批资料互相矛盾**（同一份 2026 春节被写成 2/18，而官方通知是 2/17），而真正权威的源（紫金山天文台、香港天文台）不一定可达。把无法核实的数字写进代码，比不写更糟。

所以这里**一条数据都不抄**，改用天文学推算：

**1）新月时刻用精确公式算。**
`newMoonMs()` 是 Meeus《Astronomical Algorithms》第 49 章的完整实现：平均新月多项式 + 25 项周期级数 + A1–A14 行星修正 + ΔT 换算。与已发布星历对比：

| 新月 | 本实现（北京时） | 已发布星历 | 差 |
| --- | --- | --- | --- |
| 2025-01-29 | 20:35:53 | 20:36 | **0.1 分** |
| 2026-02-17 | 20:01:08 | 20:01 | **0.1 分** |

这个精度是必需的，不是炫技：**2027 正月初一的新月落在北京 23:56**，离午夜只有约 4 分钟。

**2）`Intl` 只用来回答"这个农历月是几月"，不用它的"第几天"。**
`Intl` 的日号来自它自带的近似月相，所以在一个月的第一天会差一天。但"哪一轮朔望属于正月 / 五月 / 八月"是稳定的。于是：

- **某天是不是初一** ⇔ **真新月是否落在那一天**（纯天文，`isNewMoonDay()`）
- **那个月是几月** ⇔ 取该月**第 5 天**的 `Intl` 标签（月初第 5 天永远在月内部，从不落在会出错的那一天）

三个节日于是全部表达成"相对月初的偏移"，完全不使用 `Intl` 的日号：

| 节日 | 表达 |
| --- | --- |
| 除夕 | 正月初一 − 1 天 |
| 春节 | 正月初一 / +1 / +2 天 |
| 端午 | 五月初一 + 4 天（即五月初五） |
| 中秋 | 八月初一 + 14 天（即八月十五） |

**3）验证结果**（`2025–2036` 逐年全年扫描）：

| 年 | 春节（除夕→初三） | 校验 |
| --- | --- | --- |
| 2025 | 1/28 – 1/31 | 官方通知原文 ✓ |
| 2026 | 2/16 – 2/19 | 官方通知原文 ✓ |
| **2027** | **2/5 – 2/8** | 黄历为准；`Intl` 原本错报 2/9 |
| **2030** | **2/2 – 2/5** | 另一独立资料一致；`Intl` 原本错报 2/1 |
| 2028–2029, 2031–2036 | 全部与已知春节日期一致 | ✓ |

另外：每年扫描确认**春节恰好 4 天连续、端午恰好 1 天、中秋恰好 1 天**；十个独立已知的春节日期（2020–2026、2028、2029、2033）全部命中；官方 2025 / 2026 通知里的每一条农历标注（含"除夕""腊月二十八""正月初七"）全部吻合，且**非节日的那些标注日都不会被误判**。

**兜底**：`Intl` 是否真的提供中国农历会在加载时校验（读 `resolvedOptions().calendar`）。若不支持——运行时会静默退化成公历，那样五月会被标成 `"5"`、端午会落到 5月5日——校验不通过就干脆关掉农历判定，只保留 Tier 1。

### 刷新方式：零轮询

时段只可能在**北京时间 00:00 / 09:00 / 12:00 / 14:00 / 18:00** 改变。所以这里不用 interval，而是算准下一个会真正改变判定边界的时刻，`setTimeout` 到那一刻再重算一次；中间什么都不跑。悬停提示里的切换时刻写成**绝对时间**，因此文本不会随时间变味（"今天/明天"只在两天内使用，跨零点时定时器会正好触发重算）。

悬停提示会写明：官方时段名 + 判定原因（周末 / 法定节假日·春节 / 工作日…）+ 下一次名称翻转的绝对时刻 + 官方规则 + 上面那条"只认节日当天"的说明。

## 文件

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | host 半侧。空 `apply` —— 存在只为让包成为一个 Loader 条目，client-modules 扫描条目来组装浏览器 bundle。 |
| `lib/client.js` | 浏览器半侧（手写 bundle，`window.__ModuleLoader__.load({id, factory})` 格式）。全部逻辑在这里：余额读取、金额格式化、计费时段判定、渲染。 |
| `cordis.patch.yml` | bundle 补丁层。**仅**在以 bundle 方式接线（包名写进 `dsh.profile.bundles`）时生效。 |
| `package.json` | `dsh.client` 声明（`platform: web`、`inject` 前置依赖）+ `dsh.bundle.patch`。 |

## 接线方式（二选一，切勿同时用）

**A. 手动接线（本安装采用）：** 把行写进 `~/.dsh/profiles/desktop/cordis.patch.yml`，包名不要写进 `dsh.profile.bundles`：

```yaml
- insert:
    - id: sidebar-status
      name: 'dsh-sidebar-status'
```

⚠️ **不要在这行写 `inject:`。** 这是**宿主** Loader 条目，而本插件没有任何宿主侧行为（一切都由浏览器半侧通过已挂载的 `account` Remote 命名空间读取）。写一个宿主不存在的服务名（例如 `slots`、`locale` —— 它们都是浏览器侧服务）会让这个 fiber **永远停在 pending**，而且没有任何可见症状。浏览器侧的依赖声明在 `package.json` 的 `dsh.client.inject` 里。

**B. bundle 接线：** 把 `dsh-sidebar-status` 加进 `~/.dsh/profiles/desktop/package.json` 的 `dsh.profile.bundles`，由本包的 `cordis.patch.yml` 挂载。

两种方式同时使用会把插件挂载两次。

## 回滚

1. 删掉 `~/.dsh/profiles/desktop/cordis.patch.yml` 里的 `sidebar-status` insert 行（方式 B 则删 `dsh.profile.bundles` 里的包名）；
2. 删掉目录 `~/.dsh/profiles/desktop/node_modules/dsh-sidebar-status`。

DSH 会监视 profile 补丁文件，删除后插件在运行中即被卸载，无需重启。

## 已知限制

- **调休拼出的连休不建模**：只因为调休而放假的工作日会显示成高峰时段（高估价格，方向安全）。详见上面「刻意不建模的部分」。
- **中秋与国庆重叠时提示只写"国庆"**：中秋落在 10/1–10/3 时（如 2028、2031），判定原因是国庆节。当天仍是空闲时段，只是提示没有同时提中秋。
- **内嵌的官方充值页做不到。** 账号插件那个原生 Platform 视图需要只有 Host 能拿到的账号 token，通道是它私有的。本插件的"去充值"是官方链接按钮（`<a href={links.topUpUrl}>`，即 `https://platform.deepseek.com/top_up`），与官方设置页里那个按钮同一个 URL。
- **上报给 Host 的构建版本号**优先从 `globalThis.__DSH_BOOT__ / __DSH_CLIENT__` 探测，探测不到时回退为 `0.1.7-rc.2`。该字段只用于 Host 构造 Platform 请求头。
- **改这个包不需要重启应用。** profile 补丁与客户端 bundle 都有热加载；改动 `lib/client.js` 后浏览器侧会重载该 bundle。
