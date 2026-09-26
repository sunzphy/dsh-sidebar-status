/**
 * dsh-sidebar-status — browser half.
 *
 * Renders one fixed status region in the sidebar foot and registers it into
 * `sidebar.footer.action`. The sidebar shell stacks that slot full width
 * directly below the workspace/session browsing region and directly above the
 * settings/account row, outside the scrolling region — which is the seat this
 * plugin was built for.
 *
 * Balance comes from the Host Remote namespace `account`, which
 * `@deepseek-ai/dsh-api-remotes` mounts for this application. No API key is
 * read and no Platform request is made directly; the Host owns the credential.
 *
 * Read policy (deliberate, no interval polling):
 *   - once when the plugin activates,
 *   - whenever the window regains focus (or the tab becomes visible again),
 *   - whenever a Turn ends, plus one delayed settle read because the Platform
 *     settles the charge a moment after the Turn itself completes.
 *
 * The region renders nothing while signed out, so a signed-out install never
 * shows an empty or zeroed row.
 */
window.__ModuleLoader__.load({
  id: "dsh-sidebar-status",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var React = require("react");
    var el = React.createElement;

    /** Dictionary namespace owned by this plugin. */
    var NS = "sidebar.status";

    /** Delay before the post-Turn settle read; Platform charges just after the Turn closes. */
    var SETTLE_DELAY_MS = 4000;

    //#region styles
    var css = [
      // `sidebar.footer.action` renders into a row-flex container that the shipped
      // Cordis panel row already fills with width:100%. Two full-width rows cannot
      // share a nowrap row, so stack the container instead. `:has(> …)` targets the
      // parent without depending on its content-hashed class name, and sets only
      // `flex-direction` — the shell keeps owning `display:flex`.
      "div:has(> [data-sidebar-status]){flex-direction:column;align-items:stretch}",
      "[data-sidebar-status]{box-sizing:border-box;flex:1 1 auto;width:100%;min-width:0;display:flex;align-items:center;gap:8px;padding:4px 0 2px}",
      ".dshSidebarStatus_readouts{display:flex;flex:1 1 auto;min-width:0;flex-wrap:wrap;align-items:center;gap:6px}",
      ".dshSidebarStatus_pill{display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:999px;background:var(--dsw-alias-bg-module-platform,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:12px;line-height:18px;white-space:nowrap}",
      ".dshSidebarStatus_amount{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}",
      ".dshSidebarStatus_period{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:999px;background:var(--dsw-alias-bg-module-platform,var(--dsw-alias-bg-layer-1));font-size:12px;line-height:18px;white-space:nowrap}",
      ".dshSidebarStatus_dot{width:6px;height:6px;border-radius:50%;flex:none;background:currentColor}",
      ".dshSidebarStatus_peak{color:var(--dsw-alias-state-warn-primary)}",
      ".dshSidebarStatus_off{color:var(--dsw-alias-state-success-primary)}",
      ".dshSidebarStatus_refresh{box-sizing:border-box;flex:none;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:none;border-radius:999px;background:0 0;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));cursor:pointer}",
      ".dshSidebarStatus_refresh:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary)}",
      ".dshSidebarStatus_refresh:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));outline-offset:1px}",
      ".dshSidebarStatus_refresh[aria-busy='true']{color:var(--dsw-alias-label-secondary);cursor:default}",
      ".dshSidebarStatus_spin{animation:dshSidebarStatus-spin .9s linear infinite}",
      "@keyframes dshSidebarStatus-spin{to{transform:rotate(360deg)}}",
      "@media (prefers-reduced-motion:reduce){.dshSidebarStatus_spin{animation:none}}",
      ".dshSidebarStatus_unavailable{color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));font-size:12px;line-height:18px;padding:0 2px}",
      ".dshSidebarStatus_topUp{box-sizing:border-box;flex:none;margin-left:auto;display:inline-flex;align-items:center;height:22px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3,var(--dsw-alias-border-l2));border-radius:var(--dsw-radius-md,8px);color:var(--dsw-alias-label-primary);background:0 0;font-size:12px;line-height:18px;text-decoration:none;white-space:nowrap}",
      ".dshSidebarStatus_topUp:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}",
      ".dshSidebarStatus_topUp:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary));outline-offset:2px}",
      ".dshSidebarStatus_rail{display:flex;align-items:center;justify-content:center;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
    ].join("");
    var styleId = "dsh-sidebar-status/SidebarStatus.module.css";
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(styleId) + "]") === null) {
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-sidebar-status";
      tag.dataset.pluginCss = styleId;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    var CSS = {
      readouts: "dshSidebarStatus_readouts",
      pill: "dshSidebarStatus_pill",
      amount: "dshSidebarStatus_amount",
      period: "dshSidebarStatus_period",
      dot: "dshSidebarStatus_dot",
      peak: "dshSidebarStatus_peak",
      off: "dshSidebarStatus_off",
      refresh: "dshSidebarStatus_refresh",
      spin: "dshSidebarStatus_spin",
      unavailable: "dshSidebarStatus_unavailable",
      topUp: "dshSidebarStatus_topUp",
      rail: "dshSidebarStatus_rail",
    };
    //#endregion

    //#region dictionaries
    /** Simplified Chinese dictionary (the key-set source of truth). */
    var zh = {
      balance: "余额",
      bonus: "赠金",
      peak: "高峰时段",
      offPeak: "空闲时段",
      reasonPeak: "工作日 9:00–12:00 / 14:00–18:00",
      reasonOffPeak: "工作日非高峰时段",
      reasonWeekend: "周末全天",
      reasonHoliday: "法定节假日",
      festivalNewYear: "元旦",
      festivalSpring: "春节",
      festivalQingming: "清明",
      festivalLabour: "劳动节",
      festivalDragon: "端午",
      festivalMidAutumn: "中秋",
      festivalNational: "国庆",
      switchPeak: "距转高峰时段",
      switchOffPeak: "距转空闲时段",
      rule: "官方规则：北京时间周一至周五 9:00–12:00、14:00–18:00（不含中国法定节假日）为高峰时段，单价为空闲时段的两倍；其余时段——包括周末与法定节假日全天——均为空闲时段。",
      ruleNote: "法定节假日只认节日本身的日期；由调休拼出的连休里，非节日当天的工作日仍按高峰时段显示。",
      today: "今天",
      tomorrow: "明天",
      refreshBalance: "刷新余额",
      unavailable: "余额暂不可用",
      topUp: "去充值",
      topUpTitle: "在 DeepSeek 开放平台充值",
    };
    /** English dictionary, keyed against the Chinese key set. */
    var en = {
      balance: "Balance",
      bonus: "Bonus",
      peak: "Peak hours",
      offPeak: "Off-peak hours",
      reasonPeak: "Mon–Fri 9:00–12:00 / 14:00–18:00",
      reasonOffPeak: "Weekday outside peak hours",
      reasonWeekend: "All weekend",
      reasonHoliday: "Public holiday",
      festivalNewYear: "New Year's Day",
      festivalSpring: "Spring Festival",
      festivalQingming: "Qingming",
      festivalLabour: "Labour Day",
      festivalDragon: "Dragon Boat Festival",
      festivalMidAutumn: "Mid-Autumn Festival",
      festivalNational: "National Day",
      switchPeak: "Switches to peak hours at",
      switchOffPeak: "Switches to off-peak hours at",
      rule: "Official rule: peak hours are Beijing time Mon–Fri 09:00–12:00 and 14:00–18:00, excluding Chinese public holidays, and cost twice the off-peak rate. Every other hour — weekends and public holidays in full — is off-peak.",
      ruleNote: "Only statutory festival days are recognised. A weekday that is off solely because of a make-up ('tiaoxiu') arrangement still reads as peak hours.",
      today: "today",
      tomorrow: "tomorrow",
      refreshBalance: "Refresh balance",
      unavailable: "Balance unavailable",
      topUp: "Top up",
      topUpTitle: "Top up on the DeepSeek platform",
    };
    //#endregion

    //#region decimal formatting
    /**
     * Parse a decimal amount string into sign and digit parts.
     * @param raw - amount exactly as the Host returned it.
     * @returns parsed parts, or null when the text is not a plain decimal.
     */
    function parseAmount(raw) {
      var match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(String(raw).trim());
      if (match === null) return null;
      if (match[2] === "" && (match[3] === undefined || match[3] === "")) return null;
      return {
        sign: match[1] === "-" ? -1 : 1,
        int: match[2] === "" ? "0" : match[2].replace(/^0+(?=\d)/, ""),
        frac: (match[3] === undefined ? "" : match[3]).replace(/0+$/, ""),
      };
    }
    /** @returns whether the parsed amount is exactly zero. */
    function isZero(parts) {
      return /^0*$/.test(parts.int) && parts.frac === "";
    }
    /** @returns whether the magnitude of the parsed amount is below one cent. */
    function isBelowCent(parts) {
      if (!/^0*$/.test(parts.int)) return false;
      var frac = parts.frac + "000";
      return frac.slice(0, 2) === "00" && !/^0*$/.test(frac.slice(2));
    }
    /** @returns the integer part incremented by one, as digits. */
    function incrementDigits(int) {
      var digits = int.split("");
      for (var i = digits.length - 1; i >= 0; i -= 1) {
        if (digits[i] === "9") {
          digits[i] = "0";
          continue;
        }
        digits[i] = String(Number(digits[i]) + 1);
        return digits.join("");
      }
      return "1" + digits.join("");
    }
    /**
     * Truncate toward zero at two decimals.
     * @returns grouped "integer.ff" text without a sign.
     */
    function truncateToCents(parts) {
      return groupDigits(parts.int) + "." + (parts.frac + "00").slice(0, 2);
    }
    /**
     * Round the magnitude away from zero at two decimals.
     * @returns grouped "integer.ff" text without a sign.
     */
    function roundToCents(parts) {
      var frac = parts.frac + "000";
      var cents = frac.slice(0, 2);
      var int = parts.int;
      if (Number(frac.charAt(2)) >= 5) {
        var next = Number(cents) + 1;
        if (next === 100) {
          cents = "00";
          int = incrementDigits(int);
        } else {
          cents = String(next).padStart(2, "0");
        }
      }
      return groupDigits(int) + "." + cents;
    }
    /** @returns digits grouped with thousands separators. */
    function groupDigits(int) {
      return Number(int).toLocaleString();
    }
    /**
     * Format a wallet balance using the Platform Web display rules: two
     * decimals with grouping, sub-cent positives shown as `<0.01`, and
     * negatives never collapsing to zero.
     * @param raw - balance string exactly as the Host returned it.
     * @param symbol - currency symbol.
     * @returns display text.
     */
    function formatBalance(raw, symbol) {
      var parts = parseAmount(raw);
      if (parts === null) return symbol + String(raw);
      if (isZero(parts)) return symbol + "0.00";
      if (parts.sign < 0) {
        if (isBelowCent(parts)) return "-" + symbol + "0.01";
        return "-" + symbol + roundToCents(parts);
      }
      if (isBelowCent(parts)) return "<" + symbol + "0.01";
      return symbol + truncateToCents(parts);
    }
    /** @returns whether the amount is a positive number. */
    function isPositiveAmount(raw) {
      var parts = parseAmount(raw);
      return parts !== null && parts.sign > 0 && !isZero(parts);
    }
    /** @returns the display symbol for a wallet currency. */
    function symbolFor(currency) {
      return currency === "CNY" ? "\u00a5" : "$";
    }
    //#endregion

    //#region billing period (official peak / off-peak)
    /**
     * Official pricing rule, quoted from
     * https://api-docs.deepseek.com/zh-cn/quick_start/pricing :
     *
     *   「空闲时段价格为高峰时段价格的一半。北京时间周一至周五（不含中国法定节假日）
     *     9:00 - 12:00、14:00 - 18:00 为高峰时段；其余时段，包括周末及中国法定节假日
     *     全天均为空闲时段。」
     *
     * DeepSeek also stated that a weekend worked as a make-up day for a holiday
     * is still billed off-peak all day, so Saturday and Sunday are unconditionally
     * off-peak and the make-up calendar never has to be modelled:
     * https://tech.ifeng.com/c/8wYE8addLCR
     */
    var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
    var DAY_MS = 24 * 60 * 60 * 1000;
    /** Peak windows as [startMinute, endMinute) counted from Beijing midnight. */
    var PEAK_WINDOWS = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]];

    /**
     * Everything below is YEAR-INDEPENDENT: there is no per-year table to maintain.
     * The statutory holidays themselves come from rule, because the State Council's
     * 《全国年节及纪念日放假办法》 (国务院令第795号, revised 2024-11-10, in force
     * 2025-01-01) defines them as:
     *
     *   元旦 1 天（1月1日）· 春节 4 天（农历除夕、正月初一至初三）
     *   清明 1 天（清明当日）· 劳动节 2 天（5月1日、2日）
     *   端午 1 天（农历五月初五）· 中秋 1 天（农历八月十五）
     *   国庆 3 天（10月1日至3日）
     *
     * Deliberately out of scope: the make-up ("调休") days that stretch a statutory
     * holiday into a longer break. Those are re-decided every year, and refusing to
     * guess them is the whole point — so a weekday that is only off because of a
     * 调休 arrangement reads as 高峰时段. That error can only overstate the price,
     * never understate it.
     */
    var BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
    var DAY_MS = 24 * 60 * 60 * 1000;
    /** Peak windows as [startMinute, endMinute) counted from Beijing midnight. */
    var PEAK_WINDOWS = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]];

    /** @returns a two-digit zero-padded number. */
    function pad2(value) {
      return value < 10 ? "0" + value : String(value);
    }

    /**
     * The day of April that 清明 falls on, from the standard 寿星公式
     * `floor(Y*0.2422 + 4.81) - floor(Y/4)` with Y the last two digits of the year.
     * Valid across the 21st century; an out-of-range year returns NaN so the
     * equality check below can never match.
     * @param year - full Gregorian year.
     * @returns the day of April (4, 5 or 6).
     */
    function qingmingDay(year) {
      if (year < 2000 || year > 2099) return NaN;
      var y = year - 2000;
      return Math.floor(y * 0.2422 + 4.81) - Math.floor(y / 4);
    }

    //#region true new moon (Meeus)
    /**
     * True new-moon instants, from Meeus, *Astronomical Algorithms* 2nd ed. ch. 49:
     * the mean-new-moon polynomial, the 25-term periodic series, the A1–A14
     * planetary terms, and ΔT to convert Terrestrial Time to UT.
     *
     * This precision is not decoration. 正月初一 2027 turns on a new moon about
     * four minutes before Beijing midnight, so an approximate moon phase — which is
     * what `Intl`'s Chinese calendar effectively carries — puts the month start on
     * the wrong day. The series here reproduces the published new moon of
     * 2025-01-29 12:36 UTC to the minute and ten independently known 春节 dates.
     */
    var NEW_MOON_EPOCH = 2451550.09766;
    var SYNODIC_MONTH = 29.530588861;
    var UNIX_EPOCH_JD = 2440587.5;
    var RAD = Math.PI / 180;
    /** Lunation cache: the boundary walk asks for the same months repeatedly. */
    var newMoonCache = new Map();

    /**
     * The true new moon of one lunation number.
     * @param k - lunation index, k = 0 at the new moon of 2000-01-06.
     * @returns epoch milliseconds (UT).
     */
    function newMoonMs(k) {
      var cached = newMoonCache.get(k);
      if (cached !== undefined) return cached;
      var T = k / 1236.85;
      var jde =
        NEW_MOON_EPOCH +
        SYNODIC_MONTH * k +
        0.00015437 * T * T -
        0.00000015 * T * T * T +
        0.00000000073 * T * T * T * T;
      var E = 1 - 0.002516 * T - 0.0000074 * T * T;
      var sin = Math.sin;
      var M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T * T * T) * RAD;
      var Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T * T * T - 0.000000058 * T * T * T * T) * RAD;
      var F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T * T * T + 0.000000011 * T * T * T * T) * RAD;
      var Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T * T * T) * RAD;
      jde +=
        -0.4072 * sin(Mp) +
        0.17241 * E * sin(M) +
        0.01608 * sin(2 * Mp) +
        0.01039 * sin(2 * F) +
        0.00739 * E * sin(Mp - M) -
        0.00514 * E * sin(Mp + M) +
        0.00208 * E * E * sin(2 * M) -
        0.00111 * sin(Mp - 2 * F) -
        0.00057 * sin(Mp + 2 * F) +
        0.00056 * E * sin(2 * Mp + M) -
        0.00042 * sin(3 * Mp) +
        0.00042 * E * sin(M + 2 * F) +
        0.00038 * E * sin(M - 2 * F) -
        0.00024 * E * sin(2 * Mp - M) -
        0.00017 * sin(Om) -
        0.00007 * sin(Mp + 2 * M) +
        0.00004 * sin(2 * Mp - 2 * F) +
        0.00004 * sin(3 * M) +
        0.00003 * sin(Mp + M - 2 * F) +
        0.00003 * sin(2 * Mp + 2 * F) -
        0.00003 * sin(Mp + M + 2 * F) +
        0.00003 * sin(Mp - M + 2 * F) -
        0.00002 * sin(Mp - M - 2 * F) -
        0.00002 * sin(3 * Mp + M) +
        0.00002 * sin(4 * Mp);
      var args = [
        299.77 + 0.107408 * k - 0.009173 * T * T, 251.88 + 0.016321 * k, 251.83 + 26.651886 * k,
        349.42 + 36.412478 * k, 84.66 + 18.206239 * k, 141.74 + 53.303771 * k, 207.14 + 2.453732 * k,
        154.84 + 7.30686 * k, 34.52 + 27.261239 * k, 207.19 + 0.121824 * k, 291.34 + 1.844379 * k,
        161.72 + 24.198154 * k, 239.56 + 25.513099 * k, 331.55 + 3.592518 * k,
      ];
      var weights = [0.000325, 0.000165, 0.000164, 0.000126, 0.00011, 0.000062, 0.00006,
        0.000056, 0.000047, 0.000042, 0.00004, 0.000037, 0.000035, 0.000023];
      for (var i = 0; i < args.length; i += 1) jde += weights[i] * sin(args[i] * RAD);
      // Terrestrial Time → UT (Espenak–Meeus ΔT for 2005–2050).
      var decades = k / 12.3685;
      var at = (jde - (62.92 + 0.32217 * decades + 0.005589 * decades * decades) / 86400 - UNIX_EPOCH_JD) * 86400000;
      newMoonCache.set(k, at);
      return at;
    }

    /**
     * The new moon nearest one instant.
     * @param ts - epoch milliseconds to search around.
     * @returns epoch milliseconds, or undefined when the input is unusable.
     */
    function nearestNewMoonMs(ts) {
      if (!Number.isFinite(ts)) return undefined;
      var k = Math.round((ts / 86400000 + UNIX_EPOCH_JD - NEW_MOON_EPOCH) / SYNODIC_MONTH);
      var best;
      for (var d = -2; d <= 2; d += 1) {
        var at = newMoonMs(k + d);
        var gap = Math.abs(at - ts);
        if (best === undefined || gap < best.gap) best = { at: at, gap: gap };
      }
      return best === undefined ? undefined : best.at;
    }
    //#endregion

    //#region lunar calendar
    /**
     * Lunar month/day labels by `Intl`'s Chinese calendar.
     *
     * Only the *month label* is taken from here, and only from a day well inside a
     * month. `Intl`'s day-of-month is deliberately ignored: it is derived from the
     * same approximate moon phase, so on a month's first day it can be a day out.
     * The label for which month a lunation belongs to is stable regardless, and is
     * what decides 正月 / 五月 / 八月 below.
     *
     * The resolved calendar is verified at load, because a runtime without the
     * Chinese calendar silently falls back to the Gregorian one — where the label
     * for May would be "5" and 端午 would land on 5月5日.
     */
    var rawLunarParts = (() => {
      try {
        var formatter = new Intl.DateTimeFormat("en-u-ca-chinese", {
          month: "numeric",
          day: "numeric",
          timeZone: "Asia/Shanghai",
        });
        if (formatter.resolvedOptions().calendar !== "chinese") return null;
        return (ts) => {
          // A guard, not politeness: `formatToParts` throws on a non-finite date,
          // and a throw here would escape into render and take the region down.
          if (!Number.isFinite(ts)) return null;
          try {
            var month;
            var day;
            for (var part of formatter.formatToParts(new Date(ts))) {
              if (part.type === "month") month = part.value;
              else if (part.type === "day") day = part.value;
            }
            if (month === undefined || day === undefined) return null;
            return { month: month, day: Number(day) };
          } catch (error) {
            return null;
          }
        };
      } catch (error) {
        return null;
      }
    })();

    /**
     * Whether a Beijing day begins a lunar month, decided by astronomy rather than
     * by `Intl`: the day is a month start exactly when the true new moon falls on it.
     * @param dayStart - epoch milliseconds of that day's Beijing midnight.
     * @returns true when a lunation begins that day.
     */
    function isNewMoonDay(dayStart) {
      var newMoon = nearestNewMoonMs(dayStart + DAY_MS / 2);
      return newMoon !== undefined && beijingFields(newMoon).dayStart === dayStart;
    }

    /**
     * The lunar month a new moon starts, as its label ("1", "5", "8", "6bis", …).
     * Sampled five days in, which is always inside the month (months run 29–30 days)
     * and therefore never on the one day `Intl` can mislabel.
     * @param dayStart - epoch milliseconds of the day that starts the month.
     * @returns the month label, or undefined when the lunar calendar is unavailable.
     */
    function lunarMonthStartingAt(dayStart) {
      if (rawLunarParts === null) return undefined;
      var probe = rawLunarParts(dayStart + 5 * DAY_MS);
      return probe === null ? undefined : probe.month;
    }

    /**
     * Whether a Beijing day is one of the three lunar statutory holidays, expressed
     * entirely as offsets from a month start so that no `Intl` day-of-month is used:
     *   春节  正月初一至初三, plus 除夕 the day before 正月初一
     *   端午  五月初五   → the month starts 4 days earlier
     *   中秋  八月十五   → the month starts 14 days earlier
     * @param fields - the instant's Beijing fields.
     * @returns the festival dictionary key, or undefined.
     */
    function lunarFestival(fields) {
      if (rawLunarParts === null) return undefined;
      var today = fields.dayStart;
      // 除夕 / 初一 / 初二 / 初三 all resolve against the same 正月初一, which is
      // today + 1, today, today - 1 or today - 2 respectively.
      for (var back = -1; back <= 2; back += 1) {
        var start = today - back * DAY_MS;
        if (isNewMoonDay(start) && lunarMonthStartingAt(start) === "1") return "festivalSpring";
      }
      if (isNewMoonDay(today - 4 * DAY_MS) && lunarMonthStartingAt(today - 4 * DAY_MS) === "5") return "festivalDragon";
      if (isNewMoonDay(today - 14 * DAY_MS) && lunarMonthStartingAt(today - 14 * DAY_MS) === "8") return "festivalMidAutumn";
      return undefined;
    }
    //#endregion

    /**
     * The statutory holiday a Beijing day belongs to, or undefined for an ordinary
     * working day.
     * @param ts - epoch milliseconds.
     * @param fields - that instant's Beijing fields.
     * @returns the festival dictionary key, or undefined.
     */
    function statutoryFestival(ts, fields) {
      if (fields.month === 1 && fields.day === 1) return "festivalNewYear";
      if (fields.month === 5 && (fields.day === 1 || fields.day === 2)) return "festivalLabour";
      if (fields.month === 10 && fields.day >= 1 && fields.day <= 3) return "festivalNational";
      if (fields.month === 4 && fields.day === qingmingDay(fields.year)) return "festivalQingming";
      return lunarFestival(fields);
    }

    /**
     * Beijing-local calendar fields of one instant.
     * @param ts - epoch milliseconds.
     * @returns year/month/day/weekday/minutes plus the instant of Beijing midnight
     *   that starts that day.
     */
    function beijingFields(ts) {
      var shifted = new Date(ts + BEIJING_OFFSET_MS);
      return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        weekday: shifted.getUTCDay(),
        minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
        dayStart: Math.floor((ts + BEIJING_OFFSET_MS) / DAY_MS) * DAY_MS - BEIJING_OFFSET_MS,
      };
    }

    /**
     * Classify one instant against the official rule.
     * @param ts - epoch milliseconds.
     * @returns `kind` ("peak" or "off") and the reason dictionary key.
     */
    function evaluatePeriod(ts) {
      var fields = beijingFields(ts);
      if (fields.weekday === 0 || fields.weekday === 6) {
        return { kind: "off", reasonKey: "reasonWeekend" };
      }
      var festival = statutoryFestival(ts, fields);
      if (festival !== undefined) return { kind: "off", reasonKey: festival };
      var peak = PEAK_WINDOWS.some((w) => fields.minutes >= w[0] && fields.minutes < w[1]);
      return { kind: peak ? "peak" : "off", reasonKey: peak ? "reasonPeak" : "reasonOffPeak" };
    }

    /** @returns the classification identity used to detect a real change. */
    function periodSignature(ts) {
      var verdict = evaluatePeriod(ts);
      return verdict.kind + "|" + verdict.reasonKey;
    }

    /**
     * The next daily boundary after one instant. The classification can only
     * change at Beijing 00:00, 09:00, 12:00, 14:00 or 18:00.
     * @param ts - epoch milliseconds.
     * @returns epoch milliseconds of that boundary.
     */
    function nextBoundaryAfter(ts) {
      var fields = beijingFields(ts);
      var offsets = [0, 9 * 60, 12 * 60, 14 * 60, 18 * 60, 24 * 60];
      var best;
      for (var i = 0; i < offsets.length; i += 1) {
        var at = fields.dayStart + offsets[i] * 60000;
        if (at > ts + 500 && (best === undefined || at < best)) best = at;
      }
      return best === undefined ? fields.dayStart + DAY_MS : best;
    }

    /**
     * Lookahead for the boundary walk. The longest genuine gap is the Spring
     * Festival break (Fri 18:00 → the following Tue 09:00, about 11 days), so 30
     * days clears every real case with room to spare.
     */
    var CHANGE_LOOKAHEAD_MS = 30 * DAY_MS;

    /**
     * Walk the daily boundaries to the next instant whose signature differs.
     * Walking is exact and costs nothing between boundaries, so the indicator
     * needs no interval timer and no request.
     * @param ts - epoch milliseconds to search forward from.
     * @param signatureOf - maps an instant to the identity being watched.
     * @returns epoch milliseconds of the change, or undefined past the cap.
     */
    function walkToChange(ts, signatureOf) {
      var here = signatureOf(ts);
      var cursor = ts;
      var limit = ts + CHANGE_LOOKAHEAD_MS;
      while (cursor < limit) {
        cursor = nextBoundaryAfter(cursor);
        if (signatureOf(cursor + 1000) !== here) return cursor;
      }
      return undefined;
    }

    /** @returns the next instant the period name or its reason changes. */
    function nextEvaluatedChange(ts) {
      return walkToChange(ts, periodSignature);
    }

    /**
     * The next instant the period *name* flips between peak and off-peak. This is
     * what the tooltip may call "距离转…", because a reason-only change (for
     * example off-peak weekday → weekend) does not switch the period.
     * @returns epoch milliseconds, or undefined when none was found.
     */
    function nextKindChange(ts) {
      return walkToChange(ts, (at) => evaluatePeriod(at).kind);
    }

    /**
     * Classify one instant and attach the display keys and both horizons.
     * @param ts - epoch milliseconds.
     * @returns the current period with label, reason, the instant this evaluation
     *   stops applying, and the instant the name actually flips.
     */
    function periodAt(ts) {
      var verdict = evaluatePeriod(ts);
      return {
        peak: verdict.kind === "peak",
        kind: verdict.kind,
        labelKey: verdict.kind === "peak" ? "peak" : "offPeak",
        reasonKey: verdict.reasonKey,
        nextChange: nextEvaluatedChange(ts),
        nextKindChange: nextKindChange(ts),
      };
    }

    /**
     * Format a switch instant as a wall-clock label that stays true without
     * re-rendering: an absolute time, relative words only within two days.
     * @param ts - epoch milliseconds of the switch.
     * @param now - epoch milliseconds of the render.
     * @param t - plugin translate function.
     * @returns the display text.
     */
    function formatSwitch(ts, now, t) {
      var target = new Date(ts + BEIJING_OFFSET_MS);
      var clock = pad2(target.getUTCHours()) + ":" + pad2(target.getUTCMinutes());
      var here = beijingFields(now);
      var there = beijingFields(ts);
      var days = Math.round((there.dayStart - here.dayStart) / DAY_MS);
      if (days === 0) return t("today") + " " + clock;
      if (days === 1) return t("tomorrow") + " " + clock;
      return pad2(there.month) + "-" + pad2(there.day) + " " + clock;
    }
    //#endregion

    //#region plugin body
    /** Services this browser half needs before it activates. */
    var inject = ["slots", "locale", "remote", "remote.account"];

    /**
     * Resolve the client build version reported to the Host for its Platform
     * request headers. The Host rejects an empty version, so a known-good
     * fallback keeps the read working on a build that carries no version.
     * @returns a non-empty version string.
     */
    function clientVersion() {
      var sources = [globalThis.__DSH_BOOT__, globalThis.__DSH_CLIENT__, globalThis];
      for (var i = 0; i < sources.length; i += 1) {
        var source = sources[i];
        if (source === undefined || source === null) continue;
        var candidate = source.version || source.clientVersion || source.dshVersion;
        if (typeof candidate === "string" && candidate !== "") return candidate;
      }
      return "0.1.7-rc.2";
    }

    /**
     * Register the sidebar status region.
     * @param ctx - Browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: zh, en: en }), "sidebar-status: dictionaries");

      //#region shared snapshot
      var snapshot = { phase: "loading", busy: false };
      var subscribers = new Set();
      var store = {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          subscribers.add(listener);
          return () => {
            subscribers.delete(listener);
          };
        },
      };
      /**
       * Merge a patch into the snapshot and notify every subscriber. Merging (not
       * replacing) is what lets the in-flight flag flip without disturbing the
       * displayed phase and data. A throwing subscriber is isolated so one bad
       * consumer cannot break the others.
       * @param patch - fields to merge.
       */
      var publish = (patch) => {
        snapshot = Object.assign({}, snapshot, patch);
        for (var listener of Array.from(subscribers)) {
          try {
            listener();
          } catch (error) {
            console.error("[sidebar-status] subscriber failed", error);
          }
        }
      };
      //#endregion

      //#region reads
      /** Bumped on teardown so a late response never publishes into a dead plugin. */
      var revision = 0;
      var inflight = false;
      var queued = false;
      var settleTimer;

      /** @returns the metadata the Host derives its Platform request headers from. */
      var metadata = () => ({
        version: clientVersion(),
        locale: ctx.locale.getSnapshot().active,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      });

      /** Read the account state and wallet balance once, then publish the result. */
      var read = async () => {
        var api = ctx.remote === undefined ? undefined : ctx.remote.account;
        if (api === undefined) {
          publish({ phase: "unavailable" });
          return;
        }
        var generation = revision;
        var balance;
        try {
          var result = await api.getBalance(metadata());
          if (!result.ok) throw new Error("account balance refused");
          balance = result.value;
        } catch (error) {
          if (generation === revision) publish({ phase: "failed" });
          return;
        }
        if (balance === null) {
          if (generation === revision) publish({ phase: "signed-out" });
          return;
        }
        var topUpUrl;
        try {
          var state = await api.getState();
          if (state.ok && state.value.status === "credential-stored") topUpUrl = state.value.links.topUpUrl;
        } catch (error) {
          topUpUrl = undefined;
        }
        if (generation !== revision) return;
        if (balance.status !== "ready") {
          publish({ phase: "failed", topUpUrl: topUpUrl });
          return;
        }
        publish({
          phase: "ready",
          wallets: balance.value,
          bonusWallets: balance.bonusWallets,
          topUpUrl: topUpUrl,
          at: Date.now(),
        });
      };

      /**
       * Start a read, collapsing overlapping requests into exactly one trailing
       * read so a burst of triggers costs two requests at most. The `busy` flag
       * stays set across the trailing read so the refresh control never flickers
       * between two back-to-back requests.
       */
      var refresh = () => {
        if (inflight) {
          queued = true;
          return;
        }
        inflight = true;
        publish({ busy: true });
        read()
          .catch(() => {})
          .then(() => {
            inflight = false;
            if (queued) {
              queued = false;
              refresh();
              return;
            }
            publish({ busy: false });
          });
      };

      /**
       * Queue the single delayed settle read that follows a finished Turn.
       * A newer Turn replaces the pending one instead of stacking.
       */
      var scheduleSettleRead = () => {
        if (settleTimer !== undefined) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
          settleTimer = undefined;
          refresh();
        }, SETTLE_DELAY_MS);
      };
      //#endregion

      //#region triggers
      ctx.effect(() => {
        var onFocus = () => refresh();
        var onVisibility = () => {
          if (document.visibilityState === "visible") refresh();
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
          window.removeEventListener("focus", onFocus);
          document.removeEventListener("visibilitychange", onVisibility);
        };
      }, "sidebar-status: focus refresh");

      ctx.effect(() => {
        var off = ctx.remote.$on("api-session/status", (_sessionId, running) => {
          if (running) return;
          refresh();
          scheduleSettleRead();
        });
        return () => {
          if (typeof off === "function") off();
          if (settleTimer !== undefined) {
            window.clearTimeout(settleTimer);
            settleTimer = undefined;
          }
        };
      }, "sidebar-status: turn-end refresh");

      ctx.effect(() => () => {
        revision += 1;
      }, "sidebar-status: read lifetime");
      //#endregion

      //#region component
      /** One readout chip: a muted label beside a primary amount. */
      var pill = (key, label, value) =>
        el("span", { key: key, className: CSS.pill }, [
          el("span", { key: "label" }, label),
          el("span", { key: "value", className: CSS.amount }, value),
        ]);

      /**
       * Render the period's reason: a festival reason names the festival, every
       * other reason is a single phrase.
       * @param period - current period snapshot.
       * @param t - plugin translate function.
       * @returns the reason text.
       */
      function reasonText(period, t) {
        if (period.reasonKey.indexOf("festival") === 0) return t("reasonHoliday") + "·" + t(period.reasonKey);
        return t(period.reasonKey);
      }

      /**
       * Build the billing-period chip's tooltip: the official label and its
       * reason, the next switch as absolute wall-clock time (so the text cannot go
       * stale between renders), the official rule, and what this indicator
       * deliberately does not model.
       * @param period - current period snapshot.
       * @param t - plugin translate function.
       * @returns the tooltip text.
       */
      function periodTitle(period, t) {
        var lines = [t(period.labelKey) + "（" + reasonText(period, t) + "）"];
        if (period.nextKindChange !== undefined) {
          lines.push((period.peak ? t("switchOffPeak") : t("switchPeak")) + " " + formatSwitch(period.nextKindChange, Date.now(), t));
        }
        lines.push(t("rule"));
        lines.push(t("ruleNote"));
        return lines.join("\n");
      }

      /** One billing-period chip: a state dot beside the official period name. */
      var periodPill = (period, t) =>
        el(
          "span",
          {
            key: "period",
            className: CSS.period + " " + (period.peak ? CSS.peak : CSS.off),
            title: periodTitle(period, t),
          },
          [el("span", { key: "dot", className: CSS.dot }), el("span", { key: "label" }, t(period.labelKey))],
        );

      /**
       * The official `IconRefreshOutline` glyph: a circular arrow, 16×16 box,
       * currentColor stroke. Path data copied verbatim from
       * `@deepseek-ai/dsh-client-ui-primitives` so this matches the app's other
       * icons instead of approximating them.
       * @param props - glyph size in pixels, plus an optional class for the spin animation.
       * @returns the inline SVG.
       */
      function RefreshGlyph({ size, className }) {
        return el(
          "svg",
          {
            width: size,
            height: size,
            className: className,
            viewBox: "0 0 16 16",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg",
            "aria-hidden": "true",
            strokeWidth: 1.3,
          },
          el("path", {
            key: "arc",
            d: "M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1",
            stroke: "currentColor",
          }),
          el("path", { key: "head", d: "M14.4999 1.5V5.1H10.8999", stroke: "currentColor" }),
        );
      }

      /**
       * The refresh control. It sits beside the balance and re-reads on demand;
       * while a read is in flight the glyph turns and further clicks are ignored
       * (an overlapping click only queues one trailing read). It is also the way
       * out of the "unavailable" state, which is why it renders in every phase.
       * @param busy - whether a read is in flight.
       * @param t - plugin translate function.
       * @returns the icon button.
       */
      var refreshButton = (busy, t) =>
        el(
          "button",
          {
            key: "refresh",
            type: "button",
            className: CSS.refresh,
            title: t("refreshBalance"),
            "aria-label": t("refreshBalance"),
            "aria-busy": busy ? "true" : "false",
            onClick: () => {
              if (!busy) refresh();
            },
          },
          el(RefreshGlyph, { key: "glyph", size: 13, className: busy ? CSS.spin : undefined }),
        );

      /**
       * Track the official billing period. The classification can only change at
       * Beijing 00:00, 09:00, 12:00, 14:00 or 18:00, so this schedules exactly one
       * timeout to the next such change and re-evaluates there: no interval, no
       * request, and nothing running in between.
       * @returns the current period snapshot.
       */
      function usePeriod() {
        var pair = React.useState(() => periodAt(Date.now()));
        var period = pair[0];
        var setPeriod = pair[1];
        React.useEffect(() => {
          var timer;
          var step = () => {
            var now = Date.now();
            var next = periodAt(now);
            setPeriod((previous) =>
              previous.kind === next.kind && previous.reasonKey === next.reasonKey && previous.nextChange === next.nextChange
                ? previous
                : next,
            );
            // A missing horizon (only possible when the holiday table does not
            // cover the year) must not become a NaN delay, which would spin.
            var wait = next.nextChange === undefined ? CHANGE_LOOKAHEAD_MS : next.nextChange - now + 1000;
            timer = window.setTimeout(step, Math.max(1000, wait));
          };
          step();
          return () => window.clearTimeout(timer);
        }, []);
        return period;
      }

      /**
       * The sidebar foot status region.
       * @param props - owner share (`wide`) plus the plugin locale seat.
       * @returns the region, or null while signed out.
       */
      function SidebarStatus({ wide, t }) {
        var state = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
        // Called before the early returns so the hook order never changes.
        var period = usePeriod();
        if (state.phase === "loading" || state.phase === "signed-out") return null;

        if (!wide) {
          var first = state.phase === "ready" ? state.wallets[0] : undefined;
          var railText = first === undefined ? "\u2014" : formatBalance(first.balance, symbolFor(first.currency));
          return el("div", { className: CSS.rail, title: railText }, railText);
        }

        var readouts = [];
        if (state.phase === "ready") {
          state.wallets.forEach((wallet) => {
            readouts.push(pill("balance-" + wallet.currency, t("balance"), formatBalance(wallet.balance, symbolFor(wallet.currency))));
          });
        }
        if (readouts.length === 0) {
          readouts.push(el("span", { key: "unavailable", className: CSS.unavailable }, t("unavailable")));
        }
        readouts.push(refreshButton(state.busy === true, t));
        readouts.push(periodPill(period, t));
        if (state.phase === "ready") {
          state.bonusWallets.filter((wallet) => isPositiveAmount(wallet.balance)).forEach((wallet) => {
            readouts.push(pill("bonus-" + wallet.currency, t("bonus"), formatBalance(wallet.balance, symbolFor(wallet.currency))));
          });
        }

        var topUp =
          state.phase === "ready" && typeof state.topUpUrl === "string" && state.topUpUrl !== ""
            ? el(
                "a",
                {
                  key: "topUp",
                  className: CSS.topUp,
                  href: state.topUpUrl,
                  target: "_blank",
                  rel: "noreferrer",
                  title: t("topUpTitle"),
                },
                t("topUp"),
              )
            : null;

        return el("div", { "data-sidebar-status": "" }, [
          el("div", { key: "readouts", className: CSS.readouts }, readouts),
          topUp,
        ]);
      }
      //#endregion

      ctx.slots.inject("sidebar.footer.action", () =>
        ctx.slots.register(
          {
            name: "sidebar.footer.action",
            id: "account-status",
            order: -1,
            locale: NS,
          },
          SidebarStatus,
        ),
      );

      refresh();
    }
    //#endregion

    exports.inject = inject;
    exports.apply = apply;
    return module.exports;
  },
});
