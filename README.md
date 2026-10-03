# CareerVerse — AI-Powered IT Career Exploration & Adaptive Learning Platform

> **Academic Title:** *A Dynamic AI-Driven Platform for IT Career Exploration, Adaptive Learning, and Job Readiness*  
> **Brand:** **CareerVerse**  
> **Architecture:** Next.js 15 App Router Monorepo + Groq Llama 3.3 70B AI Engine + Prisma PostgreSQL  

---

## 🌟 Overview

**CareerVerse** is an interactive, AI-driven career discovery and adaptive learning platform designed specifically for engineering students and beginners in IT. 

Instead of static tutorials or generic questionnaires, CareerVerse uses **Groq Llama 3.3 70B AI** to dynamically assess user interests, generate personalized career roadmaps, conduct adaptive Duolingo-style practice trials, evaluate mock interviews, and match users with entry-level jobs and internships.

---

## 🔥 Key Features & Capabilities

### 🧙‍♂️ 1. Dynamic AI-Powered Onboarding Engine
- **100% User-Driven Questions**: All onboarding questions are generated live by AI based on the user's name, previous answers, and background.
- **Narrator Sensei Interface**: Interactive AI Mentor dialogue box with typewriter text animations, standing character PNG, skip/reveal buttons, and medieval battle background overlay.
- **Inclusive Choice Options**: Every assessment step includes an **"Others"** option allowing custom or specialized interest exploration.
- **Instant Career Profiling**: Analyzes user responses to recommend the ideal IT domain (Frontend, Backend, Full-Stack, DevOps, AI/ML, Data Science, Cybersecurity, Mobile), starting difficulty, and personalized learning summary.

### 🧠 2. Adaptive Duolingo-Style AI Learning & Practice Engine
- **Live Capacity Analysis**: Measures and tracks user capacity levels (`Novice` ➔ `Apprentice` ➔ `Specialist` ➔ `Master`).
- **Dynamic Difficulty Scaling**: Automatically increases challenge complexity on correct answers.
- **Mistake Analysis & Instant Retry Loop**: When a user answers incorrectly, the AI mentor immediately analyzes the error, lowers the difficulty, provides an instant conceptual breakdown, and re-queues a **simplified step-by-step retry question** for that concept.
- **Hearts / Lives & Progress Bar**: Duolingo-style hearts (`❤️ ❤️ ❤️ ❤️`), streak tracking, and live progress bars.

### 🎮 3. Multi-Format Technical Challenge Types
- 🎯 **Multiple Choice Scenarios**: Practical technical reasoning questions.
- 💻 **Interactive Code Completion (`code-fill`)**: Dark-mode code blocks with missing placeholders (`___FILL___`) and inline selection choices.
- 🔍 **Bug Spotting (`bug-hunt`)**: Spot broken lines of code and select the exact fix.
- 🧩 **Pseudocode Line Ordering (`pseudocode-order`)**: Arrange pseudocode lines into proper execution order.

### 🗺️ 4. World Map & AI Custom Roadmap Generator
- **8 IT Domain Realms**: Domain-tailored learning paths for Frontend, Backend, Full-Stack, DevOps & Cloud, AI & Machine Learning, Data Science, Cybersecurity, and Mobile.
- **Prerequisite Level Unlocking**: Completing level `m1` in the Dojo automatically unlocks level `m2` and progresses the world map.
- **Custom Goal Roadmap Generator**: Type any custom career goal (e.g., *"Cloud Architect in 6 months"*) to instantly generate a custom 5-node AI learning path.

### 🎙️ 5. AI Mock Interview Chamber
- Evaluates user answers for IT roles with an instant **AI Scorecard** covering Technical Score, Problem Solving, System Design, Communication, Verdict, and constructive feedback.

### 💼 6. AI Job & Internship Matcher
- Matches user profile skills and completed milestones against entry-level IT jobs and internships with match percentages, skill gap analysis, and direct application links.

### 🎨 7. Vibrant Dark Silhouette Design System
- Modern dark mode styling with vibrant HSL color accents (`--teal`, `--purple`, `--emerald`, `--amber`, `--rose`, `--blue`), smooth micro-animations, glassmorphism cards, and zero static placeholders.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router), React 19 |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS, Tailwind CSS v4, Framer Motion |
| **AI Inference** | Groq API (`llama-3.3-70b-versatile`) |
| **Database & Auth** | Prisma, Better Auth, PostgreSQL |
| **Monorepo Tooling** | Turborepo, pnpm / npm |

---

## 🚀 Running the Project Locally

### 1. Prerequisites
- Node.js >= 20.x
- npm / pnpm

### 2. Environment Configuration
Create `.env` and `apps/web/.env.local` with your Groq API Key:
```env
GROQ_API_KEY="your_groq_api_key_here"
NEXT_PUBLIC_GROQ_API_KEY="your_groq_api_key_here"
```

### 3. Start Development Server
```bash
# Navigate to web app directory
cd apps/web

# Run Next.js development server
npm run dev
```

Visit **http://localhost:3000** in your browser!

---

## 📂 Key File Structure

```
apps/web/
├── app/
│   ├── (app)/
│   │   ├── dashboard/          # Personalized user dashboard & quick access
│   │   ├── onboarding/         # Dynamic AI onboarding & narrator sensei
│   │   ├── world-map/          # Domain realms, level unlocking & AI roadmap
│   │   ├── worlds/dojo/        # Adaptive Duolingo-style practice battle chamber
│   │   ├── interview/          # AI Mock interview evaluator
│   │   └── opportunities/      # AI job & internship matcher
│   ├── auth/                   # Sign in & registration flow
│   ├── page.tsx                # Public welcome landing page
│   └── globals.css             # Vibrant accent CSS design tokens
├── lib/
│   ├── ai-client.ts            # Groq Llama 3.3 70B API inference client
│   ├── ai-onboarding.ts        # AI dynamic question & profile analysis engine
│   ├── ai-dojo.ts              # Adaptive challenge generator & retry loop engine
│   ├── game-context.tsx        # Centralized player state & capacity tracking
│   └── clean-samurai.tsx       # Dynamic HTML5 canvas transparent character hook
```

---

## 📝 License

Distributed under the MIT License. Developed for Academic Major Project.
