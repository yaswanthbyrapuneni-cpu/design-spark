import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  BookOpenCheck,
  BrainCircuit,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Compass,
  Copy,
  Gauge,
  GraduationCap,
  Layers,
  Menu,
  MessagesSquare,
  Network,
  RefreshCw,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  X,
  ChevronDown,
  CheckSquare,
  Map,
  Kanban,
  Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'
import {
  aiChat,
  aiPitch,
  aiScore,
  generateReadinessScore,
  getAdminCohorts,
  getAdminDashboard,
  getAdminDistricts,
  getAdminStartups,
  getCollaborators,
  getLearningPath,
  getMentorDashboard,
  getMentorSessions,
  getOpportunityMatches,
  getReadinessScore,
  getStartup,
  saveStartupProfile,
  demoLogin,
} from './lib/api'
import type { StartupProfile } from './lib/api'
import { adminDashboard, opportunities, readiness, startup } from './lib/demoData'

// ─── Types ────────────────────────────────────────────────────────────────────
type Opportunity = { title: string; type: string; sponsor: string; match: number; deadline: string; reasons: string[] }

// ─── Animation helpers ────────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
}

function PageMotion({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start = 0
    const timer = setInterval(() => {
      start += Math.ceil(target / (duration / 16))
      if (start >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

function AnimatedBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${width}%`, background: color, transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  )
}

// ─── Navigation (grouped by role) ────────────────────────────────────────────
const navGroups = [
  {
    label: 'Startup Journey',
    items: [
      { path: '/startup/dashboard', label: 'Dashboard', icon: Rocket },
      { path: '/startup/onboarding', label: 'Onboarding', icon: ClipboardCheck },
      { path: '/startup/readiness', label: 'AI Readiness', icon: Gauge },
      { path: '/startup/opportunities', label: 'Opportunities', icon: Compass },
      { path: '/startup/learning', label: 'Learning Path', icon: BookOpenCheck },
      { path: '/startup/ai-twin', label: 'AI Twin Chat', icon: Bot },
      { path: '/startup/pitch', label: 'AI Pitch', icon: Sparkles },
      { path: '/startup/collaborate', label: 'Collaborate', icon: Network },
    ],
  },
  {
    label: 'Admin Intelligence',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: BarChart3 },
      { path: '/admin/startups', label: 'All Startups', icon: Building2 },
      { path: '/admin/districts', label: 'Districts', icon: Map },
      { path: '/admin/pilots', label: 'Pilot Pipeline', icon: Kanban },
      { path: '/admin/cohorts', label: 'Cohorts', icon: Layers },
    ],
  },
  {
    label: 'Mentor Desk',
    items: [
      { path: '/mentor/dashboard', label: 'My Dashboard', icon: UserRoundCheck },
      { path: '/mentor/sessions', label: 'Sessions', icon: CalendarClock },
    ],
  },
]

const allNavItems = navGroups.flatMap((g) => g.items)

const mobileNavItems = [
  { path: '/startup/dashboard', label: 'Startup', icon: Rocket },
  { path: '/startup/readiness', label: 'Readiness', icon: Gauge },
  { path: '/admin/dashboard', label: 'Admin', icon: BarChart3 },
  { path: '/mentor/dashboard', label: 'Mentor', icon: UserRoundCheck },
  { path: '/startup/ai-twin', label: 'AI Twin', icon: Bot },
]

const ROLE_GROUP: Record<string, string> = {
  startup: 'Startup Journey',
  admin: 'Admin Intelligence',
  mentor: 'Mentor Desk',
}

const ROLE_LABELS: Record<string, string> = {
  startup: 'Startup Founder',
  admin: 'APIS Admin',
  mentor: 'Ecosystem Mentor',
}

const ROLE_COLORS: Record<string, string> = {
  startup: '#0f6e56',
  admin: '#4338ca',
  mentor: '#b45309',
}

function useStoredRole() {
  const [role, setRoleState] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem('ap-innovationos-role') ?? 'null') ?? '' } catch { return '' }
  })
  function setRole(r: string) {
    localStorage.setItem('ap-innovationos-role', JSON.stringify(r))
    setRoleState(r)
  }
  return { role, setRole }
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { role, setRole } = useStoredRole()

  const isLanding = location.pathname === '/'

  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate('/admin/startups', { state: { search: searchQuery.trim() } })
      setSearchQuery('')
    }
  }

  const activePath = useMemo(() => {
    return allNavItems.find((item) => location.pathname.startsWith(item.path))?.path ?? ''
  }, [location.pathname])

  const visibleGroups = useMemo(() => {
    if (!role) return navGroups
    const targetLabel = ROLE_GROUP[role]
    return navGroups.filter((g) => g.label === targetLabel)
  }, [role])

  const mobileItems = useMemo(() => {
    if (!role) return mobileNavItems
    const group = navGroups.find((g) => g.label === ROLE_GROUP[role])
    return group ? group.items.slice(0, 5) : mobileNavItems
  }, [role])

  if (isLanding) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route element={<Landing onRoleSelect={setRole} />} path="/" />
        </Routes>
      </AnimatePresence>
    )
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <p>AP InnovationOS</p>
            <span>RTIH / APIS demo</span>
          </div>
        </div>
        {role && (
          <div className="role-pill" style={{ borderColor: ROLE_COLORS[role] + '44', color: ROLE_COLORS[role], background: ROLE_COLORS[role] + '18' }}>
            <div className="role-pill-dot" style={{ background: ROLE_COLORS[role] }} />
            {ROLE_LABELS[role]}
          </div>
        )}
        <nav>
          {visibleGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <Link className={activePath === item.path ? 'active' : ''} key={item.path} onClick={() => setMenuOpen(false)} to={item.path}>
                    <Icon size={16} />{item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="side-card">
          <div className="pulse-dot" />
          <p>Demo startup</p>
          <strong>{startup.name}</strong>
          <span>{startup.sector} / {startup.stage}</span>
        </div>
        <Link to="/" onClick={() => setRole('')} className="switch-role-btn">
          <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
          Switch role
        </Link>
      </aside>

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} type="button">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <div className="search">
            <Search size={17} />
            <input
              placeholder="Search startups, pilots, mentors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
          <div className="top-actions">
            <span className="status-pill"><Activity size={15} />AI + demo-safe fallback</span>
            <Link className="button-link" to="/">Home</Link>
          </div>
        </header>

        <div className="content">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route element={<Login />} path="/login" />
              <Route element={<StartupDashboard />} path="/startup/dashboard" />
              <Route element={<Onboarding />} path="/startup/onboarding" />
              <Route element={<Readiness />} path="/startup/readiness" />
              <Route element={<Opportunities />} path="/startup/opportunities" />
              <Route element={<Learning />} path="/startup/learning" />
              <Route element={<AiTwin />} path="/startup/ai-twin" />
              <Route element={<PitchGenerator />} path="/startup/pitch" />
              <Route element={<CollaborateDiscover />} path="/startup/collaborate" />
              <Route element={<Admin />} path="/admin/dashboard" />
              <Route element={<AdminStartups />} path="/admin/startups" />
              <Route element={<AdminDistricts />} path="/admin/districts" />
              <Route element={<AdminPilots />} path="/admin/pilots" />
              <Route element={<AdminCohorts />} path="/admin/cohorts" />
              <Route element={<MentorDashboard />} path="/mentor/dashboard" />
              <Route element={<MentorSessions />} path="/mentor/sessions" />
              <Route element={<Navigate replace to="/" />} path="*" />
            </Routes>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {mobileItems.map((item) => {
          const Icon = item.icon
          const isActive = activePath === item.path
          return (
            <Link key={item.path} to={item.path} className={isActive ? 'active' : ''}>
              <Icon size={22} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}


// ─── Landing Page (full-screen, no sidebar) ───────────────────────────────────
function Landing({ onRoleSelect }: { onRoleSelect: (r: string) => void }) {
  const navigate = useNavigate()
  const totalStartups = useCountUp(132)
  const mentors = useCountUp(38)
  const pilotReady = useCountUp(24)
  const districts = useCountUp(8)

  const roles = [
    {
      id: 'startup',
      icon: Rocket,
      color: '#0f6e56',
      bg: '#edf7f3',
      title: 'Startup Founder',
      tagline: 'Get your AI readiness score',
      description: 'Onboard your startup, receive an AI-powered readiness assessment, discover pilot opportunities, and connect with mentors.',
      steps: ['Onboard profile', 'AI Readiness Score', 'Match opportunities', 'Generate pitch'],
      cta: 'Enter as Founder',
      route: '/startup/dashboard',
    },
    {
      id: 'admin',
      icon: BarChart3,
      color: '#4338ca',
      bg: '#eef2ff',
      title: 'APIS / RTIH Admin',
      tagline: 'Manage the AP ecosystem',
      description: 'View pipeline analytics, track pilot-ready startups across districts, manage cohorts, and monitor ecosystem health.',
      steps: ['District intelligence', 'Pilot pipeline', 'Startup scoring', 'Cohort tracking'],
      cta: 'Enter as Admin',
      route: '/admin/dashboard',
    },
    {
      id: 'mentor',
      icon: UserRoundCheck,
      color: '#b45309',
      bg: '#fef3c7',
      title: 'Ecosystem Mentor',
      tagline: 'Guide assigned startups',
      description: 'Review your assigned startup portfolios, track readiness gaps, schedule sessions, and provide targeted guidance.',
      steps: ['Startup portfolio', 'Gap analysis', 'Session log', 'AI mentor match'],
      cta: 'Enter as Mentor',
      route: '/mentor/dashboard',
    },
  ]

  return (
    <motion.div className="landing-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* Top bar */}
      <header className="landing-topbar">
        <div className="landing-brand">
          <div className="landing-brand-mark"><Sparkles size={20} /></div>
          <div>
            <span className="landing-brand-name">AP InnovationOS</span>
            <span className="landing-brand-sub">RTIH × APIS × SoDT — Design Spark 2026</span>
          </div>
        </div>
        <div className="landing-top-right">
          <span className="landing-badge"><Activity size={13} />AI-powered · Live demo</span>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <motion.div className="landing-hero-inner" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}>
          <div className="landing-eyebrow">
            <ShieldCheck size={14} />
            <span>Design Spark Challenge 2026 — Problem Statement #3</span>
          </div>
          <h1 className="landing-h1">
            AI-powered startup intelligence<br />
            <span className="landing-h1-accent">for Andhra Pradesh.</span>
          </h1>
          <p className="landing-sub">
            AP InnovationOS helps APIS identify pilot-ready startups, helps founders understand their readiness gaps, and gives mentors the context they need — all in one platform.
          </p>

          {/* Stats row */}
          <div className="landing-stats">
            <div className="landing-stat"><strong>{totalStartups}</strong><span>Startups mapped</span></div>
            <div className="landing-stat-divider" />
            <div className="landing-stat"><strong>{mentors}</strong><span>Mentors active</span></div>
            <div className="landing-stat-divider" />
            <div className="landing-stat"><strong>{pilotReady}</strong><span>Pilot-ready</span></div>
            <div className="landing-stat-divider" />
            <div className="landing-stat"><strong>{districts}</strong><span>Districts covered</span></div>
          </div>
        </motion.div>
      </section>

      {/* Role cards */}
      <section className="landing-roles">
        <p className="landing-roles-label">Choose a role to explore the platform</p>
        <div className="landing-role-grid">
          {roles.map((role, i) => {
            const Icon = role.icon
            return (
              <motion.div
                key={role.id}
                className="landing-role-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                whileHover={{ y: -4, boxShadow: '0 24px 60px rgba(15,23,42,0.13)' }}
              >
                <div className="landing-role-icon" style={{ background: role.bg, color: role.color }}>
                  <Icon size={28} />
                </div>
                <div className="landing-role-tag" style={{ color: role.color, background: role.bg }}>{role.tagline}</div>
                <h2 className="landing-role-title">{role.title}</h2>
                <p className="landing-role-desc">{role.description}</p>
                <ul className="landing-role-steps">
                  {role.steps.map((step) => (
                    <li key={step}><CheckCircle2 size={14} style={{ color: role.color }} />{step}</li>
                  ))}
                </ul>
                <button
                  className="landing-role-btn"
                  style={{ background: role.color }}
                  onClick={() => { onRoleSelect(role.id); navigate(role.route) }}
                >
                  {role.cta} <ArrowRight size={16} />
                </button>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Footer strip */}
      <footer className="landing-footer">
        <span>Built by AISMARTLIVE SOLUTIONS PVT LTD for Design Spark Challenge 2026</span>
        <span className="landing-footer-divider">·</span>
        <span>Gemini AI · FastAPI · React · Supabase</span>
      </footer>
    </motion.div>
  )
}

// ─── Screen 2: Login ─────────────────────────────────────────────────────────
function Login() {
  const navigate = useNavigate()
  const [loadingRole, setLoadingRole] = useState('')

  async function chooseRole(role: 'startup' | 'mentor' | 'admin') {
    setLoadingRole(role)
    const user = await demoLogin(role)
    window.localStorage.setItem('ap-innovationos-user', JSON.stringify(user))
    navigate(user.defaultRoute)
  }

  const roles = [
    { id: 'startup' as const, title: 'Startup Founder', email: 'startup@demo.com', text: 'Onboard, get AI readiness score, follow learning, and match with pilots.', icon: Rocket },
    { id: 'mentor' as const, title: 'Mentor', email: 'mentor@demo.com', text: 'Review assigned startups, readiness gaps, sessions, and action items.', icon: UserRoundCheck },
    { id: 'admin' as const, title: 'APIS / RTIH Admin', email: 'admin@demo.com', text: 'Track pipeline, districts, pilot-ready startups, and ecosystem intelligence.', icon: BarChart3 },
  ]

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Demo Role Entry" title="One platform, three ecosystem experiences." text="Choose a role to enter the prototype with the correct workflow and navigation context." />
        <div className="role-grid">
          {roles.map((role) => {
            const Icon = role.icon
            return (
              <motion.article className="role-card" key={role.id} whileHover={{ y: -4, boxShadow: '0 20px 50px rgba(0,0,0,0.12)' }} transition={{ duration: 0.18 }}>
                <div className="role-icon"><Icon size={26} /></div>
                <h2>{role.title}</h2>
                <strong>{role.email}</strong>
                <p>{role.text}</p>
                <button onClick={() => chooseRole(role.id)} type="button">
                  {loadingRole === role.id ? 'Opening...' : `Enter as ${role.title}`}
                  <ArrowRight size={18} />
                </button>
              </motion.article>
            )
          })}
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 3: Onboarding (3-step wizard) ────────────────────────────────────
function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<StartupProfile>(startup)

  useEffect(() => { getStartup().then(setProfile) }, [])

  function update(field: keyof StartupProfile, value: string) {
    setProfile((cur) => ({ ...cur, [field]: field === 'team' ? Number(value) : value }))
  }

  async function handleSubmit() {
    setSaving(true)
    await saveStartupProfile(profile)
    await generateReadinessScore(profile)
    setSaving(false)
    navigate('/startup/readiness')
  }

  const steps = ['Company Profile', 'Product Details', 'Needs & Goals']
  const AP_DISTRICTS = ['Visakhapatnam', 'Vijayawada', 'Tirupati', 'Guntur', 'Kurnool', 'Rajahmundry', 'Nellore', 'Anantapur']
  const STAGES = ['Idea', 'Prototype', 'MVP', 'Growth', 'Scale']
  const MVP_OPTIONS = ['Not started', 'In development', 'MVP live', 'Pilot deployed', 'Revenue generating']
  const PILOT_OPTIONS = ['No, not yet', 'Maybe, exploring', 'Yes, actively seeking', 'Yes, pilot in progress']

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Startup Digital Profile" title="Capture the data needed for AI scoring and pilot matching." text="This intake flow converts your application data into ecosystem intelligence." />
        <div className="wizard">
          {/* Progress bar */}
          <div className="wizard-progress">
            {steps.map((s, i) => (
              <div key={s} className={`wiz-step ${i <= step ? 'done' : ''} ${i === step ? 'current' : ''}`}>
                <div className="wiz-step-circle">{i < step ? <CheckCircle2 size={16} /> : i + 1}</div>
                <span>{s}</span>
                {i < steps.length - 1 && <div className="wiz-step-line" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
                <div className="form-grid">
                  <Field label="Startup name" value={profile.name} onChange={(v) => update('name', v)} />
                  <Field label="District" value={profile.district} onChange={(v) => update('district', v)} options={AP_DISTRICTS} />
                  <Field label="Sector" value={profile.sector} onChange={(v) => update('sector', v)} />
                  <Field label="Stage" value={profile.stage} onChange={(v) => update('stage', v)} options={STAGES} />
                  <Field label="DPIIT number" value={profile.dpiit} onChange={(v) => update('dpiit', v)} />
                  <Field label="Team size" value={`${profile.team}`} onChange={(v) => update('team', v)} type="number" />
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
                <div className="form-grid">
                  <Field className="wide" label="Problem and solution" value={profile.description} onChange={(v) => update('description', v)} multiline />
                  <Field className="wide" label="Target users" value={profile.users} onChange={(v) => update('users', v)} multiline />
                  <Field label="MVP status" value={profile.stage} onChange={(v) => update('stage', v)} options={MVP_OPTIONS} />
                  <Field label="Funding need" value={profile.pilot} onChange={(v) => update('pilot', v)} />
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
                <div className="form-grid">
                  <Field label="Pilot interest" value={profile.pilot} onChange={(v) => update('pilot', v)} options={PILOT_OPTIONS} />
                  <Field label="Mentorship need" value={profile.mentorshipNeed} onChange={(v) => update('mentorshipNeed', v)} />
                  <div className="field wide upload-field">
                    <span>Pitch deck upload</span>
                    <label className="upload-box">
                      <input type="file" accept=".pdf,.ppt,.pptx" hidden />
                      <BookOpenCheck size={24} />
                      <strong>Click to upload pitch deck</strong>
                      <span>PDF, PPT up to 10 MB</span>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="wizard-footer">
            <div className="wiz-nav">
              {step > 0 && (
                <button className="btn-secondary" onClick={() => setStep((s) => s - 1)} type="button">Back</button>
              )}
              {step < 2 ? (
                <button onClick={() => setStep((s) => s + 1)} type="button">Continue <ArrowRight size={18} /></button>
              ) : (
                <button disabled={saving} onClick={handleSubmit} type="button">
                  {saving ? 'Generating AI report...' : 'Generate Readiness Report'}
                  <Sparkles size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 4: Readiness ─────────────────────────────────────────────────────
function Readiness() {
  const navigate = useNavigate()
  const [report, setReport] = useState(readiness)
  const [profile, setProfile] = useState<StartupProfile>(startup)
  const [loading, setLoading] = useState(true)
  const scoreCount = useCountUp(loading ? 0 : report.overall)

  useEffect(() => {
    Promise.all([getStartup(), getReadinessScore()]).then(([p, d]) => { setProfile(p); setReport(d); setLoading(false) })
  }, [])

  async function refreshScore() {
    setLoading(true)
    setReport(await aiScore())
    setLoading(false)
  }

  const bandColor = { 'Ready': '#0f6e56', 'Near Ready': '#ba7517', 'Emerging': '#185fa5', 'Not Ready': '#d85a30' }
  const band = report.band ?? (report as unknown as { pilot_band?: string }).pilot_band ?? 'Emerging'
  const bc = bandColor[band as keyof typeof bandColor] ?? '#185fa5'

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="AI Readiness Report" title={`${profile.name} is ${band.toLowerCase()} for a public innovation pilot.`} text="The report turns onboarding data into a score, readiness band, strengths, gaps, and next actions." />
        <div className="readiness-layout">
          <div className="readiness-main">
            <div className="readiness-header">
              <div>
                <span className="eyebrow mini">Pilot band</span>
                <h2 style={{ color: bc, marginBottom: 4 }}>{band}</h2>
                <p style={{ color: '#667085', margin: 0 }}>{profile.sector} / {profile.stage} / {profile.district}</p>
              </div>
              <button className="icon-action" onClick={refreshScore} type="button">
                <Sparkles size={18} />{loading ? 'Scoring with AI...' : 'Re-score with AI'}
              </button>
              <motion.div className="big-score" key={scoreCount} initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                {loading ? '...' : scoreCount}
              </motion.div>
            </div>
            <div className="score-list">
              {report.scores.map((score, i) => (
                <div className="score-line" key={score.label}>
                  <span>{score.label}</span>
                  <AnimatedBar value={loading ? 0 : score.value} color={score.color} delay={i * 120} />
                  <b>{score.value}</b>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 12, color: '#667085', fontSize: 13, fontWeight: 900 }}>SCORE TREND</h3>
              <ResponsiveContainer height={80} width="100%">
                <LineChart data={[{ w: 1, v: 62 }, { w: 2, v: 68 }, { w: 3, v: report.overall }]}>
                  <Line type="monotone" dataKey="v" stroke="#0f6e56" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="insight-column">
            <Insight items={report.strengths} title="Strengths" />
            <Insight danger items={report.gaps} title="Gaps" />
            <Insight items={report.nextSteps} title="Next steps" />
            <div className="mentor-match-card">
              <strong>Recommended mentor domain</strong>
              <p>{report.mentorDomain}</p>
              <Link to="/mentor/dashboard">Find mentor <ArrowRight size={16} /></Link>
            </div>
            <button onClick={() => navigate('/startup/opportunities')} type="button">
              See matched opportunities <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 5: Opportunities ─────────────────────────────────────────────────
function Opportunities() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState<Opportunity[]>(opportunities)
  const [activeFilter, setActiveFilter] = useState('All')
  const filters = ['All', 'Pilot', 'Grant', 'Mentor', 'Program', 'Accelerator']

  useEffect(() => { getOpportunityMatches().then(setMatches) }, [])

  const filtered = activeFilter === 'All' ? matches : matches.filter((m) => m.type === activeFilter)

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Opportunity Marketplace" title={`Matched for ${startup.name}`} text="Pilots, mentors, grants, and programs ranked for your startup's fit." />
        <div className="filter-tabs">
          {filters.map((f) => (
            <button key={f} className={activeFilter === f ? 'active' : ''} onClick={() => setActiveFilter(f)} type="button">{f}</button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Compass size={40} />
            <p>No {activeFilter} opportunities matched. Try another filter.</p>
          </div>
        ) : (
          <div className="opportunity-grid">
            {filtered.map((item) => {
              const matchVal = item.match ?? 0
              const matchColor = matchVal >= 80 ? '#166534' : '#7c4a00'
              const matchBg = matchVal >= 80 ? '#dcfce7' : '#fef3c7'
              return (
                <motion.article className="op-card" key={item.title} whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }} transition={{ duration: 0.18 }}>
                  <div className="op-head">
                    <span>{item.type}</span>
                    <strong style={{ background: matchBg, color: matchColor, padding: '6px 10px', borderRadius: 999, fontSize: 13 }}>{matchVal}%</strong>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.sponsor}</p>
                  <div className="deadline"><CalendarClock size={16} />{item.deadline}</div>
                  <div className="reason-list">
                    {item.reasons.map((reason) => <span key={reason}>{reason}</span>)}
                  </div>
                  <button className="apply-btn" type="button">Apply now <ArrowRight size={15} /></button>
                </motion.article>
              )
            })}
          </div>
        )}
        <div className="cta-band">
          <div>
            <h2>Admin teams can see which startups are pilot-ready.</h2>
            <p>Every startup journey contributes to district, sector, and pipeline intelligence.</p>
          </div>
          <button onClick={() => navigate('/admin/dashboard')} type="button">Open admin dashboard <ArrowRight size={18} /></button>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 6: Learning ───────────────────────────────────────────────────────
function Learning() {
  const [modules, setModules] = useState<Array<Record<string, string | number>>>([])
  const [report, setReport] = useState(readiness)

  useEffect(() => {
    Promise.all([getLearningPath(), getReadinessScore()]).then(([lp, s]) => { setModules(lp); setReport(s) })
  }, [])

  const completed = modules.filter((m) => m['status'] === 'Completed')
  const active = modules.filter((m) => m['status'] !== 'Completed')
  const progress = modules.length > 0 ? Math.round((completed.length / modules.length) * 100) : 0

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Personalized Learning Path" title="Close gaps before the next mentor or pilot review." text="Modules are selected from your readiness gaps so learning becomes part of the pilot-readiness workflow." />
        <div className="progress-bar-wrapper">
          <div className="progress-label"><span>Overall progress</span><strong>{progress}%</strong></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="learning-layout">
          <div className="learning-list">
            {active.map((module, i) => (
              <motion.article className="learning-card" key={`${module['title']}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <div>
                  <span>{i + 1}</span>
                  <BookOpenCheck size={22} />
                </div>
                <h3>{module['title']}</h3>
                <p>{module['gap']}</p>
                <footer>
                  <strong>{module['duration_mins']} min</strong>
                  <em>{module['status']}</em>
                </footer>
              </motion.article>
            ))}
          </div>
          <div className="learning-panel">
            <h2>Readiness gaps feeding this path</h2>
            {report.gaps.map((gap) => <p key={gap}>{gap}</p>)}
            <Link className="button-link" to="/mentor/dashboard">Send to mentor review <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 7: AI Twin ────────────────────────────────────────────────────────
type Message = { role: 'user' | 'ai'; content: string }

const SUGGESTED_PROMPTS = [
  'What is our biggest gap before an RTIH agriculture pilot?',
  'Which opportunity should we prioritize?',
  'How do we improve our readiness score?',
  'What should I ask my mentor this week?',
]

function AiTwin() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  async function send(text: string) {
    if (!text.trim() || thinking) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setThinking(true)
    const history = messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    const result = await aiChat('demo-startup-1', text, history)
    setMessages((prev) => [...prev, { role: 'ai', content: result.reply }])
    setThinking(false)
  }

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="AI Startup Twin" title="A profile-grounded advisor for pilot preparation." text="The AI uses your startup profile, readiness score, gaps, and matches to guide next actions." />
        <div className="chat-shell">
          {messages.length === 0 && (
            <div className="chat-prompts">
              <p>Try asking:</p>
              <div className="prompt-pills">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button key={p} onClick={() => send(p)} type="button">{p}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div key={i} className={`chat-message ${msg.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {msg.content}
            </motion.div>
          ))}
          {thinking && (
            <div className="chat-message ai thinking">
              <span /><span /><span />
            </div>
          )}
          <div ref={bottomRef} />
          <div className="chat-input">
            <BrainCircuit size={18} />
            <input
              placeholder="Ask about readiness, mentors, pilots, learning gaps..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(input) }}
            />
            <button onClick={() => send(input)} type="button" disabled={thinking}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 8: Startup Dashboard ─────────────────────────────────────────────
function StartupDashboard() {
  const [profile, setProfile] = useState(startup)
  const [report, setReport] = useState(readiness)
  const [matches, setMatches] = useState<Opportunity[]>(opportunities)
  const [modules, setModules] = useState<Array<Record<string, string | number>>>([])
  const score = useCountUp(report.overall)

  useEffect(() => {
    Promise.all([getStartup(), getReadinessScore(), getOpportunityMatches(), getLearningPath()]).then(([p, s, m, lp]) => {
      setProfile(p); setReport(s); setMatches(m); setModules(lp)
    })
  }, [])

  const bandColor: Record<string, string> = { 'Ready': '#0f6e56', 'Near Ready': '#b45309', 'Emerging': '#1d4ed8', 'Not Ready': '#c0392b' }
  const band = report.band ?? 'Emerging'
  const bc = bandColor[band] ?? '#1d4ed8'
  const journeySteps = [
    { label: 'Onboarded', done: true, path: '/startup/onboarding' },
    { label: 'AI Scored', done: report.overall > 0, path: '/startup/readiness' },
    { label: 'Matched', done: matches.length > 0, path: '/startup/opportunities' },
    { label: 'Learning', done: modules.length > 0, path: '/startup/learning' },
    { label: 'Pitch Ready', done: report.overall >= 68, path: '/startup/pitch' },
  ]

  return (
    <PageMotion>
      <section className="sd-layout">
        {/* Hero score panel */}
        <div className="sd-hero">
          <div className="sd-hero-left">
            <div className="sd-greeting">
              <span className="sd-eyebrow"><Rocket size={13} />Startup Dashboard</span>
              <h1 className="sd-name">{profile.name}</h1>
              <div className="sd-meta-row">
                <span className="sd-tag">{profile.sector}</span>
                <span className="sd-tag">{profile.stage}</span>
                <span className="sd-tag">{profile.district}</span>
              </div>
            </div>
            <div className="sd-score-block">
              <div className="sd-score-ring-wrap">
                <svg className="sd-ring" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke={bc} strokeWidth="10"
                    strokeDasharray={`${(score / 100) * 327} 327`}
                    strokeLinecap="round" transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
                </svg>
                <div className="sd-ring-inner">
                  <strong>{score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <div className="sd-score-info">
                <div className="sd-band-pill" style={{ background: bc + '18', color: bc, borderColor: bc + '44' }}>{band}</div>
                <p className="sd-score-label">AI Readiness Score</p>
                <Link className="sd-full-report-btn" to="/startup/readiness">
                  Full AI report <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
          <div className="sd-hero-right">
            <span className="sd-radar-label">Readiness profile</span>
            <ResponsiveContainer width="100%" height={190}>
              <RadarChart data={report.scores.map(sc => ({ subject: sc.label, value: sc.value, fullMark: 100 }))}>
                <PolarGrid stroke="var(--border-2)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--muted)', fontWeight: 600, fontFamily: 'Inter, sans-serif' }} />
                <Radar dataKey="value" stroke={bc} fill={bc} fillOpacity={0.15} strokeWidth={2} dot={{ fill: bc, r: 3 }} />
                <Tooltip formatter={(v) => [`${v}/100`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="sd-radar-chips">
              {report.scores.map(sc => (
                <span key={sc.label} className="sd-radar-chip" style={{ background: sc.color + '18', color: sc.color }}>
                  {sc.label} {sc.value}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Journey tracker */}
        <div className="sd-journey">
          <span className="sd-section-label">Your journey</span>
          <div className="sd-journey-track">
            {journeySteps.map((step, i) => (
              <Link key={step.label} to={step.path} className={`sd-journey-step ${step.done ? 'done' : ''}`}>
                <div className="sd-journey-node">
                  {step.done ? <CheckCircle2 size={16} /> : <span>{i + 1}</span>}
                </div>
                <span>{step.label}</span>
                {i < journeySteps.length - 1 && <div className="sd-journey-line" />}
              </Link>
            ))}
          </div>
        </div>

        {/* Three-column bottom */}
        <div className="sd-bottom">
          {/* Next actions */}
          <div className="sd-card sd-actions-card">
            <div className="sd-card-head">
              <Target size={16} />
              <h3>Priority actions</h3>
            </div>
            <div className="sd-actions-list">
              {report.nextSteps.slice(0, 3).map((step, i) => (
                <div key={step} className="sd-action-item">
                  <div className="sd-action-num" style={{ background: ['#0f6e56', '#1d4ed8', '#b45309'][i] }}>{i + 1}</div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
            <Link to="/startup/learning" className="sd-card-link">View full learning plan <ChevronRight size={15} /></Link>
          </div>

          {/* Top opportunity */}
          <div className="sd-card sd-opp-card">
            <div className="sd-card-head">
              <Compass size={16} />
              <h3>Best match opportunity</h3>
            </div>
            {matches[0] && (
              <>
                <div className="sd-opp-match" style={{ color: matches[0].match >= 80 ? '#0f6e56' : '#b45309' }}>
                  {matches[0].match}% match
                </div>
                <p className="sd-opp-title">{matches[0].title}</p>
                <p className="sd-opp-sponsor">{matches[0].sponsor}</p>
                <div className="sd-opp-reasons">
                  {matches[0].reasons.slice(0, 2).map((r) => <span key={r}>{r}</span>)}
                </div>
              </>
            )}
            <Link to="/startup/opportunities" className="sd-card-link">All {matches.length} matches <ChevronRight size={15} /></Link>
          </div>

          {/* Quick tools */}
          <div className="sd-card sd-tools-card">
            <div className="sd-card-head">
              <Zap size={16} />
              <h3>AI tools</h3>
            </div>
            <div className="sd-tools-list">
              <Link to="/startup/pitch" className="sd-tool-item">
                <div className="sd-tool-icon" style={{ background: 'linear-gradient(135deg,#1d4ed8,#4338ca)' }}><Sparkles size={16} /></div>
                <div>
                  <strong>AI Pitch Generator</strong>
                  <span>60-sec pitch for APIS/RTIH</span>
                </div>
                <ChevronRight size={14} className="sd-tool-arrow" />
              </Link>
              <Link to="/startup/ai-twin" className="sd-tool-item">
                <div className="sd-tool-icon" style={{ background: 'linear-gradient(135deg,#0f6e56,#059669)' }}><Bot size={16} /></div>
                <div>
                  <strong>AI Twin Chat</strong>
                  <span>Profile-aware startup advisor</span>
                </div>
                <ChevronRight size={14} className="sd-tool-arrow" />
              </Link>
              <Link to="/startup/collaborate" className="sd-tool-item">
                <div className="sd-tool-icon" style={{ background: 'linear-gradient(135deg,#0d9488,#0f6e56)' }}><Network size={16} /></div>
                <div>
                  <strong>Find Partners</strong>
                  <span>Co-build with AP startups</span>
                </div>
                <ChevronRight size={14} className="sd-tool-arrow" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 9: Mentor Dashboard ───────────────────────────────────────────────
function MentorDashboard() {
  const [data, setData] = useState({
    mentor: { name: 'Dr. Venkat Rao', domain: 'AgriTech, GTM, public-sector pilots', availability: '6 slots this week' },
    metrics: { assignedStartups: 1, sessionsThisWeek: 7, openActions: 11, pilotReviews: 3 },
    assigned: [] as Array<Record<string, string | number>>,
    sessions: [] as Array<Record<string, string>>,
  })
  const [aiPrep, setAiPrep] = useState<Record<string, string>>({})
  const [aiPrepLoading, setAiPrepLoading] = useState(false)
  const [portfolioInsight, setPortfolioInsight] = useState('')

  useEffect(() => { getMentorDashboard().then(setData) }, [])

  async function generateSessionPrep() {
    if (data.assigned.length === 0) return
    setAiPrepLoading(true)
    const prepMap: Record<string, string> = {}
    const insights: string[] = []
    for (const item of data.assigned) {
      const gap = String(item['topGap'] || 'pilot readiness')
      const score = Number(item['score'] || 70)
      const name = String(item['startup'])
      const result = await aiChat('demo-startup-1',
        `As mentor Dr. Venkat Rao preparing a session with ${name} (score ${score}/100), gap: "${gap}". Give 2-3 specific session agenda points in one short paragraph.`,
        []
      )
      prepMap[name] = result.reply
      insights.push(`${name}: ${score}/100`)
    }
    setAiPrep(prepMap)
    const summary = await aiChat('demo-startup-1',
      `Mentor portfolio summary: ${insights.join(', ')}. Give a 1-sentence portfolio health insight for the mentor.`,
      []
    )
    setPortfolioInsight(summary.reply)
    setAiPrepLoading(false)
  }

  const avgScore = data.assigned.length > 0
    ? Math.round(data.assigned.reduce((s, a) => s + Number(a['score'] || 0), 0) / data.assigned.length)
    : 0

  return (
    <PageMotion>
      <section className="page-stack">
        {/* Header */}
        <div className="md-hero">
          <div className="md-hero-left">
            <div className="md-avatar">{data.mentor.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
            <div>
              <span className="sd-eyebrow"><UserRoundCheck size={13} />Mentor Dashboard</span>
              <h1 className="sd-name">{data.mentor.name}</h1>
              <p className="md-domain">{data.mentor.domain}</p>
              <div className="sd-meta-row" style={{ marginTop: 8 }}>
                <span className="sd-tag"><CalendarClock size={11} /> {data.mentor.availability}</span>
                <span className="sd-tag">{data.assigned.length} startups assigned</span>
              </div>
            </div>
          </div>
          <div className="md-hero-stats">
            <div className="md-stat"><strong>{data.metrics.sessionsThisWeek}</strong><span>Sessions this week</span></div>
            <div className="md-stat"><strong>{data.metrics.openActions}</strong><span>Open actions</span></div>
            <div className="md-stat"><strong>{data.metrics.pilotReviews}</strong><span>Pilot reviews</span></div>
            <div className="md-stat"><strong>{avgScore || '—'}</strong><span>Avg portfolio score</span></div>
          </div>
        </div>

        {/* Portfolio health summary */}
        {data.assigned.length > 0 && (
          <div className="md-health-strip">
            {[
              { label: 'Pilot-ready', count: data.assigned.filter(a => ['Ready', 'Near Ready'].includes(String(a['band']))).length, color: '#0f6e56', bg: '#edf7f3' },
              { label: 'Progressing', count: data.assigned.filter(a => String(a['band']) === 'Emerging').length, color: '#1d4ed8', bg: '#eff6ff' },
              { label: 'Needs attention', count: data.assigned.filter(a => String(a['band']) === 'Not Ready').length, color: '#c0392b', bg: '#fee2e2' },
              { label: 'Avg score', count: avgScore, color: 'var(--ink)', bg: 'var(--surface)' },
            ].map(item => (
              <div key={item.label} className="md-health-bar" style={{ background: item.bg }}>
                <strong style={{ color: item.color }}>{item.count}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI Portfolio Pulse */}
        <div className="ai-pulse-banner">
          <div className="ai-pulse-left">
            <div className="ai-pulse-icon"><Sparkles size={18} /></div>
            <div>
              <strong>AI Session Intelligence</strong>
              <p>{portfolioInsight || 'Generate AI prep notes and session agendas for your assigned startups using Gemini.'}</p>
            </div>
          </div>
          <button className="ai-pulse-btn" onClick={generateSessionPrep} disabled={aiPrepLoading} type="button">
            {aiPrepLoading ? <><div className="btn-spinner" />Generating...</> : <><Sparkles size={15} />Generate AI Prep</>}
          </button>
        </div>

        {/* Startup portfolio grid */}
        <div>
          <div className="section-head-row">
            <h2 className="section-title">Assigned startup portfolio</h2>
            <Link className="sd-card-link" to="/startup/readiness">View readiness reports <ChevronRight size={15} /></Link>
          </div>
          <div className="md-portfolio-grid">
            {data.assigned.length === 0 ? (
              <div className="empty-state"><Users size={36} /><p>No startups assigned yet.</p></div>
            ) : data.assigned.map((item, i) => {
              const score = Number(item['score'] || 0)
              const band = String(item['band'] || 'Emerging')
              const bandColors: Record<string, string> = { Ready: '#0f6e56', 'Near Ready': '#b45309', Emerging: '#1d4ed8', 'Not Ready': '#c0392b' }
              const bc = bandColors[band] ?? '#1d4ed8'
              const name = String(item['startup'])
              const prep = aiPrep[name]
              return (
                <motion.div key={name} className="md-startup-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <div className="md-startup-head">
                    <div>
                      <h3>{name}</h3>
                      <p>{String(item['sector'])} · {String(item['district'])}</p>
                    </div>
                    <div className="md-score-badge" style={{ background: bc + '18', color: bc, borderColor: bc + '44' }}>
                      <strong>{score}</strong><span>/100</span>
                    </div>
                  </div>
                  <div className="md-band-row">
                    <span className="md-band-chip" style={{ background: bc + '18', color: bc }}>{band}</span>
                    <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${score}%`, background: bc }} /></div>
                  </div>
                  <div className="md-gap-row">
                    <span className="md-gap-label">Top gap</span>
                    <span className="md-gap-text">{String(item['topGap'])}</span>
                  </div>
                  {prep ? (
                    <div className="md-ai-prep">
                      <div className="md-ai-prep-head"><Sparkles size={12} />AI Session Prep</div>
                      <p>{prep}</p>
                    </div>
                  ) : (
                    <div className="md-next-action">{String(item['nextAction'])}</div>
                  )}
                  <Link to="/mentor/sessions" className="sd-card-link" style={{ marginTop: 8 }}>
                    Log session <ChevronRight size={14} />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Sessions + AI match side by side */}
        <div className="md-bottom-grid">
          <div className="sd-card">
            <div className="sd-card-head"><CalendarClock size={16} /><h3>Upcoming sessions</h3></div>
            {data.sessions.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 14 }}>No sessions scheduled.</p>
              : data.sessions.map((session) => (
                <div className="session-row" key={`${session['startup']}-${session['time'] ?? session['session_date']}`}>
                  <strong style={{ fontSize: 14 }}>{session['startup']}</strong>
                  <p style={{ margin: '3px 0', fontSize: 13, color: 'var(--muted)' }}>{session['topic']}</p>
                  <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>{session['time'] ?? session['session_date']} · {session['status']}</span>
                </div>
              ))
            }
            <Link className="button-link" style={{ marginTop: 16, fontSize: 13 }} to="/mentor/sessions">All sessions <ArrowRight size={14} /></Link>
          </div>

          <div className="sd-card">
            <div className="sd-card-head"><Target size={16} /><h3>AI mentor recommendations for portfolio</h3></div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Which co-mentors APIS should pair with your startups based on sector gaps.</p>
            <div className="md-comentor-list">
              {[
                { name: 'Priya Nair', domain: 'EdTech & GTM', reason: 'Complements AgriSense AI on market strategy', fit: 91 },
                { name: 'Meera Krishnamurthy', domain: 'GovTech & Policy', reason: 'Strong on public-sector pilot navigation', fit: 84 },
                { name: 'Suresh Babu Reddy', domain: 'CleanTech & Funding', reason: 'Can close the funding readiness gap', fit: 78 },
              ].map((c) => (
                <div key={c.name} className="md-comentor-item">
                  <div className="md-comentor-info">
                    <strong>{c.name}</strong>
                    <span>{c.domain}</span>
                    <p>{c.reason}</p>
                  </div>
                  <div className="md-comentor-fit" style={{ color: 'var(--green-mid)' }}>{c.fit}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 10: Mentor Sessions ───────────────────────────────────────────────
function MentorSessions() {
  const [sessions, setSessions] = useState<Array<Record<string, unknown>>>([])
  const [filterStatus, setFilterStatus] = useState('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { getMentorSessions().then(setSessions) }, [])

  const statusOptions = ['All', 'Scheduled', 'Completed', 'Cancelled']
  const filtered = filterStatus === 'All' ? sessions : sessions.filter((s) => s['status'] === filterStatus)

  function toggle(id: string) {
    setExpanded((cur) => (cur === id ? null : id))
  }

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Session Log" title="All mentor sessions across assigned startups." text="View session notes, action items, and schedule follow-ups." />
        <div className="filter-tabs">
          {statusOptions.map((s) => (
            <button key={s} className={filterStatus === s ? 'active' : ''} onClick={() => setFilterStatus(s)} type="button">{s}</button>
          ))}
        </div>
        <div className="table-card">
          <div className="table-row session-head">
            <span>Startup</span><span>Date</span><span>Topic</span><span>Duration</span><span>Status</span><span></span>
          </div>
          {filtered.map((session) => {
            const id = String(session['id'])
            const isOpen = expanded === id
            const statusColors: Record<string, string> = { Completed: '#0f6e56', Scheduled: '#185fa5', Cancelled: '#d85a30' }
            const sc = statusColors[String(session['status'])] ?? '#667085'
            return (
              <div key={id}>
                <div className="table-row session-row-table" onClick={() => toggle(id)}>
                  <span><strong>{String(session['startup'])}</strong></span>
                  <span>{String(session['session_date'])}</span>
                  <span>{String(session['topic'])}</span>
                  <span>{String(session['duration_mins'])} min</span>
                  <span><span className="status-chip" style={{ background: `${sc}18`, color: sc }}>{String(session['status'])}</span></span>
                  <span><ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} /></span>
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div className="session-detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                      <div className="session-detail-inner">
                        <div>
                          <strong>Session notes</strong>
                          <p>{String(session['notes']) || 'No notes yet.'}</p>
                        </div>
                        <div>
                          <strong>Action items</strong>
                          <ul>
                            {(session['action_items'] as string[])?.map((item) => (
                              <li key={item}><CheckSquare size={14} />{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 11: Admin Dashboard ───────────────────────────────────────────────
function Admin() {
  const [dashboard, setDashboard] = useState(adminDashboard)
  const [aiInsights, setAiInsights] = useState<{ title: string; body: string; color: string; icon: typeof Sparkles }[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const totalCount = useCountUp(dashboard.metrics.totalStartups)
  const pilotCount = useCountUp(dashboard.metrics.pilotReady)

  useEffect(() => { getAdminDashboard().then(setDashboard) }, [])

  async function generateInsights() {
    setInsightsLoading(true)
    const topSector = dashboard.sectors[0]?.name ?? 'AgriTech'
    const pilotPct = Math.round((dashboard.metrics.pilotReady / Math.max(dashboard.metrics.totalStartups, 1)) * 100)
    const topDistrict = dashboard.districts[0]?.name ?? 'Visakhapatnam'

    const queries = [
      { q: `AP startup ecosystem has ${dashboard.metrics.totalStartups} startups, ${pilotPct}% pilot-ready. Give one actionable insight for APIS policymakers in 1 sentence.`, title: 'Pipeline Health', color: '#0f6e56', icon: Target },
      { q: `${topSector} leads the AP startup sector mix. What is one strategic recommendation for APIS to accelerate this sector toward pilots in 1 sentence?`, title: 'Sector Strategy', color: '#4338ca', icon: BarChart3 },
      { q: `${topDistrict} has the highest startup density in AP. What is one district expansion insight APIS should act on in 1 sentence?`, title: 'District Focus', color: '#b45309', icon: Map },
    ]

    const results = await Promise.all(
      queries.map(async ({ q, title, color, icon }) => {
        const res = await aiChat('demo-startup-1', q, [])
        return { title, body: res.reply, color, icon }
      })
    )
    setAiInsights(results)
    setInsightsLoading(false)
  }

  const pilotPct = Math.round((dashboard.metrics.pilotReady / Math.max(dashboard.metrics.totalStartups, 1)) * 100)

  return (
    <PageMotion>
      <section className="page-stack">
        {/* Admin hero header */}
        <div className="admin-hero">
          <div>
            <span className="sd-eyebrow"><BarChart3 size={13} />RTIH / APIS Admin</span>
            <h1 className="sd-name" style={{ marginTop: 10 }}>Ecosystem Intelligence</h1>
            <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 8, maxWidth: 520 }}>Decision-maker view of startup distribution, pilot readiness, district density, and AI-generated policy insights.</p>
          </div>
          <button className="ai-pulse-btn" onClick={generateInsights} disabled={insightsLoading} type="button">
            {insightsLoading ? <><div className="btn-spinner" />Analyzing...</> : <><Sparkles size={15} />Run AI Analysis</>}
          </button>
        </div>

        {/* Ecosystem context strip */}
        <div className="admin-eco-strip">
          {[
            { label: 'Most active district', value: dashboard.districts[0]?.name ?? '—', color: '#0f6e56' },
            { label: 'Leading sector', value: dashboard.sectors[0]?.name ?? '—', color: '#4338ca' },
            { label: 'District growth leader', value: dashboard.districts[0]?.growth ?? '—', color: '#b45309' },
            { label: 'Pilot-ready rate', value: `${pilotPct}%`, color: '#1d4ed8' },
            { label: 'Active districts', value: `${dashboard.districts.length} / 13`, color: '#667085' },
          ].map(item => (
            <div key={item.label} className="admin-eco-item">
              <span>{item.label}</span>
              <strong style={{ color: item.color }}>{item.value}</strong>
            </div>
          ))}
        </div>

        {/* AI Insights — shown after generation */}
        {aiInsights.length > 0 && (
          <div className="admin-ai-insights">
            <div className="admin-ai-header">
              <Sparkles size={16} />
              <h2>AI Ecosystem Insights</h2>
              <span className="live-badge">Gemini</span>
            </div>
            <div className="admin-insights-grid">
              {aiInsights.map((ins, i) => {
                const Icon = ins.icon
                return (
                  <motion.div key={ins.title} className="admin-insight-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ borderTopColor: ins.color }}>
                    <div className="admin-insight-head" style={{ color: ins.color }}>
                      <Icon size={15} /><span>{ins.title}</span>
                    </div>
                    <p>{ins.body}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Metrics */}
        <div className="admin-metrics">
          <Metric icon={Building2} label="Total startups" value={`${totalCount}`} />
          <Metric icon={Rocket} label="Pilot-ready" value={`${pilotCount}`} />
          <Metric icon={GraduationCap} label="Learning paths" value={`${dashboard.metrics.learningPaths}`} />
          <Metric icon={MessagesSquare} label="Mentor sessions" value={`${dashboard.metrics.mentorSessions}`} />
        </div>

        {/* Charts + pilot % */}
        <div className="admin-chart-row">
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Sector Distribution</h3>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>{dashboard.sectors.length} sectors</span>
            </div>
            <ResponsiveContainer height={220} width="100%">
              <PieChart>
                <Pie data={dashboard.sectors} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {dashboard.sectors.map((entry) => <Cell fill={entry.color} key={entry.name} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend">
              {dashboard.sectors.map((entry) => (
                <span key={entry.name}><i style={{ background: entry.color }} />{entry.name}</span>
              ))}
            </div>
          </div>
          <div className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3>Stage Pipeline</h3>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>intake → ready</span>
            </div>
            <ResponsiveContainer height={220} width="100%">
              <BarChart data={dashboard.stages} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-2)" />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'var(--surface)' }} />
                <Bar dataKey="startups" fill="#0f6e56" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="admin-pilot-gauge">
            <span className="sd-section-label">Pilot-ready rate</span>
            <div className="admin-gauge-ring">
              <svg viewBox="0 0 120 120" className="sd-ring">
                <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-2)" strokeWidth="10" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="#0f6e56" strokeWidth="10"
                  strokeDasharray={`${(pilotPct / 100) * 327} 327`}
                  strokeLinecap="round" transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
              </svg>
              <div className="sd-ring-inner">
                <strong style={{ fontSize: 24 }}>{pilotPct}%</strong>
                <span>pilot-ready</span>
              </div>
            </div>
            <div className="admin-gauge-breakdown">
              <div><strong style={{ color: '#0f6e56' }}>{dashboard.metrics.pilotReady}</strong><span>Ready now</span></div>
              <div><strong>{dashboard.metrics.totalStartups - dashboard.metrics.pilotReady}</strong><span>In progress</span></div>
            </div>
          </div>
        </div>

        {/* District grid */}
        <div>
          <div className="section-head-row">
            <h2 className="section-title">District coverage</h2>
            <Link className="sd-card-link" to="/admin/districts">Full district view <ChevronRight size={15} /></Link>
          </div>
          <div className="district-grid">
            {dashboard.districts.map((district) => (
              <div key={district.name}>
                <span>{district.name}</span>
                <strong>{district.count}</strong>
                <p>{district.growth} this cycle</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pilot queue table */}
        <div className="table-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3>Pilot-ready startup queue</h3>
            <Link to="/admin/startups" style={{ fontSize: 13, color: 'var(--green-mid)', fontWeight: 700, textDecoration: 'none' }}>All startups <ChevronRight size={14} /></Link>
          </div>
          <div className="table-row head">
            <span>Startup</span><span>Sector</span><span>District</span><span>Score</span><span>Band</span>
          </div>
          {dashboard.pilotQueue.slice(0, 6).map((row) => (
            <div className="table-row" key={row[0]}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{row[0]}</span>
              <span>{row[1]}</span>
              <span>{row[2]}</span>
              <span style={{ fontWeight: 800, color: 'var(--green-mid)' }}>{row[3]}</span>
              <span>
                <span style={{
                  background: row[4] === 'Ready' ? 'var(--green-tint)' : 'var(--amber-tint)',
                  color: row[4] === 'Ready' ? 'var(--green)' : 'var(--amber)',
                  padding: '3px 9px', borderRadius: 999, fontSize: 12, fontWeight: 700
                }}>{row[4]}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="admin-cta-row">
          <Link className="quick-action-card" to="/admin/cohorts">
            <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #4338ca, #1d4ed8)' }}><Layers size={20} /></div>
            <div>
              <h3>Cohort & Program Tracker</h3>
              <p>View RTIH accelerator batches, mentor hours, pilots launched, and grants won per cohort</p>
            </div>
            <ArrowRight size={18} className="qa-arrow" />
          </Link>
          <Link className="quick-action-card" to="/admin/pilots">
            <div className="qa-icon" style={{ background: 'linear-gradient(135deg, #0f6e56, #059669)' }}><Kanban size={20} /></div>
            <div>
              <h3>Pilot Pipeline Kanban</h3>
              <p>Track each startup across intake, scoring, shortlisted, approved, and launched stages</p>
            </div>
            <ArrowRight size={18} className="qa-arrow" />
          </Link>
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 12: Admin Districts ───────────────────────────────────────────────
type DistrictFull = { name: string; count: number; growth: string; top_sector: string; pilot_ready: number; mentors: number }

const DISTRICT_DETAILS: Record<string, Omit<DistrictFull, 'name' | 'count' | 'growth'>> = {
  Visakhapatnam: { top_sector: 'AgriTech', pilot_ready: 6, mentors: 8 },
  Vijayawada: { top_sector: 'FinTech', pilot_ready: 4, mentors: 6 },
  Tirupati: { top_sector: 'EdTech', pilot_ready: 3, mentors: 5 },
  Guntur: { top_sector: 'AgriTech', pilot_ready: 2, mentors: 4 },
  Kurnool: { top_sector: 'GovTech', pilot_ready: 1, mentors: 2 },
  Rajahmundry: { top_sector: 'AgriTech', pilot_ready: 1, mentors: 2 },
  Nellore: { top_sector: 'HealthTech', pilot_ready: 1, mentors: 3 },
  Anantapur: { top_sector: 'CleanTech', pilot_ready: 0, mentors: 1 },
}

function AdminDistricts() {
  const [districts, setDistricts] = useState<Array<Record<string, string | number>>>([])
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => { getAdminDistricts().then(setDistricts) }, [])

  const fullDistricts: DistrictFull[] = districts.length > 0
    ? districts.map((d) => ({
        name: String(d['name'] ?? ''),
        count: Number(d['count'] ?? 0),
        growth: String(d['growth'] ?? ''),
        ...(DISTRICT_DETAILS[String(d['name'])] ?? { top_sector: '—', pilot_ready: 0, mentors: 0 }),
      }))
    : Object.entries(DISTRICT_DETAILS).map(([name, detail]) => ({ name, count: 0, growth: '+new', ...detail }))

  const sel = selected ? fullDistricts.find((d) => d.name === selected) : null

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="AP District Intelligence" title="Innovation density across all 8 Andhra Pradesh districts." text="Click a district card to see startup list, sector breakdown, and pilot-ready count." />
        <div className="district-cards-grid">
          {fullDistricts.map((district) => {
            const isActive = selected === district.name
            return (
              <motion.div
                key={district.name}
                className={`district-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelected(isActive ? null : district.name)}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.15 }}
              >
                <div className="district-card-top">
                  <span className="district-name">{district.name}</span>
                  <span className="district-pilot">{district.pilot_ready} pilot-ready</span>
                </div>
                <strong className="district-count">{district.count}</strong>
                <div className="district-meta">
                  <span>Top: {district.top_sector}</span>
                  <span>{district.mentors} mentors</span>
                </div>
              </motion.div>
            )
          })}
        </div>
        <AnimatePresence>
          {sel && (
            <motion.div className="district-drawer" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.25 }}>
              <div className="district-drawer-head">
                <h2>{sel.name} District</h2>
                <button onClick={() => setSelected(null)} type="button"><X size={20} /></button>
              </div>
              <div className="admin-metrics" style={{ marginTop: 16 }}>
                <Metric icon={Building2} label="Total startups" value={`${sel.count}`} />
                <Metric icon={Rocket} label="Pilot-ready" value={`${sel.pilot_ready}`} />
                <Metric icon={Target} label="Top sector" value={sel.top_sector} />
                <Metric icon={Users} label="Mentors" value={`${sel.mentors}`} />
              </div>
              <div className="chart-card" style={{ marginTop: 16 }}>
                <h3>Sector breakdown ({sel.name})</h3>
                <ResponsiveContainer height={160} width="100%">
                  <BarChart data={[{ sector: sel.top_sector, startups: sel.pilot_ready * 2 }, { sector: 'Other', startups: Math.max(1, sel.count - sel.pilot_ready * 2) }]}>
                    <XAxis dataKey="sector" />
                    <Bar dataKey="startups" fill="#0f6e56" radius={[6, 6, 0, 0]} />
                    <Tooltip />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </PageMotion>
  )
}

// ─── Screen 13: Admin Pilot Pipeline (Kanban) ─────────────────────────────────
type KanbanCard = { name: string; sector: string; score: number; district: string }
type KanbanCol = { id: string; label: string; color: string; cards: KanbanCard[] }

const INITIAL_KANBAN: KanbanCol[] = [
  { id: 'identified', label: 'Identified', color: '#667085', cards: [{ name: 'GovChain AP', sector: 'GovTech', score: 61, district: 'Vijayawada' }, { name: 'CleanWater AI', sector: 'CleanTech', score: 57, district: 'Anantapur' }] },
  { id: 'reviewed', label: 'Reviewed', color: '#185fa5', cards: [{ name: 'SkillBridge Rural', sector: 'EdTech', score: 78, district: 'Vijayawada' }] },
  { id: 'approved', label: 'Approved', color: '#ba7517', cards: [{ name: 'AgriSense AI', sector: 'AgriTech', score: 74, district: 'Visakhapatnam' }] },
  { id: 'in_pilot', label: 'In Pilot', color: '#0f6e56', cards: [{ name: 'MedReach AP', sector: 'HealthTech', score: 81, district: 'Tirupati' }] },
  { id: 'completed', label: 'Completed', color: '#534ab7', cards: [] },
]

function AdminPilots() {
  const [columns] = useState<KanbanCol[]>(INITIAL_KANBAN)
  const [filterSector, setFilterSector] = useState('All')
  const sectors = ['All', 'AgriTech', 'EdTech', 'HealthTech', 'GovTech', 'CleanTech', 'FinTech']
  const totalReady = columns.reduce((sum, col) => sum + col.cards.length, 0)

  const filteredColumns = columns.map((col) => ({
    ...col,
    cards: filterSector === 'All' ? col.cards : col.cards.filter((c) => c.sector === filterSector),
  }))

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Pilot Pipeline" title="Track startups from identification to completed pilot." text="Kanban view of the state-wide pilot program pipeline." />
        <div className="admin-metrics">
          <Metric icon={Rocket} label="Total in pipeline" value={`${totalReady}`} />
          <Metric icon={Target} label="In Pilot" value={`${columns.find((c) => c.id === 'in_pilot')?.cards.length ?? 0}`} />
          <Metric icon={CheckCircle2} label="Approved" value={`${columns.find((c) => c.id === 'approved')?.cards.length ?? 0}`} />
          <Metric icon={CheckSquare} label="Completed" value={`${columns.find((c) => c.id === 'completed')?.cards.length ?? 0}`} />
        </div>
        <div className="filter-tabs">
          {sectors.map((s) => (
            <button key={s} className={filterSector === s ? 'active' : ''} onClick={() => setFilterSector(s)} type="button">{s}</button>
          ))}
        </div>
        <div className="kanban-board">
          {filteredColumns.map((col) => (
            <div className="kanban-col" key={col.id}>
              <div className="kanban-col-head" style={{ borderColor: col.color }}>
                <span style={{ color: col.color }}>{col.label}</span>
                <span className="kanban-count">{col.cards.length}</span>
              </div>
              {col.cards.map((card) => (
                <motion.div className="kanban-card" key={card.name} whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }} transition={{ duration: 0.15 }}>
                  <strong>{card.name}</strong>
                  <div className="kanban-meta">
                    <span>{card.sector}</span>
                    <span>{card.district}</span>
                  </div>
                  <div className="kanban-score">
                    <div className="bar-track small">
                      <div className="bar-fill" style={{ width: `${card.score}%`, background: card.score >= 75 ? '#0f6e56' : card.score >= 60 ? '#ba7517' : '#d85a30' }} />
                    </div>
                    <strong>{card.score}</strong>
                  </div>
                </motion.div>
              ))}
              {col.cards.length === 0 && (
                <div className="kanban-empty">No startups</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 14: Admin All Startups ────────────────────────────────────────────
function AdminStartups() {
  const { state } = useLocation()
  const [rows, setRows] = useState<Array<Record<string, string | number>>>([])
  const [search, setSearch] = useState((state as { search?: string } | null)?.search ?? '')
  const [filterSector, setFilterSector] = useState('All')
  const [filterStage, setFilterStage] = useState('All')
  const [sortCol, setSortCol] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => { getAdminStartups().then(setRows) }, [])

  const sectors = ['All', 'AgriTech', 'EdTech', 'HealthTech', 'GovTech', 'FinTech', 'CleanTech']
  const stages = ['All', 'Idea', 'Prototype', 'MVP', 'Growth', 'Scale']

  const filtered = rows
    .filter((r) => {
      const s = search.toLowerCase()
      const matchSearch = !s || String(r['name']).toLowerCase().includes(s) || String(r['sector']).toLowerCase().includes(s) || String(r['district']).toLowerCase().includes(s)
      const matchSector = filterSector === 'All' || r['sector'] === filterSector
      const matchStage = filterStage === 'All' || r['stage'] === filterStage
      return matchSearch && matchSector && matchStage
    })
    .sort((a, b) => {
      const av = String(a[sortCol] ?? '')
      const bv = String(b[sortCol] ?? '')
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  function sort(col: string) {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Admin Startup Registry" title="Every submitted profile becomes ecosystem intelligence." text="Search, filter, and sort all startups in the AP InnovationOS pipeline." />
        <div className="admin-search-bar">
          <div className="search-input">
            <Search size={16} />
            <input placeholder="Search by name, sector, district..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)}>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="table-card">
          <div className="table-row startup-table head">
            {['name', 'sector', 'district', 'stage', 'score', 'band'].map((col) => (
              <span key={col} onClick={() => sort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                {col.charAt(0).toUpperCase() + col.slice(1)} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
              </span>
            ))}
          </div>
          {filtered.map((row) => (
            <motion.div className="table-row startup-table" key={`${row['id']}`} whileHover={{ background: '#f8fafc' }} transition={{ duration: 0.1 }}>
              <span><strong>{row['name']}</strong></span>
              <span>{row['sector']}</span>
              <span>{row['district']}</span>
              <span>{row['stage']}</span>
              <span><strong>{row['score']}</strong></span>
              <span><span className="pilot-badge">{row['band']}</span></span>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <Search size={32} />
              <p>No startups match your search.</p>
            </div>
          )}
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 15: AI Pitch Generator ───────────────────────────────────────────
type PitchResult = { hook: string; problem: string; solution: string; traction: string; ask: string; full_pitch: string; source: string }

function PitchGenerator() {
  const [profile, setProfile] = useState(startup)
  const [pitch, setPitch] = useState<PitchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { getStartup().then(setProfile) }, [])

  async function generate() {
    setLoading(true)
    setPitch(null)
    const result = await aiPitch('demo-startup-1')
    setPitch(result)
    setLoading(false)
  }

  function copyPitch() {
    if (pitch?.full_pitch) {
      navigator.clipboard.writeText(pitch.full_pitch)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }

  const sections = pitch ? [
    { label: 'Hook', content: pitch.hook, color: '#185fa5' },
    { label: 'Problem', content: pitch.problem, color: '#d85a30' },
    { label: 'Solution', content: pitch.solution, color: '#0f6e56' },
    { label: 'Traction', content: pitch.traction, color: '#534ab7' },
    { label: 'Ask', content: pitch.ask, color: '#ba7517' },
  ] : []

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="AI Pitch Generator" title="Turn your startup profile into a 60-second pitch." text="Gemini AI reads your profile, readiness score, and gaps to craft a structured pitch for APIS/RTIH evaluators." />
        <div className="pitch-shell">
          <div className="pitch-context">
            <span>{profile.sector}</span>
            <span>{profile.stage}</span>
            <span>{profile.district}</span>
            <span>{profile.name}</span>
          </div>

          {!pitch && (
            <div className="pitch-cta">
              <button onClick={generate} disabled={loading} type="button">
                {loading ? (
                  <><span className="btn-spinner" />Gemini is crafting your pitch...</>
                ) : (
                  <><Sparkles size={18} />Generate Pitch with Gemini AI</>
                )}
              </button>
              <p>Takes 3-5 seconds · Uses your onboarded profile data</p>
            </div>
          )}

          {pitch && (
            <AnimatePresence>
              <div className="pitch-sections">
                {sections.map((s, i) => (
                  <motion.div key={s.label} className="pitch-card" style={{ borderLeftColor: s.color }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <span style={{ color: s.color, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</span>
                    <p>{s.content}</p>
                  </motion.div>
                ))}
                <motion.div className="pitch-full" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                  <div className="pitch-full-head">
                    <h3>Full 60-second pitch</h3>
                    <button onClick={copyPitch} className="copy-btn" type="button">
                      {copied ? <><CheckCircle2 size={14} />Copied!</> : <><Copy size={14} />Copy</>}
                    </button>
                  </div>
                  <p>{pitch.full_pitch}</p>
                  <span className="pitch-source">Generated by {pitch.source === 'gemini' ? 'Gemini 2.5 Flash' : pitch.source === 'claude' ? 'Claude' : 'AI engine'}</span>
                </motion.div>
                <button onClick={generate} disabled={loading} className="btn-secondary" type="button">
                  <RefreshCw size={15} />Regenerate pitch
                </button>
              </div>
            </AnimatePresence>
          )}
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 16: Startup Collaboration Discovery ───────────────────────────────
type Collaborator = { id: string; name: string; sector: string; district: string; stage: string; collaboration_angle: string; relationship: string; collab_score: number }

function CollaborateDiscover() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [interested, setInterested] = useState<Set<string>>(new Set())

  useEffect(() => {
    getCollaborators('demo-startup-1').then((data) =>
      setCollaborators(data as unknown as Collaborator[])
    )
  }, [])

  const relColors: Record<string, string> = { 'Same sector': '#0f6e56', 'Adjacent sector': '#185fa5', 'Ecosystem partner': '#667085' }

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Startup Collaboration Discovery" title="Find partners who amplify your impact." text="Adjacent startups in the AP ecosystem that could co-build, integrate, or co-pilot to create broader public value." />
        <div className="collab-grid">
          {collaborators.map((c, i) => {
            const color = relColors[c.relationship] ?? '#667085'
            const isInterested = interested.has(c.id)
            return (
              <motion.article key={c.id} className="collab-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.1)' }}>
                <div className="collab-card-head">
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.sector} · {c.district} · {c.stage}</p>
                  </div>
                  <span className="collab-badge" style={{ background: `${color}18`, color }}>{c.relationship}</span>
                </div>
                <div className="collab-angle">
                  <Network size={14} />
                  <span>{c.collaboration_angle}</span>
                </div>
                <div className="collab-score-row">
                  <span>Compatibility</span>
                  <div className="bar-track small" style={{ flex: 1 }}>
                    <div className="bar-fill" style={{ width: `${c.collab_score}%`, background: color }} />
                  </div>
                  <strong>{c.collab_score}%</strong>
                </div>
                <button className={isInterested ? 'btn-secondary' : ''} onClick={() => setInterested((p) => new Set([...p, c.id]))} disabled={isInterested} type="button">
                  {isInterested ? <><CheckCircle2 size={14} />Interest expressed</> : <>Connect <ArrowRight size={14} /></>}
                </button>
              </motion.article>
            )
          })}
          {collaborators.length === 0 && (
            <div className="empty-state"><Network size={36} /><p>Loading collaboration matches...</p></div>
          )}
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Screen 17: Admin Cohort Tracker ─────────────────────────────────────────
type Cohort = { id: string; name: string; program: string; status: string; start_date: string; end_date: string; startup_names: string[]; outcomes: { pilots_launched: number; grants_won: number; mentor_hours: number } }

function AdminCohorts() {
  const [cohorts, setCohorts] = useState<Cohort[]>([])

  useEffect(() => {
    getAdminCohorts().then((data) => setCohorts(data as unknown as Cohort[]))
  }, [])

  const statusColors: Record<string, string> = { Active: '#0f6e56', Completed: '#667085', Upcoming: '#185fa5' }
  const totalPilots = cohorts.reduce((sum, c) => sum + c.outcomes.pilots_launched, 0)
  const totalHours = cohorts.reduce((sum, c) => sum + c.outcomes.mentor_hours, 0)

  return (
    <PageMotion>
      <section className="page-stack">
        <PageTitle eyebrow="Cohort & Program Tracker" title="APIS/RTIH accelerator batches and outcomes." text="Track which startups are in each cohort, mentor hours delivered, pilots launched, and grants secured." />
        <div className="admin-metrics">
          <Metric icon={Layers} label="Total cohorts" value={`${cohorts.length}`} />
          <Metric icon={Rocket} label="Active cohorts" value={`${cohorts.filter((c) => c.status === 'Active').length}`} />
          <Metric icon={Target} label="Total pilots" value={`${totalPilots}`} />
          <Metric icon={GraduationCap} label="Mentor hours" value={`${totalHours}h`} />
        </div>
        <div className="cohort-grid">
          {cohorts.map((cohort, i) => {
            const color = statusColors[cohort.status] ?? '#667085'
            const isActive = cohort.status === 'Active'
            return (
              <motion.div key={cohort.id} className="cohort-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <div className="cohort-card-head">
                  <div>
                    <h3>{cohort.name}</h3>
                    <p>{cohort.program}</p>
                  </div>
                  <span className="cohort-badge" style={{ background: `${color}18`, color }}>{cohort.status}</span>
                </div>
                <div className="cohort-dates"><CalendarClock size={13} /><span>{cohort.start_date} → {cohort.end_date}</span></div>
                <div className="cohort-startups">
                  {cohort.startup_names.map((name) => <span key={name} className="cohort-chip">{name}</span>)}
                </div>
                {isActive && (
                  <div className="cohort-progress">
                    <span>Program progress</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: '62%', background: color, transition: 'width 1s ease' }} /></div>
                  </div>
                )}
                <div className="cohort-outcomes">
                  <div><strong>{cohort.outcomes.pilots_launched}</strong><span>Pilots</span></div>
                  <div><strong>{cohort.outcomes.grants_won}</strong><span>Grants</span></div>
                  <div><strong>{cohort.outcomes.mentor_hours}h</strong><span>Mentor hrs</span></div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>
    </PageMotion>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function PageTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="metric-card">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Field({ label, value, className = '', multiline = false, onChange, options, type = 'text' }: {
  label: string; value: string; className?: string; multiline?: boolean
  onChange?: (value: string) => void; options?: string[]; type?: string
}) {
  const inputId = label.toLowerCase().replaceAll(' ', '-')
  return (
    <label className={`field ${className}`} htmlFor={inputId}>
      <span>{label}</span>
      {options ? (
        <select id={inputId} onChange={(e) => onChange?.(e.target.value)} value={value}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : multiline ? (
        <textarea id={inputId} onChange={(e) => onChange?.(e.target.value)} rows={3} value={value} />
      ) : (
        <input id={inputId} onChange={(e) => onChange?.(e.target.value)} type={type} value={value} />
      )}
    </label>
  )
}

function Insight({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div className={`insight ${danger ? 'danger' : ''}`}>
      <h3>{title}</h3>
      {items.map((item) => <p key={item}>{item}</p>)}
    </div>
  )
}

export default App
