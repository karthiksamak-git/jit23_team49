# CareerVerse — Platform Build & Multi-Phase Roadmap

> **Academic Title:** *A Dynamic Platform for Career Exploration and Decision Making*  
> **Brand:** **CareerVerse**  
> **Architecture:** Turborepo Monorepo (Next.js 15 App Router + NestJS API + Prisma PostgreSQL + Neo4j Graph + Redis Cache)

---

## Phase 1 MVP Features (100% Functional Without AI APIs)

- 🚀 **Premium Landing Page:** Animated Hero, Playable Career Worlds Preview, Feature Matrix, Interactive FAQ & CTA.
- 🔐 **Better Auth Integration:** PostgreSQL-backed session authentication with RBAC role support (`LEARNER`, `MENTOR`, `ADMIN`).
- 🧙‍♂️ **Interactive Onboarding:** 7-step card-based wizard (Education, Experience, Goals, Interests, Learning Style, Time Commitment, Starter World).
- 🧭 **Rule-Based Career Discovery:** Likert-scale interest mapping & logical aptitude assessment with weighted dimension scoring matrices.
- 🌐 **Neo4j Career Graph Recommendations:** Cypher query traversal (`Career -[:REQUIRES]-> Skill`) computing transparent compatibility match scores & explainable match rationale.
- 🎮 **Backend Engineering Playable World:** Interactive SVG world map with 5 Levels, 3 Regions, Missions, and Level 5 Boss Battle modal.
- 🏆 **Gamification Engine:** Dynamic XP leveling, daily streaks, coin rewards, titles, and weekly global leaderboard.

---

## Local Development Setup

### 1. Requirements
- Node.js >= 20.x
- npm / pnpm
- Docker & Docker Compose

### 2. Infrastructure Containers
Spin up PostgreSQL 16, Redis 7, and Neo4j 5:
```bash
npm run docker:up
```

### 3. Database Generation & Seeding
```bash
npm run db:generate
npm run db:seed
```

### 4. Run Monorepo Services
```bash
npm run dev
```
- **Next.js Web PWA:** `http://localhost:3000`
- **NestJS API:** `http://localhost:4000`
- **Neo4j Browser:** `http://localhost:7474` (User: `neo4j`, Password: `careerverse_dev`)

---

## Complete Multi-Phase Roadmap

- **Phase 1:** Core Monorepo, Better Auth, Interactive Onboarding, Neo4j Graph Recommendations, Playable Backend World, Gamification Engine.
- **Phase 2:** LiteLLM AI Gateway integration, Dynamic Skill Trees, Monaco Interactive Code Editor, Resume & Portfolio Builder.
- **Phase 3:** 4 Additional Worlds (Frontend, DevOps, Data, AI), WebSocket Real-Time Lobbies, Co-op Peer Quests, 1-on-1 Mentor Session Rooms.
- **Phase 4:** MongoDB Community Discussions, User-Generated Challenge Authoring, Reputation & Badging System, Content CMS.
- **Phase 5:** Qdrant Vector Semantic Matching, University Institutional Dashboard, Enterprise Recruiter Talent Portal, Advanced Analytics.
- **Phase 6:** Kubernetes Manifests, Temporal / BullMQ Async Workflows, Offline PWA Sync with IndexedDB, SAIF Security Compliance Audit.
