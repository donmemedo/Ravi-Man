'use client'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import {
  api, Icon, Img, TAGS, transition, useApi, usePrefs,
  type Device, type Key, type Moment, type Overview, type Settings,
} from './lib'

type Tab = 'timeline' | 'search' | 'favorites' | 'device' | 'settings'
const TABS: [Tab, string][] = [
  ['timeline', 'photo'], ['search', 'search'], ['favorites', 'heart'], ['device', 'camera'], ['settings', 'sliders'],
]
const css = (v: Record<string, string | number>) => v as CSSProperties
const HM: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
const todayIso = () => new Date().toLocaleDateString('en-CA')

export default function Home() {
  const { t } = usePrefs()
  const [tab, setTab] = useState<Tab>('timeline')
  const [openId, setOpenId] = useState<string | null>(null)
  const [tag, setTag] = useState<string | null>(null)
  const [rev, setRev] = useState(0) // bumped after edits so lists refetch
  const [hue, setHue] = useState(20)
  const ov = useApi<Overview>(`/overview?r=${rev}`)
  const dev = useApi<Device>('/device')

  useEffect(() => { const h = location.hash.slice(1); if (h) setOpenId(h) }, [])
  const open = (id: string | null) => {
    history.replaceState(null, '', id ? '#' + id : location.pathname)
    setOpenId(id)
  }
  const go = (x: Tab, withTag: string | null = null) => {
    setTag(withTag)
    if (x !== tab) transition(() => setTab(x))
    scrollTo({ top: 0 })
  }
  const changed = () => setRev(r => r + 1)

  return (
    <div className="shell" style={css({ '--h': hue })}>
      <div className="aurora" aria-hidden><i /><i /><i /></div>
      <nav className="nav">
        <div className="brand">
          <span className="logo" />
          <div><b>{t('app')}</b><small>{t('tagline')}</small></div>
        </div>
        {TABS.map(([id, icon]) => (
          <button key={id} className="nav-item" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>
            <Icon name={icon} /><span>{t(`tab_${id}` as Key)}</span>
          </button>
        ))}
        <p className="nav-foot"><Icon name="shield" size={14} />{t('respect')}</p>
      </nav>
      <main className="view">
        {ov.error ? <><Header eyebrow={t('tagline')} title={t('app')} /><ErrorCard retry={ov.reload} /></> : <>
          {tab === 'timeline' && <Timeline ov={ov.data} dev={dev.data} rev={rev} onOpen={open} setHue={setHue} />}
          {tab === 'search' && <Search tags={ov.data?.tags ?? []} rev={rev} onOpen={open} preset={tag} />}
          {tab === 'favorites' && <Favorites rev={rev} onOpen={open} onAlbum={x => go('search', x)} />}
          {tab === 'device' && <DeviceView dev={dev} />}
          {tab === 'settings' && <SettingsView />}
        </>}
      </main>
      {openId && <Viewer id={openId} onClose={() => open(null)} onChanged={changed} />}
    </div>
  )
}

function Header({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  const { t, lang, setLang, setTheme, dark } = usePrefs()
  return (
    <header className="head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="large-title">{title}</h1>
      </div>
      <div className="head-actions">
        {children}
        <button className="icon-btn glass" aria-label={t('language')} onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}>
          <span className="lang-badge">{lang === 'fa' ? 'EN' : 'فا'}</span>
        </button>
        <button className="icon-btn glass" aria-label={t('theme')} onClick={e => setTheme(dark ? 'light' : 'dark', e)}>
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>
      </div>
    </header>
  )
}

function Timeline({ ov, dev, rev, onOpen, setHue }: {
  ov: Overview | null; dev: Device | null; rev: number; onOpen: (id: string) => void; setHue: (h: number) => void
}) {
  const { t, fmt, pick, num, pct } = usePrefs()
  const [day, setDay] = useState<string | null>(null)
  const d = day && ov?.days.some(x => x.day === day) ? day : ov?.days[0]?.day
  const ms = useApi<Moment[]>(d ? `/moments?day=${d}&r=${rev}` : null)
  const list = ms.data?.filter(m => m.day === d) ?? null
  const hero = list?.length ? list.find(m => m.favorite) ?? list[list.length - 1] : null
  const info = ov?.days.find(x => x.day === d)
  useEffect(() => { if (hero) setHue(hero.hue) }, [hero?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const h = new Date().getHours()
  const label = (x: string) => {
    const diff = Math.round((Date.parse(todayIso() + 'T12:00') - Date.parse(x + 'T12:00')) / 864e5)
    return diff === 0 ? t('today') : diff === 1 ? t('yesterday') : fmt(x, { weekday: 'short' })
  }

  return <>
    <Header eyebrow={fmt(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}
      title={t(h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening')}>
      {dev && <span className={'live glass' + (dev.capturing ? ' on' : '')}><i />{t(dev.capturing ? 'capturing' : 'paused')}</span>}
    </Header>

    <section className="hero-grid">
      {hero ? (
        <button className="hero" style={css({ '--h': hero.hue })} onClick={() => onOpen(hero.id)}>
          <Img src={hero.cover} />
          <div className="hero-body">
            <span className="pill glass"><Icon name="sparkle" size={14} />{t('highlight')}</span>
            <h2>{pick(hero.title)}</h2>
            <p><Icon name="pin" size={16} />{pick(hero.place)} · {fmt(hero.start, HM)}</p>
          </div>
          <span className="hero-play glass"><Icon name="play" size={22} /></span>
        </button>
      ) : <div className="hero skel" />}
      <div className="card rings-card">
        <Rings items={[
          { v: (info?.photos ?? 0) / 3, c: 'var(--ring1)' },
          { v: (info?.moments ?? 0) * 10, c: 'var(--ring2)' },
          { v: dev?.battery ?? 0, c: 'var(--ring3)' },
        ]} />
        <ul className="legend">
          <li style={css({ '--c': 'var(--ring1)' })}><span>{t('ring_photos')}</span><b>{num(info?.photos ?? 0)}</b></li>
          <li style={css({ '--c': 'var(--ring2)' })}><span>{t('ring_moments')}</span><b>{num(info?.moments ?? 0)}</b></li>
          <li style={css({ '--c': 'var(--ring3)' })}><span>{t('ring_battery')}</span><b>{pct(dev?.battery ?? 0)}</b></li>
        </ul>
      </div>
    </section>

    <h3 className="section-title">{t('days')}</h3>
    <div className="days">
      {ov ? ov.days.map(x => (
        <button key={x.day} className="day" aria-pressed={x.day === d} onClick={() => setDay(x.day)}>
          <Img src={x.cover} />
          <span>{label(x.day)}</span>
          <b>{fmt(x.day, { day: 'numeric' })}</b>
          <small>{t('photos_n', { n: x.photos })}</small>
        </button>
      )) : Array.from({ length: 8 }, (_, i) => <div key={i} className="day skel" />)}
    </div>

    <div className="timeline">
      {list?.length === 0 && <Empty icon="photo" text={t('empty_day')} />}
      {list ? list.map((m, i) => (
        <article key={m.id} className="tl-item" style={css({ '--h': m.hue, '--i': i })}>
          <time className="tl-time">{fmt(m.start, HM)}</time>
          <MomentCard m={m} onOpen={onOpen} />
        </article>
      )) : [0, 1, 2].map(i => <div key={i} className="tl-item"><span /><div className="m-card skel" /></div>)}
    </div>
  </>
}

function Rings({ items }: { items: { v: number; c: string }[] }) {
  return (
    <svg viewBox="0 0 120 120" className="rings" aria-hidden>
      {items.map((x, i) => {
        const r = 52 - i * (items.length > 1 ? 15 : 0)
        return (
          <g key={i} style={css({ '--c': x.c })}>
            <circle cx="60" cy="60" r={r} className="ring-bg" />
            <circle cx="60" cy="60" r={r} className="ring" pathLength={100}
              strokeDasharray={`${Math.max(0.1, Math.min(99.9, x.v))} 100`} style={css({ '--d': i * 0.15 + 's' })} />
          </g>
        )
      })}
    </svg>
  )
}

function MomentCard({ m, onOpen }: { m: Moment; onOpen: (id: string) => void }) {
  const { t, pick, num } = usePrefs()
  return (
    <button className="m-card" style={css({ '--h': m.hue })} onClick={() => onOpen(m.id)}>
      <div className="m-media">
        <Img src={m.cover} />
        {m.favorite && <span className="fav-badge"><Icon name="heart" size={14} /></span>}
        <span className="count-badge glass"><Icon name="photo" size={13} />{num(m.count)}</span>
      </div>
      <div className="m-body">
        <h4>{pick(m.title)}</h4>
        <p className="muted"><Icon name="pin" size={14} />{pick(m.place)} · {t('min_n', { n: Math.max(1, Math.round(m.count / 2)) })}</p>
        <div className="tags">{m.tags.map(x => <span key={x} className="tag">{TAGS[x] ? pick(TAGS[x]) : x}</span>)}</div>
      </div>
    </button>
  )
}

function Grid({ items, onOpen }: { items: Moment[] | null; onOpen: (id: string) => void }) {
  const { pick, fmt } = usePrefs()
  if (!items) return <div className="grid">{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className={'tile skel a' + (i % 3)} />)}</div>
  return (
    <div className="grid">
      {items.map((m, i) => (
        <button key={m.id} className={'tile a' + (i % 3)} style={css({ '--h': m.hue, '--i': Math.min(i, 12) })} onClick={() => onOpen(m.id)}>
          <Img src={m.cover} />
          {m.favorite && <span className="fav-badge"><Icon name="heart" size={14} /></span>}
          <div className="tile-body">
            <b>{pick(m.title)}</b>
            <small>{fmt(m.day, { day: 'numeric', month: 'short' })} · {pick(m.place)}</small>
          </div>
        </button>
      ))}
    </div>
  )
}

function Search({ tags, rev, onOpen, preset }: { tags: string[]; rev: number; onOpen: (id: string) => void; preset: string | null }) {
  const { t, pick } = usePrefs()
  const [q, setQ] = useState('')
  const [dq, setDq] = useState('')
  const [tag, setTag] = useState(preset)
  useEffect(() => { const h = setTimeout(() => setDq(q), 250); return () => clearTimeout(h) }, [q])
  const res = useApi<Moment[]>(`/moments?q=${encodeURIComponent(dq)}${tag ? '&tag=' + tag : ''}&r=${rev}`)
  return <>
    <Header eyebrow={t('search_eyebrow')} title={t('tab_search')} />
    <div className="search-bar">
      <label className="search">
        <Icon name="search" size={20} />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('search_ph')} enterKeyHint="search" />
      </label>
      <div className="chips">
        <button className="chip" aria-pressed={!tag} onClick={() => setTag(null)}>{t('all')}</button>
        {tags.map(x => (
          <button key={x} className="chip" aria-pressed={tag === x} onClick={() => setTag(tag === x ? null : x)}>{TAGS[x] ? pick(TAGS[x]) : x}</button>
        ))}
      </div>
    </div>
    {res.data && <p className="muted count">{t('results_n', { n: res.data.length })}</p>}
    {res.data?.length === 0 ? <Empty icon="search" text={t('no_results')} /> : <Grid items={res.data} onOpen={onOpen} />}
  </>
}

function Favorites({ rev, onOpen, onAlbum }: { rev: number; onOpen: (id: string) => void; onAlbum: (tag: string) => void }) {
  const { t, pick } = usePrefs()
  const all = useApi<Moment[]>(`/moments?r=${rev}`)
  const favs = all.data?.filter(m => m.favorite) ?? null
  const albums = useMemo(() => {
    const g: Record<string, Moment[]> = {}
    all.data?.forEach(m => m.tags.forEach(x => (g[x] ??= []).push(m)))
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length)
  }, [all.data])
  return <>
    <Header eyebrow={t('fav_eyebrow')} title={t('tab_favorites')} />
    <h3 className="section-title">{t('albums')}<small>{t('albums_hint')}</small></h3>
    <div className="albums">
      {all.data ? albums.map(([tag, ms], i) => (
        <button key={tag} className="album" style={css({ '--h': ms[0].hue, '--i': i })} onClick={() => onAlbum(tag)}>
          <div className="album-stack">{ms.slice(0, 3).reverse().map(m => <Img key={m.id} src={m.cover} />)}</div>
          <b>{TAGS[tag] ? pick(TAGS[tag]) : tag}</b>
          <small>{t('moments_n', { n: ms.length })}</small>
        </button>
      )) : [0, 1, 2, 3].map(i => <div key={i} className="album"><div className="album-stack skel" /></div>)}
    </div>
    <h3 className="section-title">{t('tab_favorites')}</h3>
    {favs?.length === 0 ? <Empty icon="heart" text={t('fav_empty')} /> : <Grid items={favs} onOpen={onOpen} />}
  </>
}

function Seg<T extends string | number>({ value, options, onChange }: {
  value: T; options: [T, ReactNode][]; onChange: (v: T, e: MouseEvent) => void
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([v, label]) => (
        <button key={String(v)} role="radio" aria-checked={v === value} onClick={e => onChange(v, e)}>{label}</button>
      ))}
    </div>
  )
}

const RowIcon = ({ name, c }: { name: string; c: string }) =>
  <span className="row-icon" style={{ background: c }}><Icon name={name} size={17} /></span>

function Toggle({ icon, c, label, hint, checked, onChange }: {
  icon: string; c: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="row">
      <RowIcon name={icon} c={c} />
      <div className="row-text"><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  )
}

function DeviceView({ dev }: { dev: ReturnType<typeof useApi<Device>> }) {
  const { t, fmt, num, pct, notify } = usePrefs()
  const [busy, setBusy] = useState(false)
  const d = dev.data
  const patch = async (body: Partial<Device>) => {
    dev.setData({ ...d!, ...body })
    try { dev.setData(await api<Device>('/device', { method: 'PATCH', body: JSON.stringify(body) })) }
    catch { notify(t('error')); dev.reload() }
  }
  const sync = async () => {
    setBusy(true)
    try {
      const [r] = await Promise.all([api<Device>('/device/sync', { method: 'POST' }), new Promise(ok => setTimeout(ok, 1200))])
      dev.setData(r)
      notify(t('synced'))
    } catch { notify(t('error')) }
    setBusy(false)
  }
  if (dev.error) return <><Header eyebrow={t('device_eyebrow')} title={t('tab_device')} /><ErrorCard retry={dev.reload} /></>
  if (!d) return <><Header eyebrow={t('device_eyebrow')} title={t('tab_device')} /><div className="card skel" style={{ height: 320 }} /></>
  return <>
    <Header eyebrow={t('device_eyebrow')} title={d.name} />
    <section className="device-grid">
      <div className={'card device-hero' + (d.capturing ? ' on' : '')}>
        <div className="clip"><span className="lens" /><span className="led" /></div>
        <p className="muted">{t('every_n', { n: d.interval })}</p>
        <button className={'capture-btn ' + (d.capturing ? 'stop' : 'go')} onClick={() => patch({ capturing: !d.capturing })}>
          <Icon name={d.capturing ? 'pause' : 'play'} size={18} />{t(d.capturing ? 'pause_capture' : 'resume_capture')}
        </button>
        <p className="hint"><Icon name="shield" size={14} />{t('pause_hint')}</p>
      </div>
      <div className="device-side">
        <div className="stats">
          <div className="card stat">
            <div className="stat-ring"><Rings items={[{ v: d.battery, c: 'var(--green)' }]} /><Icon name="bolt" size={20} /></div>
            <div><small className="muted">{t('battery')}</small><b className="big">{pct(d.battery)}</b></div>
          </div>
          <div className="card stat col">
            <small className="muted">{t('storage')}</small>
            <b className="big">{t('gb_of', { a: d.storage_used, b: d.storage_total })}</b>
            <div className="bar"><i style={{ width: `${(d.storage_used / d.storage_total) * 100}%` }} /></div>
          </div>
        </div>
        <div className="group">
          <div className="row col">
            <div className="row-head"><RowIcon name="clock" c="#0a84ff" /><b>{t('interval')}</b></div>
            <Seg value={d.interval} options={[10, 30, 60, 120].map(v => [v, `${num(v)} ${t('sec')}`])} onChange={v => patch({ interval: v })} />
          </div>
          <Toggle icon="wifi" c="#5e5ce6" label={t('wifi_upload')} hint={t('wifi_hint')} checked={d.wifi_upload} onChange={v => patch({ wifi_upload: v })} />
          <div className="row">
            <RowIcon name="sync" c="#30d158" />
            <div className="row-text"><b>{t('last_sync')}</b><small>{fmt(d.last_sync, HM)}</small></div>
            <button className="btn" onClick={sync} disabled={busy}><Icon name="sync" size={16} className={busy ? 'spin' : ''} />{t('sync_now')}</button>
          </div>
          <div className="row">
            <RowIcon name="chip" c="#8e8e93" />
            <div className="row-text"><b>{t('firmware')}</b></div>
            <span className="muted">{d.firmware.split('.').map(x => num(+x)).join('.')}</span>
          </div>
        </div>
      </div>
    </section>
  </>
}

function SettingsView() {
  const p = usePrefs()
  const { t, num } = p
  const s = useApi<Settings>('/settings')
  const patch = async (body: Partial<Settings>) => {
    s.setData({ ...s.data!, ...body })
    try {
      s.setData(await api<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(body) }))
      if (body.plan) p.notify(t('saved'))
    } catch { p.notify(t('error')); s.reload() }
  }
  const cfg = s.data
  return <>
    <Header eyebrow={t('settings_eyebrow')} title={t('tab_settings')} />
    <div className="settings">
      <section>
        <h3 className="group-title">{t('appearance')}</h3>
        <div className="group">
          <div className="row col">
            <div className="row-head"><RowIcon name={p.dark ? 'moon' : 'sun'} c="#ff9f0a" /><b>{t('theme')}</b></div>
            <Seg value={p.theme} onChange={(v, e) => p.setTheme(v, e)} options={[
              ['system', <><Icon name="sparkle" size={15} />{t('theme_system')}</>],
              ['light', <><Icon name="sun" size={15} />{t('theme_light')}</>],
              ['dark', <><Icon name="moon" size={15} />{t('theme_dark')}</>],
            ]} />
          </div>
          <div className="row col">
            <div className="row-head"><RowIcon name="globe" c="#0a84ff" /><b>{t('language')}</b></div>
            <Seg value={p.lang} onChange={v => p.setLang(v)} options={[['fa', 'فارسی'], ['en', 'English']]} />
          </div>
        </div>
      </section>

      {cfg ? <>
        <section>
          <h3 className="group-title">{t('privacy')}</h3>
          <div className="group">
            <Toggle icon="eyeoff" c="#ff375f" label={t('blur_faces')} hint={t('blur_faces_hint')} checked={cfg.blur_faces} onChange={v => patch({ blur_faces: v })} />
            <Toggle icon="screen" c="#bf5af2" label={t('blur_screens')} checked={cfg.blur_screens} onChange={v => patch({ blur_screens: v })} />
            <Toggle icon="pin" c="#30d158" label={t('share_location')} checked={cfg.share_location} onChange={v => patch({ share_location: v })} />
            <div className="row col">
              <div className="row-head"><RowIcon name="trash" c="#8e8e93" /><b>{t('auto_delete')}</b></div>
              <Seg value={cfg.auto_delete_days} onChange={v => patch({ auto_delete_days: v })}
                options={[0, 7, 30, 90].map(v => [v, v ? t('days_n', { n: v }) : t('never')])} />
            </div>
          </div>
        </section>

        <section className="wide">
          <h3 className="group-title">{t('plan')}</h3>
          <div className="plans">
            {cfg.plans.map(pl => {
              const cur = pl.id === cfg.plan
              return (
                <div key={pl.id} className={`plan ${pl.id}${cur ? ' current' : ''}`}>
                  <div className="plan-head"><b>{t(`plan_${pl.id}` as Key)}</b>{cur && <span className="pill">{t('current')}</span>}</div>
                  <p className="price">{pl.price ? <>{num(pl.price)} <small>{t('toman')} · {t('per_month')}</small></> : t('free')}</p>
                  <p className="muted">{pl.yearly ? t('yearly', { p: num(pl.yearly) }) : ' '}</p>
                  <ul>
                    <li><Icon name="check" size={16} />{t('storage_gb', { n: pl.storage })}</li>
                    {pl.features.map(f => <li key={f}><Icon name="check" size={16} />{t(`f_${f}` as Key)}</li>)}
                  </ul>
                  <button className={'btn' + (pl.id === 'pro' ? ' btn-primary' : '')} disabled={cur} onClick={() => patch({ plan: pl.id })}>
                    {cur ? t('current') : t('choose')}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h3 className="group-title">{t('data')}</h3>
          <div className="group">
            <a className="row" href="/api/export" download="narrative-export.json">
              <RowIcon name="download" c="#0a84ff" />
              <div className="row-text"><b>{t('download')}</b><small>{t('download_hint')}</small></div>
              <Icon name="chevron" size={18} className="flip muted" />
            </a>
          </div>
        </section>
      </> : s.error ? <ErrorCard retry={s.reload} /> : <div className="group skel" style={{ height: 260 }} />}
    </div>
  </>
}

function Viewer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { t, pick, fmt, num, notify } = usePrefs()
  const m = useApi<Moment>(`/moments/${id}`)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const strip = useRef<HTMLDivElement>(null)
  const d = m.data
  const frames = d?.frames ?? []
  const n = frames.length

  useEffect(() => { if (m.error) onClose() }, [m.error]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing || n < 2) return
    const h = setInterval(() => setI(x => (x + 1) % n), 450)
    return () => clearInterval(h)
  }, [playing, n])
  useEffect(() => {
    strip.current?.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [i])
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === ' ') { e.preventDefault(); setPlaying(x => !x) }
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && n) {
        setPlaying(false)
        const fwd = (e.key === 'ArrowRight') !== (document.dir === 'rtl')
        setI(x => (x + (fwd ? 1 : -1) + n) % n)
      }
    }
    addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; removeEventListener('keydown', k) }
  }, [n]) // eslint-disable-line react-hooks/exhaustive-deps

  const fav = async () => {
    const f = !d!.favorite
    m.setData({ ...d!, favorite: f })
    notify(t(f ? 'fav_added' : 'fav_removed'))
    await api(`/moments/${id}`, { method: 'PATCH', body: JSON.stringify({ favorite: f }) }).catch(() => notify(t('error')))
    onChanged()
  }
  const share = async () => {
    const url = location.href
    if (navigator.share) { try { await navigator.share({ title: pick(d!.title), url }) } catch {} }
    else { await navigator.clipboard?.writeText(url).catch(() => {}); notify(t('copied')) }
  }
  const del = async () => {
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 3000); return }
    try { await api(`/moments/${id}`, { method: 'DELETE' }); notify(t('deleted')); onChanged(); onClose() }
    catch { notify(t('error')) }
  }
  const stamp = d ? fmt(new Date(Date.parse(d.start) + i * 30000).toISOString(), { ...HM, second: '2-digit' }) : ''

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={d ? pick(d.title) : ''} style={d ? css({ '--h': d.hue }) : undefined}>
      <div className="viewer-glow" aria-hidden>{d && <img src={frames[i]} alt="" />}</div>
      <header className="viewer-bar">
        <button className="icon-btn dark" onClick={onClose} aria-label={t('close')}><Icon name="x" /></button>
        <div className="viewer-title">
          {d && <><b>{pick(d.title)}</b><small>{pick(d.place)} · {fmt(d.start, HM)} – {fmt(d.end, HM)}</small></>}
        </div>
        <div className="viewer-actions">
          <button className={'icon-btn dark' + (d?.favorite ? ' faved' : '')} onClick={fav} disabled={!d} aria-pressed={!!d?.favorite} aria-label={t('tab_favorites')}>
            <Icon name="heart" />
          </button>
          <button className="icon-btn dark" onClick={share} disabled={!d} aria-label={t('share')}><Icon name="share" /></button>
          <button className={'icon-btn dark' + (confirm ? ' danger' : '')} onClick={del} disabled={!d} aria-label={t('delete')}>
            <Icon name="trash" />{confirm && <span>{t('confirm_delete')}</span>}
          </button>
        </div>
      </header>
      <div className="stage" onClick={() => setPlaying(x => !x)}>
        {d ? frames.map((src, j) => <img key={j} src={src} alt="" className={'frame' + (j === i ? ' on' : '')} />)
          : <div className="frame on skel" />}
        {d && <span className="stamp glass">{stamp}</span>}
      </div>
      <div className="controls">
        <button className="play-btn" onClick={() => setPlaying(x => !x)} aria-label={t(playing ? 'pause' : 'play')}>
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <input type="range" className="scrub" min={0} max={Math.max(0, n - 1)} value={i} aria-label={t('play')}
          onChange={e => { setPlaying(false); setI(+e.target.value) }}
          style={css({ '--p': (n > 1 ? (i / (n - 1)) * 100 : 0) + '%' })} />
        <span className="counter">{num(i + 1)} {t('of')} {num(n)}</span>
      </div>
      <div className="strip" ref={strip}>
        {frames.map((src, j) => (
          <button key={j} aria-current={j === i || undefined} onClick={() => { setPlaying(false); setI(j) }}>
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}

const Empty = ({ icon, text }: { icon: string; text: string }) =>
  <div className="empty"><span className="empty-icon"><Icon name={icon} size={28} /></span><p>{text}</p></div>

function ErrorCard({ retry }: { retry: () => void }) {
  const { t } = usePrefs()
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name="wifi" size={28} /></span>
      <p>{t('error')}</p>
      <button className="btn btn-primary" onClick={retry}>{t('retry')}</button>
    </div>
  )
}
