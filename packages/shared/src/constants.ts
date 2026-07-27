export const APP_NAME = "CareerVerse";
export const APP_TAGLINE = "Explore. Learn. Level Up Your Career.";
export const APP_DESCRIPTION =
  "A next-generation gamified intelligent learning and career exploration ecosystem.";

export const XP_REWARDS = {
  MISSION_COMPLETE: 50,
  BOSS_DEFEAT: 200,
  ASSESSMENT_COMPLETE: 75,
  DAILY_LOGIN: 10,
  ONBOARDING_COMPLETE: 100,
} as const;

export const COIN_REWARDS = {
  MISSION_COMPLETE: 25,
  BOSS_DEFEAT: 100,
  STREAK_MILESTONE: 50,
  ASSESSMENT_COMPLETE: 30,
} as const;

export const TITLE_THRESHOLDS = [
  { xp: 0, title: "Explorer" },
  { xp: 500, title: "Pathfinder" },
  { xp: 1500, title: "Architect" },
  { xp: 5000, title: "Master" },
  { xp: 15000, title: "Legend" },
] as const;

export const ONBOARDING_STEPS = [
  { id: 1, title: "Education", description: "Tell us about your education" },
  { id: 2, title: "Experience", description: "Your professional experience" },
  { id: 3, title: "Goals", description: "What are your career goals?" },
  { id: 4, title: "Interests", description: "What excites you?" },
  { id: 5, title: "Learning Style", description: "How do you learn best?" },
  { id: 6, title: "Daily Time", description: "How much time can you invest?" },
  { id: 7, title: "Domains", description: "Pick your preferred domains" },
] as const;

export const CAREER_DOMAINS = [
  { id: "ai", name: "Artificial Intelligence", icon: "brain" },
  { id: "cloud", name: "Cloud Computing", icon: "cloud" },
  { id: "cybersecurity", name: "Cybersecurity", icon: "shield" },
  { id: "backend", name: "Backend Development", icon: "server" },
  { id: "frontend", name: "Frontend Development", icon: "layout" },
  { id: "devops", name: "DevOps", icon: "git-branch" },
  { id: "blockchain", name: "Blockchain", icon: "link" },
  { id: "robotics", name: "Robotics", icon: "cpu" },
  { id: "iot", name: "IoT", icon: "wifi" },
  { id: "gamedev", name: "Game Development", icon: "gamepad" },
  { id: "finance", name: "Finance", icon: "dollar-sign" },
  { id: "design", name: "Design", icon: "palette" },
  { id: "marketing", name: "Marketing", icon: "megaphone" },
  { id: "research", name: "Research", icon: "microscope" },
] as const;

export const INTEREST_OPTIONS = [
  "Problem Solving",
  "Creative Design",
  "Data Analysis",
  "Building Products",
  "Helping Others",
  "Research",
  "Leadership",
  "Technology",
  "Business Strategy",
  "Communication",
] as const;

export const CAREER_GOALS = [
  "Land first job",
  "Switch careers",
  "Get promoted",
  "Build portfolio",
  "Learn new skills",
  "Start a business",
  "Become an expert",
  "Explore options",
] as const;

export const EDUCATION_OPTIONS = [
  { value: "HIGH_SCHOOL", label: "High School", icon: "graduation-cap" },
  { value: "UNDERGRADUATE", label: "Undergraduate", icon: "book-open" },
  { value: "GRADUATE", label: "Graduate", icon: "award" },
  { value: "PROFESSIONAL", label: "Professional", icon: "briefcase" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", label: "Beginner", description: "Just starting out" },
  { value: "INTERMEDIATE", label: "Intermediate", description: "1-3 years experience" },
  { value: "ADVANCED", label: "Advanced", description: "3-7 years experience" },
  { value: "EXPERT", label: "Expert", description: "7+ years experience" },
] as const;

export const LEARNING_STYLE_OPTIONS = [
  { value: "VISUAL", label: "Visual", description: "Diagrams, videos, charts" },
  { value: "AUDITORY", label: "Auditory", description: "Podcasts, discussions" },
  { value: "READING", label: "Reading", description: "Articles, documentation" },
  { value: "KINESTHETIC", label: "Hands-on", description: "Projects, practice" },
  { value: "MIXED", label: "Mixed", description: "Combination of all" },
] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/worlds", label: "Worlds", icon: "globe" },
  { href: "/recommendations", label: "Recommendations", icon: "sparkles" },
  { href: "/profile", label: "Profile", icon: "user" },
] as const;
