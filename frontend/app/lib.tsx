'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

export type Lang = 'fa' | 'en'
export type Theme = 'system' | 'light' | 'dark'
export type L = { fa: string; en: string }
export type Moment = {
  id: string; day: string; start: string; end: string; title: L; place: L; tags: string[]
  hue: number; favorite: boolean; cover: string; count: number; frames?: string[]
}
export type Day = { day: string; moments: number; photos: number; cover: string }
export type Overview = { days: Day[]; tags: string[]; totals: { moments: number; photos: number; favorites: number } }
export type Device = {
  name: string; battery: number; storage_used: number; storage_total: number; capturing: boolean
  interval: number; wifi_upload: boolean; firmware: string; last_sync: string
}
export type Plan = { id: string; price: number; yearly?: number; storage: number; features: string[] }
export type Settings = {
  blur_faces: boolean; blur_screens: boolean; share_location: boolean
  auto_delete_days: number; plan: string; plans: Plan[]
}

// Persian copy follows the Persian UX-writing vocabulary (حذف، دریافت، حریم خصوصی، تایید، ...)
const en = {
  app: 'Narrative', tagline: 'Your photographic memory',
  tab_timeline: 'Moments', tab_search: 'Search', tab_favorites: 'Favorites', tab_device: 'Device', tab_settings: 'Settings',
  morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening',
  capturing: 'Capturing', paused: 'Paused',
  ring_photos: 'Photos', ring_moments: 'Moments', ring_battery: 'Battery',
  highlight: 'Highlight of the day', days: 'Your days', today: 'Today', yesterday: 'Yesterday',
  photos_n: '{n} photos', moments_n: '{n} moments', min_n: '{n} min', of: 'of',
  empty_day: 'Nothing captured on this day.',
  search_ph: 'Search moments, places, tags…', all: 'All', results_n: '{n} results',
  no_results: 'Nothing found. Try another word.', search_eyebrow: 'Find any moment',
  albums: 'Smart albums', albums_hint: 'Grouped automatically by what happened',
  fav_eyebrow: 'Moments you love', fav_empty: 'Tap the heart on any moment to keep it here.',
  fav_added: 'Added to favorites', fav_removed: 'Removed from favorites',
  share: 'Share', copied: 'Link copied', delete: 'Delete', confirm_delete: 'Tap again to delete', deleted: 'Moment deleted',
  play: 'Play', pause: 'Pause', close: 'Close',
  device_eyebrow: 'Your Clip', every_n: 'One photo every {n} seconds',
  battery: 'Battery', storage: 'Storage', gb_of: '{a} of {b} GB',
  last_sync: 'Last sync', sync_now: 'Sync now', synced: 'Sync complete',
  pause_capture: 'Pause capture', resume_capture: 'Resume capture',
  pause_hint: 'Pause in meetings, private places, or anywhere people haven’t agreed to be photographed.',
  interval: 'Capture interval', sec: 's', wifi_upload: 'Auto-upload on Wi‑Fi', wifi_hint: 'While charging on a known network',
  firmware: 'Firmware',
  settings_eyebrow: 'Make it yours', appearance: 'Appearance', theme: 'Theme',
  theme_system: 'Auto', theme_light: 'Light', theme_dark: 'Dark', language: 'Language',
  privacy: 'Privacy', blur_faces: 'Auto-blur faces', blur_faces_hint: 'Other people’s faces are blurred before saving',
  blur_screens: 'Blur screens & documents', share_location: 'Save location',
  auto_delete: 'Auto-delete after', never: 'Never', days_n: '{n} days',
  plan: 'Subscription', plan_free: 'Basic', plan_pro: 'Pro', free: 'Free', per_month: 'per month',
  yearly: 'or {p} Toman yearly', toman: 'Toman', current: 'Current plan', choose: 'Choose', saved: 'Saved',
  f_timeline: 'Daily timeline', f_search: 'Smart search', f_30days: '30-day history', f_unlimited: 'Unlimited history',
  f_albums: 'Smart albums', f_export: 'Full data export', f_support: 'Priority support', storage_gb: '{n} GB cloud storage',
  data: 'My data', download: 'Download all data', download_hint: 'One JSON file with every moment and setting',
  error: 'Couldn’t reach the server', retry: 'Try again',
  respect: 'Capture memories, respect others.',
}
export type Key = keyof typeof en
const fa: Record<Key, string> = {
  app: 'نریتیو', tagline: 'حافظه تصویری شما',
  tab_timeline: 'خاطره‌ها', tab_search: 'جستجو', tab_favorites: 'علاقه‌مندی‌ها', tab_device: 'دستگاه', tab_settings: 'تنظیمات',
  morning: 'صبح بخیر', afternoon: 'عصر بخیر', evening: 'شب بخیر',
  capturing: 'در حال ثبت', paused: 'متوقف',
  ring_photos: 'عکس‌ها', ring_moments: 'لحظه‌ها', ring_battery: 'باتری',
  highlight: 'لحظه برجسته روز', days: 'روزهای شما', today: 'امروز', yesterday: 'دیروز',
  photos_n: '{n} عکس', moments_n: '{n} لحظه', min_n: '{n} دقیقه', of: 'از',
  empty_day: 'در این روز چیزی ثبت نشده است.',
  search_ph: 'جستجو در لحظه‌ها، مکان‌ها و برچسب‌ها…', all: 'همه', results_n: '{n} نتیجه',
  no_results: 'چیزی پیدا نشد. واژه دیگری را امتحان کنید.', search_eyebrow: 'هر لحظه‌ای را پیدا کنید',
  albums: 'آلبوم‌های خودکار', albums_hint: 'بر اساس اتفاق‌ها، خودکار دسته‌بندی شده‌اند',
  fav_eyebrow: 'لحظه‌هایی که دوست دارید', fav_empty: 'روی قلب هر لحظه بزنید تا اینجا بماند.',
  fav_added: 'به علاقه‌مندی‌ها اضافه شد', fav_removed: 'از علاقه‌مندی‌ها حذف شد',
  share: 'اشتراک‌گذاری', copied: 'پیوند کپی شد', delete: 'حذف', confirm_delete: 'برای حذف دوباره بزنید', deleted: 'لحظه حذف شد',
  play: 'پخش', pause: 'توقف', close: 'بستن',
  device_eyebrow: 'دوربین شما', every_n: 'هر {n} ثانیه یک عکس',
  battery: 'باتری', storage: 'فضای ذخیره‌سازی', gb_of: '{a} از {b} گیگابایت',
  last_sync: 'آخرین همگام‌سازی', sync_now: 'همگام‌سازی', synced: 'همگام‌سازی انجام شد',
  pause_capture: 'توقف ثبت', resume_capture: 'ادامه ثبت',
  pause_hint: 'در جلسه‌ها، مکان‌های خصوصی یا هر جا که دیگران رضایت ندارند، ثبت را متوقف کنید.',
  interval: 'فاصله ثبت', sec: 'ثانیه', wifi_upload: 'بارگذاری خودکار با وای‌فای', wifi_hint: 'هنگام شارژ و اتصال به شبکه شناخته‌شده',
  firmware: 'نسخه سیستم‌عامل',
  settings_eyebrow: 'به سلیقه خودتان', appearance: 'ظاهر', theme: 'پوسته',
  theme_system: 'خودکار', theme_light: 'روشن', theme_dark: 'تیره', language: 'زبان',
  privacy: 'حریم خصوصی', blur_faces: 'محو کردن خودکار چهره‌ها', blur_faces_hint: 'چهره دیگران پیش از ذخیره محو می‌شود',
  blur_screens: 'محو کردن صفحه‌نمایش و اسناد', share_location: 'ذخیره مکان',
  auto_delete: 'حذف خودکار پس از', never: 'هرگز', days_n: '{n} روز',
  plan: 'اشتراک', plan_free: 'پایه', plan_pro: 'حرفه‌ای', free: 'رایگان', per_month: 'ماهانه',
  yearly: 'یا {p} تومان سالانه', toman: 'تومان', current: 'اشتراک فعلی', choose: 'انتخاب', saved: 'ذخیره شد',
  f_timeline: 'خط زمانی روزانه', f_search: 'جستجوی هوشمند', f_30days: 'نگهداری ۳۰ روزه', f_unlimited: 'نگهداری نامحدود',
  f_albums: 'آلبوم‌های خودکار', f_export: 'خروجی کامل داده‌ها', f_support: 'پشتیبانی ویژه', storage_gb: '{n} گیگابایت فضای ابری',
  data: 'داده‌های من', download: 'دریافت همه داده‌ها', download_hint: 'یک فایل JSON با همه لحظه‌ها و تنظیمات',
  error: 'ارتباط با سرور برقرار نشد', retry: 'تلاش دوباره',
  respect: 'خاطره ثبت کنید، به دیگران احترام بگذارید.',
}
export const TAGS: Record<string, L> = {
  food: { fa: 'غذا', en: 'Food' }, calm: { fa: 'آرامش', en: 'Calm' }, city: { fa: 'شهر', en: 'City' },
  walk: { fa: 'پیاده‌روی', en: 'Walk' }, work: { fa: 'کار', en: 'Work' }, family: { fa: 'خانواده', en: 'Family' },
  nature: { fa: 'طبیعت', en: 'Nature' }, travel: { fa: 'سفر', en: 'Travel' }, friends: { fa: 'دوستان', en: 'Friends' },
  sport: { fa: 'ورزش', en: 'Sport' },
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch('/api' + path, { ...init, headers: { 'Content-Type': 'application/json' } })
  if (!r.ok) throw new Error(String(r.status))
  return r.json()
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState(false)
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!path) return
    let live = true
    setError(false)
    api<T>(path).then(d => live && setData(d)).catch(() => live && setError(true))
    return () => { live = false }
  }, [path, n])
  return { data, error, setData, reload: () => setN(x => x + 1) }
}

/** Cross-fade (or custom) DOM change via the native View Transitions API when available. */
export function transition(fn: () => void) {
  const d = document as Document & { startViewTransition?: (cb: () => void) => void }
  if (!d.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return fn()
  d.startViewTransition(() => flushSync(fn))
}

const resolve = (t: Theme) => t === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t
const KEY = 'narrative-prefs'
type Prefs = { lang: Lang; theme: Theme }
type Ctx = Prefs & {
  t: (k: Key, v?: Record<string, string | number>) => string
  pick: (l: L) => string
  fmt: (d: string, o: Intl.DateTimeFormatOptions) => string
  num: (n: number) => string
  pct: (n: number) => string
  setLang: (l: Lang) => void
  setTheme: (t: Theme, e?: { clientX: number; clientY: number }) => void
  dark: boolean
  notify: (msg: string) => void
}
const PrefsCtx = createContext<Ctx>(null!)
export const usePrefs = () => useContext(PrefsCtx)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Prefs | null>(null)
  const [dark, setDark] = useState(false)
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null)

  useEffect(() => {
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') } catch {}
    setP({ lang: 'fa', theme: 'system', ...saved })
  }, [])

  useEffect(() => {
    if (!p) return
    try { localStorage.setItem(KEY, JSON.stringify(p)) } catch {}
    const el = document.documentElement
    el.lang = p.lang
    el.dir = p.lang === 'fa' ? 'rtl' : 'ltr'
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => { el.dataset.theme = resolve(p.theme); setDark(el.dataset.theme === 'dark') }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [p])

  useEffect(() => {
    if (!toast) return
    const h = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(h)
  }, [toast])

  if (!p) return null
  const loc = p.lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US'
  const num = (n: number) => new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(n)
  const ctx: Ctx = {
    ...p, dark,
    num,
    pct: n => new Intl.NumberFormat(loc, { style: 'percent' }).format(n / 100),
    t: (k, v) => (p.lang === 'fa' ? fa : en)[k].replace(/\{(\w+)\}/g, (_, x) => {
      const val = v?.[x] ?? ''
      return typeof val === 'number' ? num(val) : val
    }),
    pick: l => l[p.lang],
    fmt: (d, o) => new Intl.DateTimeFormat(loc, o).format(new Date(d.length === 10 ? d + 'T12:00' : d)),
    setLang: lang => transition(() => setP({ ...p, lang })),
    setTheme: (theme, e) => {
      const el = document.documentElement
      if (e) { el.style.setProperty('--vx', e.clientX + 'px'); el.style.setProperty('--vy', e.clientY + 'px') }
      el.classList.toggle('reveal', !!e)
      transition(() => { el.dataset.theme = resolve(theme); setP({ ...p, theme }) })
    },
    notify: msg => setToast({ msg, id: Date.now() }),
  }
  return (
    <PrefsCtx.Provider value={ctx}>
      {children}
      {toast && <div className="toast" role="status" key={toast.id}>{toast.msg}</div>}
    </PrefsCtx.Provider>
  )
}

const ICONS: Record<string, string> = {
  photo: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
  camera: '<rect x="5" y="2" width="14" height="20" rx="4"/><circle cx="12" cy="10" r="3.2"/><path d="M10 17h4"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sync: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 21v-5h5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  wifi: '<path d="M5 12.5a11 11 0 0 1 14 0M1.4 9a16 16 0 0 1 21.2 0M8.5 16.1a6 6 0 0 1 7 0M12 20h.01"/>',
  eyeoff: '<path d="M9.9 9.9a3 3 0 1 0 4.2 4.2M10.7 5.1A10 10 0 0 1 12 5c7 0 10 7 10 7a13 13 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/>',
  screen: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  chip: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
}
export function Icon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  )
}

/** Photo that fades in on load; if the image host is unreachable the moment's gradient shows instead. */
export function Img({ src, className = '' }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" decoding="async" className={'img ' + className}
      onLoad={e => e.currentTarget.classList.add('ok')} onError={e => e.currentTarget.classList.add('fail')} />
  )
}
