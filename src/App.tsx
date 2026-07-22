import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Bot,
  Braces,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ExternalLink,
  Layers3,
  Menu,
  Network,
  Route,
  Send,
  Server,
  ShieldCheck,
  Waypoints,
  X,
  Zap,
} from 'lucide-react'
import { BayerBackground } from './components/BayerBackground'

const CONTACT_API_URL = import.meta.env.VITE_VEIC_CONTACT_API_URL || 'https://api.veic.tech/api/contact'
const LOCALE_KEY = 'veic-site-locale'

type Locale = 'zh' | 'en'
type ProductTab = 'topology' | 'policy' | 'events'

interface NewsStory {
  source: string
  date: string
  title: string
  summary: string
  keywords: string
  image: string
  url: string
}

interface ProductCopy {
  eyebrow: string
  title: string
  keywords: string
  tabs: { topology: string; policy: string; events: string }
  workspace: string
  control: string
  ready: string
  sidebar: string[]
  upcoming: string
  topologyTitle: string
  policyTitle: string
  eventsTitle: string
  details: string
  online: string
  encrypted: string
  route: string
  policyRows: Array<{ source: string; destination: string; service: string; status: string }>
  eventRows: Array<{ time: string; title: string; meta: string }>
}

interface PageCopy {
  nav: { now: string; product: string; contact: string }
  hero: {
    eyebrow: string
    title: string
    statement: string
    keywords: string
    primary: string
    secondary: string
  }
  featured: NewsStory
  news: { eyebrow: string; title: string; items: NewsStory[] }
  product: ProductCopy
  contact: {
    eyebrow: string
    title: string
    keywords: string
    name: string
    reply: string
    message: string
    namePlaceholder: string
    replyPlaceholder: string
    messagePlaceholder: string
    submit: string
    sending: string
    success: string
    error: string
    footer: string
  }
}

const content: Record<Locale, PageCopy> = {
  zh: {
    nav: { now: '此刻', product: 'Veicord', contact: '联系工作室' },
    hero: {
      eyebrow: 'WELCOME TO THE NEW ERA / 2026',
      title: '欢迎来到新时代',
      statement: '技术的速度，已经超过适应它的时间。',
      keywords: '6G / IPv6 / PHYSICAL AI / MCP / AUTONOMOUS AGENT',
      primary: '继续阅读',
      secondary: '查看 Veicord',
    },
    featured: {
      source: 'ITU / IMT-2030',
      date: 'MAR 2026',
      title: 'IMT-2030 / 6G 技术要求',
      summary: 'ITU 已就评估 6G 无线接口的 IMT-2030 技术性能要求草案达成一致。',
      keywords: 'TECHNICAL REQUIREMENTS / RADIO INTERFACE',
      image: '/assets/editorial/topic-6g.png',
      url: 'https://www.itu.int/hub/2026/03/imt-2030-technical-requirements-for-the-6g-future/',
    },
    news: {
      eyebrow: 'FIELD NOTES / ARCHIVE',
      title: '技术现场',
      items: [
        {
          source: 'ANTHROPIC',
          date: 'NOV 2024',
          title: 'MODEL CONTEXT PROTOCOL',
          summary: 'MCP 是连接 AI 助手与内容库、业务工具和开发环境的开放标准。',
          keywords: 'OPEN STANDARD / TOOLS / DATA SOURCES',
          image: '/assets/editorial/topic-mcp.png',
          url: 'https://www.anthropic.com/news/model-context-protocol',
        },
        {
          source: 'NVIDIA',
          date: 'MAR 2025',
          title: 'GR00T N1 / 人形机器人基础模型',
          summary: 'NVIDIA 将 GR00T N1 称为首个开放式、完全可定制的人形机器人基础模型。',
          keywords: 'PHYSICAL AI / SIMULATION / ROBOTICS',
          image: '/assets/editorial/topic-humanoid.jpeg',
          url: 'https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-and-simulation-frameworks',
        },
        {
          source: 'OPENAI',
          date: 'MAR 2025',
          title: 'BUILDING AGENTS',
          summary: 'OpenAI 发布 Responses API、内置工具与 Agents SDK，面向 Agent 应用开发。',
          keywords: 'RESPONSES API / TOOLS / TRACING',
          image: '/assets/editorial/topic-ai-agent.png',
          url: 'https://openai.com/index/new-tools-for-building-agents/',
        },
        {
          source: 'APNIC LABS',
          date: 'LIVE DATA',
          title: 'IPv6 ADOPTION',
          summary: 'APNIC Labs 提供全球网络 IPv6 能力与实际部署水平的持续测量。',
          keywords: 'MEASUREMENT / DEPLOYMENT / INTERNET',
          image: '/assets/editorial/topic-ipv6.jpg',
          url: 'https://stats.labs.apnic.net/ipv6',
        },
      ],
    },
    product: {
      eyebrow: 'VEICORD / ALPHA',
      title: 'Veicord',
      keywords: 'WORKSPACE / BRIDGE / ROUTE / POLICY / EVENTS',
      tabs: { topology: '拓扑', policy: '策略', events: '事件' },
      workspace: 'Embodied Lab',
      control: '控制中心',
      ready: 'α Online',
      sidebar: ['总览', '控制中心', 'Bridge', '路由', '系统状态'],
      upcoming: '即将开放',
      topologyTitle: 'Agent 网络工作台',
      policyTitle: 'Zero Trust Policy',
      eventsTitle: 'Workspace Events',
      details: '工程师设备',
      online: '工作台就绪',
      encrypted: 'P2P 加密',
      route: '192.168.11.0/24',
      policyRows: [
        { source: 'Engineers', destination: 'Robot LAN', service: 'SSH · ROS · MCP', status: '允许' },
        { source: 'QA Viewers', destination: 'Test MCP', service: '443 · 8765', status: '只读' },
        { source: 'Unknown', destination: 'Any', service: 'Any', status: '拒绝' },
      ],
      eventRows: [
        { time: '18:42:09', title: 'Bridge heartbeat restored', meta: 'factory-a · 192.168.11.0/24' },
        { time: '18:41:52', title: 'Policy snapshot synchronized', meta: '3 peers · 1 active route' },
        { time: '18:40:16', title: 'Engineer peer joined', meta: 'WinB · 100.93.180.171' },
      ],
    },
    contact: {
      eyebrow: 'VEIC STUDIO',
      title: '连接真实世界',
      keywords: 'EMBODIED AI / EDGE / ZERO TRUST / AGENT INFRASTRUCTURE',
      name: '怎么称呼你',
      reply: '回复方式',
      message: '你正在连接什么',
      namePlaceholder: '名字 / 团队',
      replyPlaceholder: '邮箱 / 微信 / 链接',
      messagePlaceholder: '机器人、边缘设备或现场网络…',
      submit: '发送给工作室',
      sending: '发送中',
      success: '收到。我们会从真实场景开始聊。',
      error: '没有发送成功，请稍后再试。',
      footer: 'VEIC STUDIO · 2026',
    },
  },
  en: {
    nav: { now: 'Now', product: 'Veicord', contact: 'Contact studio' },
    hero: {
      eyebrow: 'WELCOME TO THE NEW ERA / 2026',
      title: 'Welcome to the new era',
      statement: 'Technology now moves faster than adaptation.',
      keywords: '6G / IPv6 / PHYSICAL AI / MCP / AUTONOMOUS AGENT',
      primary: 'Continue',
      secondary: 'See Veicord',
    },
    featured: {
      source: 'ITU / IMT-2030',
      date: 'MAR 2026',
      title: 'IMT-2030 / 6G TECHNICAL REQUIREMENTS',
      summary: 'ITU experts agreed draft IMT-2030 performance requirements for evaluating 6G radio interfaces.',
      keywords: 'TECHNICAL REQUIREMENTS / RADIO INTERFACE',
      image: '/assets/editorial/topic-6g.png',
      url: 'https://www.itu.int/hub/2026/03/imt-2030-technical-requirements-for-the-6g-future/',
    },
    news: {
      eyebrow: 'FIELD NOTES / ARCHIVE',
      title: 'Technology in the field',
      items: [
        {
          source: 'ANTHROPIC', date: 'NOV 2024', title: 'MODEL CONTEXT PROTOCOL',
          summary: 'An open standard connecting AI assistants to content repositories, business tools and development environments.',
          keywords: 'OPEN STANDARD / TOOLS / DATA SOURCES', image: '/assets/editorial/topic-mcp.png',
          url: 'https://www.anthropic.com/news/model-context-protocol',
        },
        {
          source: 'NVIDIA', date: 'MAR 2025', title: 'GR00T N1 / HUMANOID FOUNDATION MODEL',
          summary: 'NVIDIA describes GR00T N1 as the first open, fully customizable foundation model for humanoid robots.',
          keywords: 'PHYSICAL AI / SIMULATION / ROBOTICS', image: '/assets/editorial/topic-humanoid.jpeg',
          url: 'https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-and-simulation-frameworks',
        },
        {
          source: 'OPENAI', date: 'MAR 2025', title: 'BUILDING AGENTS',
          summary: 'Responses API, built-in tools and the Agents SDK form a new foundation for agent development.',
          keywords: 'RESPONSES API / TOOLS / TRACING', image: '/assets/editorial/topic-ai-agent.png',
          url: 'https://openai.com/index/new-tools-for-building-agents/',
        },
        {
          source: 'APNIC LABS', date: 'LIVE DATA', title: 'IPV6 ADOPTION',
          summary: 'APNIC Labs measures IPv6 capability and deployment across the global Internet.',
          keywords: 'MEASUREMENT / DEPLOYMENT / INTERNET', image: '/assets/editorial/topic-ipv6.jpg',
          url: 'https://stats.labs.apnic.net/ipv6',
        },
      ],
    },
    product: {
      eyebrow: 'VEICORD / ALPHA', title: 'Veicord',
      keywords: 'WORKSPACE / BRIDGE / ROUTE / POLICY / EVENTS',
      tabs: { topology: 'Topology', policy: 'Policy', events: 'Events' },
      workspace: 'Embodied Lab', control: 'Control Center', ready: 'α Online',
      sidebar: ['Overview', 'Control Center', 'Bridge', 'Routes', 'System'], upcoming: 'Coming next',
      topologyTitle: 'Agent Network Workspace', policyTitle: 'Zero Trust Policy', eventsTitle: 'Workspace Events',
      details: 'Engineer device', online: 'Workspace ready', encrypted: 'P2P encrypted', route: '192.168.11.0/24',
      policyRows: [
        { source: 'Engineers', destination: 'Robot LAN', service: 'SSH · ROS · MCP', status: 'Allow' },
        { source: 'QA Viewers', destination: 'Test MCP', service: '443 · 8765', status: 'Read only' },
        { source: 'Unknown', destination: 'Any', service: 'Any', status: 'Deny' },
      ],
      eventRows: [
        { time: '18:42:09', title: 'Bridge heartbeat restored', meta: 'factory-a · 192.168.11.0/24' },
        { time: '18:41:52', title: 'Policy snapshot synchronized', meta: '3 peers · 1 active route' },
        { time: '18:40:16', title: 'Engineer peer joined', meta: 'WinB · 100.93.180.171' },
      ],
    },
    contact: {
      eyebrow: 'VEIC STUDIO', title: 'Connect the real world',
      keywords: 'EMBODIED AI / EDGE / ZERO TRUST / AGENT INFRASTRUCTURE',
      name: 'Your name', reply: 'How to reply', message: 'What are you connecting?',
      namePlaceholder: 'Name / team', replyPlaceholder: 'Email / handle / link',
      messagePlaceholder: 'Robots, edge devices or field networks…', submit: 'Send to the studio',
      sending: 'Sending', success: 'Received. We will start from the real environment.',
      error: 'The message was not sent. Please try again later.', footer: 'VEIC STUDIO · 2026',
    },
  },
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'zh')
  const [menuOpen, setMenuOpen] = useState(false)
  const [productTab, setProductTab] = useState<ProductTab>('topology')
  const [startedAt] = useState(() => Date.now())
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const copy = content[locale]

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
    localStorage.setItem(LOCALE_KEY, locale)
  }, [locale])

  function closeMenu() {
    setMenuOpen(false)
  }

  async function handleContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (contactStatus === 'sending') return
    setContactStatus('sending')
    const form = new FormData(event.currentTarget)
    const payload = {
      name: String(form.get('name') || '').trim(),
      reply: String(form.get('reply') || '').trim(),
      message: String(form.get('message') || '').trim(),
      company: String(form.get('company') || ''),
      elapsedMs: Date.now() - startedAt,
      page: window.location.href,
      locale,
    }

    try {
      const response = await fetch(CONTACT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(copy.contact.error)
      setContactStatus('success')
      event.currentTarget.reset()
    } catch {
      setContactStatus('error')
    }
  }

  return (
    <div className="veic-site">
      <BayerBackground />
      <header className="site-header">
        <a className="brand-lockup" href="#top" onClick={closeMenu} aria-label="VEIC Studio home">
          <img src="/assets/app-icon.png" alt="" />
          <span><strong>VEIC</strong><small>STUDIO / 2026</small></span>
        </a>
        <nav className={menuOpen ? 'site-nav is-open' : 'site-nav'} aria-label="Primary navigation">
          <a href="#now" onClick={closeMenu}>{copy.nav.now}</a>
          <a href="#veicord" onClick={closeMenu}>{copy.nav.product}</a>
          <a href="#contact" onClick={closeMenu}>{copy.nav.contact}</a>
        </nav>
        <div className="header-actions">
          <div className="locale-switch" aria-label="Language switch">
            <button type="button" className={locale === 'zh' ? 'active' : ''} onClick={() => setLocale('zh')}>中</button>
            <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
          </div>
          <button className="menu-button" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(value => !value)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <main id="top" className="site-main">
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">{copy.hero.eyebrow}</p>
            <h1>{copy.hero.title}</h1>
            <p className="hero-statement">{copy.hero.statement}</p>
            <p className="hero-keywords">{copy.hero.keywords}</p>
            <div className="hero-actions">
              <a className="button primary" href="#now">{copy.hero.primary}<ArrowDown /></a>
              <a className="button secondary" href="#veicord">{copy.hero.secondary}<ArrowRight /></a>
            </div>
          </div>
          <NewsCard story={copy.featured} featured />
        </section>

        <section id="now" className="content-section news-section">
          <div className="section-heading">
            <p className="eyebrow">{copy.news.eyebrow}</p>
            <h2>{copy.news.title}</h2>
          </div>
          <div className="news-grid">
            {copy.news.items.map(story => <NewsCard key={story.source} story={story} />)}
          </div>
        </section>

        <section id="veicord" className="content-section product-section">
          <div className="section-heading product-heading">
            <div><p className="eyebrow">{copy.product.eyebrow}</p><h2>{copy.product.title}</h2></div>
            <p>{copy.product.keywords}</p>
          </div>
          <div className="product-card">
            <VeicordDemo copy={copy.product} tab={productTab} onTabChange={setProductTab} />
          </div>
        </section>

        <section id="contact" className="content-section contact-section">
          <div className="contact-copy">
            <p className="eyebrow">{copy.contact.eyebrow}</p>
            <h2>{copy.contact.title}</h2>
            <p>{copy.contact.keywords}</p>
          </div>
          <form className="contact-form" onSubmit={handleContact}>
            <label><span>{copy.contact.name}</span><input name="name" maxLength={80} placeholder={copy.contact.namePlaceholder} required /></label>
            <label><span>{copy.contact.reply}</span><input name="reply" maxLength={160} placeholder={copy.contact.replyPlaceholder} required /></label>
            <label><span>{copy.contact.message}</span><textarea name="message" maxLength={2200} placeholder={copy.contact.messagePlaceholder} required /></label>
            <label className="contact-honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
            <button className="button primary" type="submit" disabled={contactStatus === 'sending'}>
              <Send />{contactStatus === 'sending' ? copy.contact.sending : copy.contact.submit}
            </button>
            <p className={`contact-status is-${contactStatus}`} role="status" aria-live="polite">
              {contactStatus === 'success' ? copy.contact.success : null}
              {contactStatus === 'error' ? copy.contact.error : null}
            </p>
          </form>
          <footer>{copy.contact.footer}</footer>
        </section>
      </main>
    </div>
  )
}

function NewsCard({ story, featured = false }: { story: NewsStory; featured?: boolean }) {
  return (
    <a className={featured ? 'news-card featured-news-card' : 'news-card'} href={story.url} target="_blank" rel="noreferrer">
      <img src={story.image} alt="" />
      <div className="news-card-shade" />
      <div className="news-card-meta"><span>{story.source}</span><time>{story.date}</time></div>
      <div className="news-card-copy">
        <h2>{story.title}</h2>
        <p className="news-card-summary">{story.summary}</p>
        <p className="news-card-keywords">{story.keywords}</p>
      </div>
      <span className="news-card-link"><ExternalLink /></span>
    </a>
  )
}

function VeicordDemo({ copy, tab, onTabChange }: { copy: ProductCopy; tab: ProductTab; onTabChange: (tab: ProductTab) => void }) {
  return (
    <div className="veicord-window">
      <aside className="demo-sidebar">
        <div className="demo-brand"><img src="/assets/app-icon.png" alt="" /><span><strong>Veicord</strong><small>ENGINEER / ALPHA</small></span></div>
        <div className="demo-workspace"><small>WORKSPACE</small><strong>{copy.workspace}</strong><ChevronRight /></div>
        <nav>
          {copy.sidebar.map((item, index) => (
            <button key={item} type="button" className={index === 1 ? 'active' : ''}>
              {index === 0 ? <Layers3 /> : index === 1 ? <Network /> : index === 2 ? <Server /> : index === 3 ? <Route /> : <Activity />}
              <span>{item}</span>
            </button>
          ))}
        </nav>
        <div className="demo-upcoming"><small>{copy.upcoming}</small><span><Cpu /> EDGE DEVICES</span><span><Braces /> MCP SERVICES</span><span><Bot /> AGENT TASKS</span></div>
        <div className="demo-account"><i>E</i><span><strong>engineer</strong><small>studio@veic</small></span></div>
      </aside>
      <div className="demo-main">
        <header className="demo-toolbar">
          <div><span>{copy.workspace}</span><ChevronRight /><strong>{copy.control}</strong></div>
          <div><span className="demo-live"><i />{copy.ready}</span><button type="button"><Zap /> CONNECT</button></div>
        </header>
        <section className="demo-workbench">
          <div className="demo-heading"><div><small>AGENT NETWORK</small><h3>{copy.topologyTitle}</h3></div><span><i />{copy.online}</span></div>
          <div className="demo-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'topology'} className={tab === 'topology' ? 'active' : ''} onClick={() => onTabChange('topology')}><Waypoints />{copy.tabs.topology}</button>
            <button role="tab" aria-selected={tab === 'policy'} className={tab === 'policy' ? 'active' : ''} onClick={() => onTabChange('policy')}><ShieldCheck />{copy.tabs.policy}</button>
            <button role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'active' : ''} onClick={() => onTabChange('events')}><Activity />{copy.tabs.events}</button>
          </div>
          <div className="demo-content">
            <div className="demo-surface">{tab === 'topology' ? <MiniTopology copy={copy} /> : tab === 'policy' ? <MiniPolicy copy={copy} /> : <MiniEvents copy={copy} />}</div>
            <aside className="demo-detail">
              <div><small>{copy.details}</small><strong>WinA</strong></div>
              <div className="detail-state"><CheckCircle2 /><span><small>STATUS</small><strong>{copy.online}</strong></span></div>
              <dl><div><dt>OVERLAY IP</dt><dd>100.93.224.13</dd></div><div><dt>NETWORK</dt><dd>{copy.encrypted}</dd></div><div><dt>ROUTE</dt><dd>{copy.route}</dd></div></dl>
            </aside>
          </div>
        </section>
      </div>
    </div>
  )
}

function MiniTopology({ copy }: { copy: ProductCopy }) {
  return <div className="mini-topology"><div className="topology-label"><Waypoints /><strong>{copy.topologyTitle}</strong><span>7 NODES</span></div><div className="topology-chain"><MiniNode icon={<Cpu />} kind="DEVICE" name="WinA" meta="100.93.224.13" /><ChevronRight /><MiniNode icon={<ShieldCheck />} kind="GROUP" name="Engineers" meta="2 PEERS" /><ChevronRight /><MiniNode icon={<Network />} kind="NETWORK" name="Workspace" meta="P2P MESH" /><ChevronRight /><MiniNode icon={<Server />} kind="BRIDGE" name="factory-a" meta="ONLINE" /><ChevronRight /><MiniNode icon={<Cpu />} kind="LAN" name="Robot" meta="192.168.11.126" /></div><div className="topology-legend"><span><i />ONLINE</span><span><b />ZERO TRUST EDGE</span></div></div>
}

function MiniNode({ icon, kind, name, meta }: { icon: ReactNode; kind: string; name: string; meta: string }) {
  return <article className="mini-node"><span>{icon}</span><div><small>{kind}</small><strong>{name}</strong><code>{meta}</code></div></article>
}

function MiniPolicy({ copy }: { copy: ProductCopy }) {
  return <div className="mini-table"><div className="mini-table-title"><ShieldCheck /><strong>{copy.policyTitle}</strong><span>DEFAULT DENY</span></div><div className="mini-table-head"><span>SOURCE</span><span>DESTINATION</span><span>SERVICE</span><span>DECISION</span></div>{copy.policyRows.map(row => <div className="mini-table-row" key={row.source}><strong>{row.source}</strong><span>{row.destination}</span><code>{row.service}</code><small>{row.status}</small></div>)}</div>
}

function MiniEvents({ copy }: { copy: ProductCopy }) {
  return <div className="mini-events"><div className="mini-table-title"><Activity /><strong>{copy.eventsTitle}</strong><span>LIVE STREAM</span></div>{copy.eventRows.map(event => <article key={event.time}><time>{event.time}</time><i /><div><strong>{event.title}</strong><span>{event.meta}</span></div><ChevronRight /></article>)}</div>
}
