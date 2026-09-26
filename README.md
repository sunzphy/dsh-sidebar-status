# dsh-sidebar-status

DeepSeek 账号余额 + 当前计费时段，固定在侧边栏底部。

```
  余额 ¥10.46  ⟳  ● 空闲时段            去充值
```

- **余额** —— 充值余额 + 赠金余额（有赠金时才显示）
- **⟳** —— 手动刷新
- **时段** —— 官方口径的「高峰时段 / 空闲时段」，鼠标悬停看下一段什么时候开始
- **去充值** —— 打开官方充值页

## 安装

```sh
dsh plugin --profile web add github:sunzphy/dsh-sidebar-status
```

一条命令装好，刷新页面即可。

其它方式：

- 从 [Releases](https://github.com/sunzphy/dsh-sidebar-status/releases) 下载 `.tgz`，然后 `dsh plugin --profile web add <文件路径>`
- **桌面端（Electron）**：`--profile desktop` 会被应用拒绝。手工装的话，把包放进 `~/.dsh/profiles/desktop/node_modules/`，再往 `~/.dsh/profiles/desktop/cordis.patch.yml` 追加：

  ```yaml
  - insert:
      - id: sidebar-status
        name: 'dsh-sidebar-status'
  ```

  ⚠️ **别在这行写 `inject:`。** 这是**宿主**条目，而本插件没有宿主侧行为。写一个宿主不存在的服务名（`slots`、`locale` 都是浏览器侧的）会让它永远起不来，而且界面上看不出任何异常。

## 用它需要什么

| | |
| --- | --- |
| DSH | `>= 0.1.7-rc.2`（需要其中的 account 子系统） |
| **已登录 DeepSeek 账号** | **余额必须** —— 走账号钱包，不读 `DEEPSEEK_API_KEY` |
| 计价 | DeepSeek 中国大陆价目表 |

### ⚠️ 关于「登录」有个平台前提

**账号登录是桌面版（Electron）专属功能。** 官方代码里那部分是这样开头的：

```js
function apply(ctx) {
    if (!("dshDesktop" in globalThis)) return;   // 只在桌面渲染器里注册
```

所以：

| 你的环境 | 结果 |
| --- | --- |
| 桌面版 + 已登录账号 | ✅ 余额 + 时段 |
| 桌面版 + 只用 API Key | ⚠️ 只有时段 |
| 纯网页版 `dsh web` | ⚠️ **只有时段**（网页版没有登录入口） |
| 网页版，但之前在桌面版登录过 | ✅ 凭据是共享的，余额也能显示 |

**只要能算出时段，这个插件就会显示时段** —— 时段是纯本地计算，跟账号无关。
拿不到余额时，余额那部分静默省略，不会显示 0 或占位符。

（如果你只用 API Key、不登录账号，这个插件不会给你余额 —— 那是另一条实现路线
（`DEEPSEEK_API_KEY` + `api.deepseek.com/user/balance`），本插件刻意不走。）

## 覆盖范围

**高峰时段** = 北京时间周一至周五（不含中国法定节假日）9:00–12:00、14:00–18:00，单价是空闲时段的两倍。
**空闲时段** = 其余全部，含周末与法定节假日全天。

- 周末、固定日期的节日（元旦 / 劳动节 / 国庆）直接按规则判断
- 清明用寿星公式
- 春节 / 端午 / 中秋用**天文推算**（Meeus 新月级数 + `Intl` 月份标签），所以**没有任何需要每年维护的数据表**
- **调休拼出来的连休不建模**：只因调休而放假的工作日会显示成高峰时段。这个误差只会把价格说得比实际贵，不会反过来

余额只在**窗口聚焦**和**每轮回答结束**时读一次，没有定时轮询。

## 卸载

```sh
dsh plugin --profile web remove dsh-sidebar-status
```

手工装的：删掉补丁文件里那几行，再删掉包目录。

## 实现细节

插槽选择、CSS 覆盖方式、天文算法与验证数据，都写在源码注释里 ——
`lib/client.js` 顶部的文件注释和各个 `#region` 段落。README 就不重复了。

## 许可

MIT
