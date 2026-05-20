import { adminDashboard, opportunities, readiness, startup } from './demoData'

export type StartupProfile = typeof startup

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`)
    if (!response.ok) throw new Error(`API ${response.status}`)
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

async function postJson<T>(path: string, body: unknown, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`API ${response.status}`)
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

async function putJson<T>(path: string, body: unknown, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`API ${response.status}`)
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export function demoLogin(role: 'startup' | 'mentor' | 'admin') {
  return postJson('/auth/demo-login', { role }, {
    email: `${role}@demo.com`,
    name: role === 'mentor' ? 'Dr. Venkat Rao' : role === 'admin' ? 'APIS Program Lead' : 'Aarav Reddy',
    role,
    defaultRoute: role === 'mentor' ? '/mentor/dashboard' : role === 'admin' ? '/admin/dashboard' : '/startup/dashboard',
  })
}

// ─── Startup ─────────────────────────────────────────────────────────────────
export function getStartup() {
  return getJson('/startup/demo-startup-1', startup)
}

export function saveStartupProfile(profile: StartupProfile) {
  return postJson('/startup/onboard', profile, profile)
}

export function getReadinessScore() {
  return getJson('/startup/demo-startup-1/score', readiness)
}

export function generateReadinessScore(profile?: StartupProfile) {
  return postJson('/startup/demo-startup-1/score', profile ?? startup, readiness)
}

export function getOpportunityMatches() {
  return getJson('/startup/demo-startup-1/matches', opportunities)
}

export function getLearningPath() {
  return getJson('/startup/demo-startup-1/learning', [
    { title: 'Government Pilot GTM Playbook', duration_mins: 45, status: 'Recommended', gap: 'Pilot readiness gap' },
    { title: 'Field Validation Evidence Pack', duration_mins: 35, status: 'Recommended', gap: 'Evidence documentation' },
  ])
}

// ─── AI endpoints ─────────────────────────────────────────────────────────────
export function aiScore(startupId = 'demo-startup-1') {
  return postJson('/ai/score', { startup_id: startupId }, readiness)
}

export function aiMatch(startupId = 'demo-startup-1') {
  return postJson('/ai/match', { startup_id: startupId }, opportunities)
}

export function aiLearning(startupId = 'demo-startup-1', gaps: string[] = []) {
  return postJson('/ai/learning', { startup_id: startupId, gaps }, [])
}

export function aiChat(startupId: string, message: string, history: { role: string; content: string }[]) {
  return postJson<{ reply: string; startup_id: string }>(
    '/ai/chat',
    { startup_id: startupId, message, history },
    { reply: 'I am ready to help you prepare for your pilot. What would you like to know?', startup_id: startupId },
  )
}

// ─── Admin ───────────────────────────────────────────────────────────────────
export function getAdminDashboard() {
  return getJson('/admin/dashboard', adminDashboard)
}

export function getAdminStartups() {
  return getJson('/admin/startups', [{ ...startup, score: readiness.overall, band: readiness.band }])
}

export function getAdminDistricts() {
  return getJson('/admin/districts', adminDashboard.districts)
}

// ─── Mentor ───────────────────────────────────────────────────────────────────
export function getMentorDashboard() {
  return getJson('/mentor/dashboard', {
    mentor: { name: 'Dr. Venkat Rao', domain: 'AgriTech, GTM, public-sector pilots', availability: '6 slots this week' },
    metrics: { assignedStartups: 1, sessionsThisWeek: 7, openActions: 11, pilotReviews: 3 },
    assigned: [{ startup: startup.name, sector: startup.sector, district: startup.district, score: readiness.overall, band: readiness.band, topGap: readiness.gaps[0], nextAction: readiness.nextSteps[0] }],
    sessions: [],
  })
}

export function getMentorSessions() {
  return getJson('/mentor/sessions', [
    { id: 's1', startup: 'AgriSense AI', startup_id: 'demo-startup-1', session_date: '2026-05-18', duration_mins: 60, topic: 'Pilot evidence review', notes: 'Discussed district-level pilot plan.', action_items: ['Prepare pilot validation document'], status: 'Completed' },
    { id: 's2', startup: 'AgriSense AI', startup_id: 'demo-startup-1', session_date: '2026-05-22', duration_mins: 45, topic: 'GTM strategy review', notes: '', action_items: ['Present GTM deck'], status: 'Scheduled' },
    { id: 's3', startup: 'SkillBridge Rural', startup_id: 'demo-startup-2', session_date: '2026-05-19', duration_mins: 50, topic: 'Learning path review', notes: 'Team needs to complete EdTech market sizing module.', action_items: ['Complete market sizing module'], status: 'Scheduled' },
  ])
}

export function updateMentorSession(sessionId: string, updates: Record<string, unknown>) {
  return putJson(`/mentor/sessions/${sessionId}`, updates, updates)
}

// ─── New AI features ──────────────────────────────────────────────────────────
export function aiPitch(startupId = 'demo-startup-1') {
  return postJson<{ hook: string; problem: string; solution: string; traction: string; ask: string; full_pitch: string; source: string }>(
    '/ai/pitch',
    { startup_id: startupId },
    { hook: '', problem: '', solution: '', traction: '', ask: '', full_pitch: '', source: 'fallback' },
  )
}

export function aiMentorMatch(startupId = 'demo-startup-1') {
  return postJson<Array<Record<string, unknown>>>('/ai/mentor-match', { startup_id: startupId }, [])
}

export function getCollaborators(startupId = 'demo-startup-1') {
  return getJson<Array<Record<string, unknown>>>(`/startup/${startupId}/collaborators`, [])
}

export function getAdminCohorts() {
  return getJson<Array<Record<string, unknown>>>('/admin/cohorts', [])
}
