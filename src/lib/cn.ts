import { Solar } from 'lunar-javascript'

// ===== 香港公眾假期 2026 (政府憲報公布) =====
// date: YYYY-MM-DD, label: 假期名稱
const HK_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': '元旦',
  '2026-02-17': '年初一',
  '2026-02-18': '年初二',
  '2026-02-19': '年初三',
  '2026-04-03': '耶穌受難節',
  '2026-04-04': '耶穌受難節翌日',
  '2026-04-06': '清明節翌日',
  '2026-04-07': '復活節星期一翌日',
  '2026-05-01': '勞動節',
  '2026-05-25': '佛誕翌日',
  '2026-06-19': '端午節',
  '2026-07-01': '特區成立紀念日',
  '2026-09-26': '中秋節翌日',
  '2026-10-01': '國慶日',
  '2026-10-19': '重陽節翌日',
  '2026-12-25': '聖誕節',
  '2026-12-26': '聖誕節翌日',
}

export interface DateInfo {
  /** 農曆：顯示用，如 「初五」 / 「十五」；初一關係用「正月」類 */
  lunarDay: string
  /** 農曆月+日，如 「正月十五」 */
  lunarFull: string
  /** 傳統節日（非公眾假期），如 中秋/重陽/除夕 */
  festival: string | null
  /** 香港公眾假期名稱，或 null */
  holiday: string | null
  /** 是否星期日（公眾假期之一） */
  isSunday: boolean
  /** 是否週末（六/日） */
  isWeekend: boolean
}

/** 農曆日的中文序數 1-30 */
const LUNAR_DAY_NAMES = [
  '初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
  '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
  '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十',
]

/** 農曆月中文 */
const LUNAR_MONTH_NAMES = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','臘月']

/** 傳統節日（農曆固定，非公眾假期）→ 日期 */
const SOLAR_FESTIVALS: Record<string, string> = {
  '2026-02-16': '除夕',
  '2026-02-17': '春節',
  '2026-09-25': '中秋節',
  '2026-10-18': '重陽節',
}

/**
 * 取得某日的農曆資訊 + 節日 + 香港公眾假期。
 */
export function getDateInfo(iso: string): DateInfo {
  const [y, m, d] = iso.split('-').map(Number)
  const lunar = Solar.fromYmd(y, m, d).getLunar()
  const dayIdx = lunar.getDay() // 1 = 初一
  const monthIdx = lunar.getMonth() // 1 = 正月
  const lunarDay = LUNAR_DAY_NAMES[dayIdx - 1] || String(dayIdx)
  const lunarFull = `${LUNAR_MONTH_NAMES[monthIdx - 1]}${lunarDay}`

  const date = new Date(y, m - 1, d)
  const week = date.getDay() // 0=日
  const holiday = HK_HOLIDAYS_2026[iso] || null
  const festival = SOLAR_FESTIVALS[iso] || null

  return {
    lunarDay,
    lunarFull,
    festival,
    holiday,
    isSunday: week === 0,
    isWeekend: week === 0 || week === 6,
  }
}

/** 是否該日需要節日/假期強調標示 */
export function hasMarker(iso: string): boolean {
  const info = getDateInfo(iso)
  return Boolean(info.holiday || info.festival || info.isSunday)
}