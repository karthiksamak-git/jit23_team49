import {
  PrismaClient,
  AssessmentType,
  MissionType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CareerVerse database...");

  // Achievements
  const achievements = [
    { slug: "first-steps", name: "First Steps", description: "Complete onboarding", icon: "footprints", condition: "onboarding_complete", xpReward: 50, coinReward: 25 },
    { slug: "world-explorer", name: "World Explorer", description: "Enter your first career world", icon: "globe", condition: "world_enter", xpReward: 75, coinReward: 50 },
    { slug: "assessment-ace", name: "Assessment Ace", description: "Complete your first assessment", icon: "clipboard-check", condition: "assessment_complete", xpReward: 100, coinReward: 50 },
    { slug: "streak-warrior", name: "Streak Warrior", description: "Maintain a 7-day streak", icon: "flame", condition: "streak_7", xpReward: 200, coinReward: 100 },
    { slug: "boss-slayer", name: "Boss Slayer", description: "Defeat your first boss battle", icon: "swords", condition: "boss_defeat", xpReward: 300, coinReward: 150 },
    { slug: "mission-master", name: "Mission Master", description: "Complete 10 missions", icon: "target", condition: "missions_10", xpReward: 250, coinReward: 125 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      update: a,
      create: a,
    });
  }

  // Skills
  const skillsData = [
    { name: "JavaScript", slug: "javascript", category: "programming", description: "Core web programming language" },
    { name: "TypeScript", slug: "typescript", category: "programming", description: "Typed superset of JavaScript" },
    { name: "Node.js", slug: "nodejs", category: "backend", description: "JavaScript runtime for server-side" },
    { name: "SQL", slug: "sql", category: "database", description: "Structured query language" },
    { name: "PostgreSQL", slug: "postgresql", category: "database", description: "Advanced relational database" },
    { name: "REST APIs", slug: "rest-apis", category: "backend", description: "RESTful API design" },
    { name: "System Design", slug: "system-design", category: "architecture", description: "Designing scalable systems" },
    { name: "Docker", slug: "docker", category: "devops", description: "Containerization platform" },
    { name: "Git", slug: "git", category: "tools", description: "Version control system" },
    { name: "Problem Solving", slug: "problem-solving", category: "soft", description: "Analytical thinking" },
    { name: "Python", slug: "python", category: "programming", description: "Versatile programming language" },
    { name: "Machine Learning", slug: "machine-learning", category: "ai", description: "ML algorithms and models" },
    { name: "React", slug: "react", category: "frontend", description: "UI library for web apps" },
    { name: "CSS", slug: "css", category: "frontend", description: "Styling for web pages" },
    { name: "Communication", slug: "communication", category: "soft", description: "Effective communication skills" },
    { name: "Data Analysis", slug: "data-analysis", category: "analytics", description: "Analyzing and interpreting data" },
    { name: "Cloud Computing", slug: "cloud-computing", category: "cloud", description: "Cloud infrastructure and services" },
    { name: "Cybersecurity", slug: "cybersecurity", category: "security", description: "Security principles and practices" },
    { name: "UI/UX Design", slug: "ui-ux-design", category: "design", description: "User interface and experience design" },
    { name: "Project Management", slug: "project-management", category: "soft", description: "Managing projects effectively" },
  ];

  const skills: Record<string, string> = {};
  for (const s of skillsData) {
    const skill = await prisma.skill.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
    skills[s.slug] = skill.id;
  }

  // Careers
  const careersData = [
    { name: "Backend Developer", slug: "backend-developer", description: "Build server-side applications and APIs", domain: "backend", marketDemand: 0.9 },
    { name: "Frontend Developer", slug: "frontend-developer", description: "Create user interfaces and web experiences", domain: "frontend", marketDemand: 0.85 },
    { name: "Full Stack Developer", slug: "full-stack-developer", description: "Work across frontend and backend", domain: "backend", marketDemand: 0.88 },
    { name: "Data Scientist", slug: "data-scientist", description: "Analyze data and build ML models", domain: "ai", marketDemand: 0.82 },
    { name: "DevOps Engineer", slug: "devops-engineer", description: "Automate deployment and infrastructure", domain: "devops", marketDemand: 0.87 },
    { name: "Cloud Architect", slug: "cloud-architect", description: "Design cloud infrastructure solutions", domain: "cloud", marketDemand: 0.8 },
    { name: "Cybersecurity Analyst", slug: "cybersecurity-analyst", description: "Protect systems from security threats", domain: "cybersecurity", marketDemand: 0.83 },
    { name: "UI/UX Designer", slug: "ui-ux-designer", description: "Design beautiful user experiences", domain: "design", marketDemand: 0.75 },
    { name: "Product Manager", slug: "product-manager", description: "Lead product strategy and development", domain: "business", marketDemand: 0.78 },
    { name: "Machine Learning Engineer", slug: "ml-engineer", description: "Build and deploy ML systems", domain: "ai", marketDemand: 0.86 },
    { name: "Mobile Developer", slug: "mobile-developer", description: "Build iOS and Android applications", domain: "frontend", marketDemand: 0.72 },
    { name: "Game Developer", slug: "game-developer", description: "Create interactive games", domain: "gamedev", marketDemand: 0.65 },
    { name: "Blockchain Developer", slug: "blockchain-developer", description: "Build decentralized applications", domain: "blockchain", marketDemand: 0.6 },
    { name: "Research Scientist", slug: "research-scientist", description: "Conduct scientific research", domain: "research", marketDemand: 0.55 },
    { name: "Technical Writer", slug: "technical-writer", description: "Create technical documentation", domain: "business", marketDemand: 0.6 },
  ];

  const careerRequirements: Record<string, { skill: string; level: number; weight: number }[]> = {
    "backend-developer": [
      { skill: "javascript", level: 70, weight: 1.0 },
      { skill: "nodejs", level: 75, weight: 1.2 },
      { skill: "sql", level: 70, weight: 1.0 },
      { skill: "rest-apis", level: 80, weight: 1.1 },
      { skill: "problem-solving", level: 75, weight: 0.9 },
    ],
    "frontend-developer": [
      { skill: "javascript", level: 80, weight: 1.2 },
      { skill: "react", level: 75, weight: 1.1 },
      { skill: "css", level: 70, weight: 1.0 },
      { skill: "problem-solving", level: 65, weight: 0.8 },
    ],
    "data-scientist": [
      { skill: "python", level: 80, weight: 1.2 },
      { skill: "machine-learning", level: 75, weight: 1.1 },
      { skill: "data-analysis", level: 85, weight: 1.2 },
      { skill: "sql", level: 65, weight: 0.9 },
    ],
    "devops-engineer": [
      { skill: "docker", level: 80, weight: 1.1 },
      { skill: "cloud-computing", level: 75, weight: 1.2 },
      { skill: "git", level: 70, weight: 0.9 },
      { skill: "problem-solving", level: 70, weight: 0.8 },
    ],
  };

  for (const c of careersData) {
    const career = await prisma.career.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });

    const reqs = careerRequirements[c.slug];
    if (reqs) {
      for (const req of reqs) {
        await prisma.careerSkillRequirement.upsert({
          where: {
            careerId_skillId: {
              careerId: career.id,
              skillId: skills[req.skill],
            },
          },
          update: { requiredLevel: req.level, weight: req.weight },
          create: {
            careerId: career.id,
            skillId: skills[req.skill],
            requiredLevel: req.level,
            weight: req.weight,
          },
        });
      }
    }
  }

  // Interest Assessment
  const interestAssessment = await prisma.assessment.upsert({
    where: { type: AssessmentType.INTEREST },
    update: {},
    create: {
      type: AssessmentType.INTEREST,
      title: "Interest Mapping",
      description: "Discover what career domains excite you most",
      duration: 10,
    },
  });

  const interestQuestions = [
    { text: "I enjoy solving complex logical problems", dimension: "analytical", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
    { text: "I prefer creating visual designs and layouts", dimension: "creative", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
    { text: "I like working with data and finding patterns", dimension: "analytical", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
    { text: "I enjoy building and deploying software systems", dimension: "technical", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
    { text: "I prefer leading teams and making strategic decisions", dimension: "leadership", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
    { text: "I enjoy helping and teaching others", dimension: "social", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
    { text: "I like researching and exploring new technologies", dimension: "research", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
    { text: "I prefer hands-on practical work over theory", dimension: "practical", options: [
      { text: "Strongly Disagree", points: 10 }, { text: "Disagree", points: 30 },
      { text: "Neutral", points: 50 }, { text: "Agree", points: 75 }, { text: "Strongly Agree", points: 95 },
    ]},
  ];

  await prisma.question.deleteMany({ where: { assessmentId: interestAssessment.id } });
  for (let i = 0; i < interestQuestions.length; i++) {
    const q = interestQuestions[i];
    await prisma.question.create({
      data: {
        assessmentId: interestAssessment.id,
        text: q.text,
        order: i + 1,
        questionType: "LIKERT",
        dimension: q.dimension,
        options: {
          create: q.options.map((o, j) => ({
            text: o.text,
            points: o.points,
            dimension: q.dimension,
          })),
        },
      },
    });
  }

  // Aptitude Assessment
  const aptitudeAssessment = await prisma.assessment.upsert({
    where: { type: AssessmentType.APTITUDE },
    update: {},
    create: {
      type: AssessmentType.APTITUDE,
      title: "Aptitude Test",
      description: "Test your logical reasoning and pattern recognition",
      duration: 15,
    },
  });

  const aptitudeQuestions = [
    { text: "What comes next in the sequence: 2, 4, 8, 16, ?", dimension: "logical", correct: 2, options: ["24", "32", "20", "28"] },
    { text: "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?", dimension: "logical", correct: 0, options: ["Yes", "No", "Cannot determine", "Only some"] },
    { text: "Which shape completes the pattern? (Circle, Square, Circle, Square, ?)", dimension: "pattern", correct: 0, options: ["Circle", "Square", "Triangle", "Hexagon"] },
    { text: "A train travels 120 km in 2 hours. How far in 3.5 hours at same speed?", dimension: "quantitative", correct: 1, options: ["180 km", "210 km", "200 km", "240 km"] },
    { text: "Which word does NOT belong: Apple, Banana, Carrot, Grape?", dimension: "verbal", correct: 2, options: ["Apple", "Banana", "Carrot", "Grape"] },
    { text: "If CODE is written as DPEF, how is GAME written?", dimension: "logical", correct: 0, options: ["HBNF", "FZLD", "GBNF", "HCLF"] },
  ];

  await prisma.question.deleteMany({ where: { assessmentId: aptitudeAssessment.id } });
  for (let i = 0; i < aptitudeQuestions.length; i++) {
    const q = aptitudeQuestions[i];
    await prisma.question.create({
      data: {
        assessmentId: aptitudeAssessment.id,
        text: q.text,
        order: i + 1,
        questionType: "MCQ",
        dimension: q.dimension,
        options: {
          create: q.options.map((text, j) => ({
            text,
            points: j === q.correct ? 100 : 0,
            dimension: q.dimension,
          })),
        },
      },
    });
  }

  // Backend Development World
  const world = await prisma.world.upsert({
    where: { slug: "backend" },
    update: {},
    create: {
      name: "Backend Development",
      slug: "backend",
      description: "Master server-side development, APIs, databases, and system architecture",
      domain: "backend",
      icon: "server",
      color: "#6366f1",
    },
  });

  const levelNames = ["Novice", "Apprentice", "Practitioner", "Specialist", "Master"];
  const regionNames = ["APIs", "Databases", "Architecture"];

  for (let l = 0; l < 5; l++) {
    const level = await prisma.level.upsert({
      where: { worldId_number: { worldId: world.id, number: l + 1 } },
      update: {},
      create: {
        worldId: world.id,
        number: l + 1,
        name: levelNames[l],
        description: `Level ${l + 1}: ${levelNames[l]} tier challenges`,
        xpRequired: l * 200,
      },
    });

    for (let r = 0; r < 3; r++) {
      const region = await prisma.region.upsert({
        where: { id: `${world.id}-l${l + 1}-r${r + 1}` },
        update: {},
        create: {
          id: `${world.id}-l${l + 1}-r${r + 1}`,
          levelId: level.id,
          name: regionNames[r],
          description: `${regionNames[r]} fundamentals for ${levelNames[l]} level`,
          order: r + 1,
        },
      });

      const missionCount = r === 2 && l === 2 ? 1 : 2;
      for (let m = 0; m < missionCount; m++) {
        const isBoss = l === 2 && r === 2 && m === 0;
        const missionType = isBoss ? MissionType.BOSS : m === 1 ? MissionType.QUIZ : MissionType.READ;

        await prisma.mission.create({
          data: {
            regionId: region.id,
            title: isBoss
              ? `Boss Battle: ${regionNames[r]} Master`
              : `${regionNames[r]} Mission ${m + 1}`,
            description: isBoss
              ? "Face the ultimate challenge to prove your mastery"
              : `Learn ${regionNames[r]} concepts at ${levelNames[l]} level`,
            type: missionType,
            order: m + 1,
            xpReward: isBoss ? 200 : 50,
            coinReward: isBoss ? 100 : 25,
            content: isBoss
              ? `# Boss Battle: Backend Architecture Master\n\nProve your mastery by completing this multi-step challenge covering APIs, databases, and system design.\n\n## Challenge Steps\n1. Design a REST API for a blog platform\n2. Choose the right database schema\n3. Explain caching strategy\n\nComplete all quiz questions to defeat the boss!`
              : `# ${regionNames[r]} - ${levelNames[l]}\n\nWelcome to the ${regionNames[r]} region! In this mission you'll learn essential concepts.\n\n## Key Topics\n- Core ${regionNames[r]} principles\n- Best practices\n- Real-world applications\n\nRead through the content and complete the quiz to earn XP.`,
            quizData: missionType !== MissionType.READ ? {
              questions: [
                {
                  id: "q1",
                  question: `What is a key principle of ${regionNames[r]}?`,
                  options: [
                    { id: "a", text: "Scalability and maintainability" },
                    { id: "b", text: "Only speed matters" },
                    { id: "c", text: "Ignore security" },
                    { id: "d", text: "Skip testing" },
                  ],
                  correctOptionId: "a",
                },
                {
                  id: "q2",
                  question: isBoss
                    ? "Which caching strategy is best for read-heavy applications?"
                    : `Best practice for ${regionNames[r]}?`,
                  options: isBoss
                    ? [
                        { id: "a", text: "Cache-aside pattern" },
                        { id: "b", text: "No caching" },
                        { id: "c", text: "Cache everything forever" },
                        { id: "d", text: "Random eviction" },
                      ]
                    : [
                        { id: "a", text: "Follow industry standards" },
                        { id: "b", text: "Reinvent everything" },
                        { id: "c", text: "Skip documentation" },
                        { id: "d", text: "Ignore errors" },
                      ],
                  correctOptionId: "a",
                },
              ],
            } : undefined,
          },
        });
      }
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
