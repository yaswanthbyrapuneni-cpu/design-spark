export const startup = {
  id: 'demo-startup-1',
  name: 'AgriSense AI',
  district: 'Visakhapatnam',
  sector: 'AgriTech',
  stage: 'MVP',
  dpiit: 'DIPP123456',
  team: 4,
  description:
    'AI-powered crop disease detection and yield prediction for small farmers using computer vision and IoT.',
  users: 'Small and marginal farmers across Andhra Pradesh coastal districts',
  pilot: 'Actively seeking district-level pilots',
  mentorshipNeed: 'GTM strategy and government sales',
}

export const readiness = {
  overall: 74,
  band: 'Near Ready',
  mentorDomain: 'AgriTech and government pilots',
  scores: [
    { label: 'Innovation', value: 82, color: '#0f6e56' },
    { label: 'Market', value: 68, color: '#ba7517' },
    { label: 'Technology', value: 79, color: '#534ab7' },
    { label: 'Pilot', value: 71, color: '#0f6e56' },
    { label: 'Funding', value: 64, color: '#d85a30' },
  ],
  strengths: ['Strong technical MVP', 'Clear farmer user segment', 'Relevant AP agriculture use case'],
  gaps: ['Pilot validation evidence missing', 'GTM strategy needs clarity', 'Funding narrative needs refinement'],
  nextSteps: ['Run district-level pilot', 'Meet AgriTech mentor', 'Complete GTM module'],
}

export const opportunities = [
  {
    title: 'AP Smart Agriculture Pilot 2026',
    type: 'Pilot',
    sponsor: 'RTIH + APIS',
    match: 96,
    deadline: '30 Jun 2026',
    reasons: ['Sector fit', 'Pilot interest aligned', 'DPIIT-recognized startup'],
  },
  {
    title: 'AgriTech Expert Mentor - Dr. Venkat Rao',
    type: 'Mentor',
    sponsor: 'School of Design Thinking',
    match: 91,
    deadline: 'Ongoing',
    reasons: ['Mentor domain fit', 'GTM need aligned', 'Government sales expertise'],
  },
  {
    title: 'Startup India Seed Fund',
    type: 'Grant',
    sponsor: 'Startup India',
    match: 82,
    deadline: '15 Jul 2026',
    reasons: ['Stage fit', 'Funding readiness gap', 'DPIIT eligibility'],
  },
  {
    title: 'NASSCOM DeepTech Cohort 2026',
    type: 'Program',
    sponsor: 'NASSCOM',
    match: 76,
    deadline: '20 Jun 2026',
    reasons: ['AI/ML fit', 'Technical MVP available', 'Scale-up support'],
  },
]

export const adminDashboard = {
  metrics: {
    totalStartups: 132,
    pilotReady: 24,
    learningPaths: 89,
    mentorSessions: 56,
  },
  sectors: [
    { name: 'AgriTech', value: 28, color: '#0f6e56' },
    { name: 'EdTech', value: 22, color: '#534ab7' },
    { name: 'HealthTech', value: 17, color: '#d85a30' },
    { name: 'GovTech', value: 15, color: '#2673d9' },
    { name: 'DeepTech', value: 18, color: '#ba7517' },
  ],
  stages: [
    { stage: 'Idea', startups: 18 },
    { stage: 'Prototype', startups: 31 },
    { stage: 'MVP', startups: 46 },
    { stage: 'Pilot', startups: 24 },
    { stage: 'Revenue', startups: 13 },
  ],
  districts: [
    { name: 'Visakhapatnam', count: 24, growth: '+18%' },
    { name: 'Vijayawada', count: 21, growth: '+14%' },
    { name: 'Tirupati', count: 17, growth: '+11%' },
    { name: 'Guntur', count: 15, growth: '+9%' },
    { name: 'Kurnool', count: 12, growth: '+6%' },
    { name: 'Rajahmundry', count: 9, growth: '+5%' },
    { name: 'Nellore', count: 8, growth: '+3%' },
    { name: 'Anantapur', count: 10, growth: '+4%' },
  ],
  pilotQueue: [
    ['AgriSense AI', 'AgriTech', 'Visakhapatnam', '74', 'Near Ready'],
    ['MedReach AP', 'HealthTech', 'Tirupati', '81', 'Ready'],
    ['SkillBridge Rural', 'EdTech', 'Vijayawada', '78', 'Near Ready'],
  ],
}
