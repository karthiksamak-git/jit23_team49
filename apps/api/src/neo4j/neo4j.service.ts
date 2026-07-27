import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import neo4j, { Driver, Session } from "neo4j-driver";

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver | null = null;
  private readonly logger = new Logger(Neo4jService.name);
  private connected = false;

  async onModuleInit() {
    try {
      this.driver = neo4j.driver(
        process.env.NEO4J_URI || "bolt://localhost:7687",
        neo4j.auth.basic(
          process.env.NEO4J_USER || "neo4j",
          process.env.NEO4J_PASSWORD || "careerverse_dev"
        )
      );
      await this.driver.verifyConnectivity();
      this.connected = true;
      await this.seedGraph();
      this.logger.log("Neo4j connected and seeded");
    } catch (error) {
      this.logger.warn("Neo4j unavailable — recommendations will use PostgreSQL fallback");
      this.connected = false;
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getSession(): Session | null {
    return this.driver?.session() ?? null;
  }

  async runQuery<T = Record<string, unknown>>(
    query: string,
    params: Record<string, unknown> = {}
  ): Promise<T[]> {
    if (!this.connected || !this.driver) return [];
    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records.map((r) => r.toObject() as T);
    } finally {
      await session.close();
    }
  }

  private async seedGraph() {
    if (!this.driver) return;
    const session = this.driver.session();
    try {
      await session.run(`
        MERGE (w:World {slug: 'backend'})
        SET w.name = 'Backend Development', w.domain = 'backend'
      `);

      const careers = [
        { slug: "backend-developer", name: "Backend Developer", domain: "backend", demand: 0.9 },
        { slug: "frontend-developer", name: "Frontend Developer", domain: "frontend", demand: 0.85 },
        { slug: "full-stack-developer", name: "Full Stack Developer", domain: "backend", demand: 0.88 },
        { slug: "data-scientist", name: "Data Scientist", domain: "ai", demand: 0.82 },
        { slug: "devops-engineer", name: "DevOps Engineer", domain: "devops", demand: 0.87 },
        { slug: "ml-engineer", name: "ML Engineer", domain: "ai", demand: 0.86 },
        { slug: "cloud-architect", name: "Cloud Architect", domain: "cloud", demand: 0.8 },
        { slug: "cybersecurity-analyst", name: "Cybersecurity Analyst", domain: "cybersecurity", demand: 0.83 },
        { slug: "ui-ux-designer", name: "UI/UX Designer", domain: "design", demand: 0.75 },
        { slug: "product-manager", name: "Product Manager", domain: "business", demand: 0.78 },
      ];

      for (const c of careers) {
        await session.run(
          `MERGE (career:Career {slug: $slug})
           SET career.name = $name, career.domain = $domain, career.marketDemand = $demand`,
          c
        );
        await session.run(
          `MATCH (career:Career {slug: $slug}), (w:World {slug: $domain})
           MERGE (career)-[:BELONGS_TO_WORLD]->(w)`,
          { slug: c.slug, domain: c.domain === "backend" || c.domain === "frontend" ? "backend" : c.domain }
        );
      }

      const skills = [
        { slug: "javascript", name: "JavaScript", category: "programming" },
        { slug: "nodejs", name: "Node.js", category: "backend" },
        { slug: "sql", name: "SQL", category: "database" },
        { slug: "rest-apis", name: "REST APIs", category: "backend" },
        { slug: "python", name: "Python", category: "programming" },
        { slug: "react", name: "React", category: "frontend" },
        { slug: "docker", name: "Docker", category: "devops" },
        { slug: "machine-learning", name: "Machine Learning", category: "ai" },
        { slug: "problem-solving", name: "Problem Solving", category: "soft" },
        { slug: "system-design", name: "System Design", category: "architecture" },
      ];

      for (const s of skills) {
        await session.run(
          `MERGE (skill:Skill {slug: $slug}) SET skill.name = $name, skill.category = $category`,
          s
        );
      }

      const requires = [
        { career: "backend-developer", skill: "javascript", level: 70 },
        { career: "backend-developer", skill: "nodejs", level: 75 },
        { career: "backend-developer", skill: "sql", level: 70 },
        { career: "backend-developer", skill: "rest-apis", level: 80 },
        { career: "backend-developer", skill: "problem-solving", level: 75 },
        { career: "frontend-developer", skill: "javascript", level: 80 },
        { career: "frontend-developer", skill: "react", level: 75 },
        { career: "data-scientist", skill: "python", level: 80 },
        { career: "data-scientist", skill: "machine-learning", level: 75 },
        { career: "devops-engineer", skill: "docker", level: 80 },
        { career: "ml-engineer", skill: "python", level: 85 },
        { career: "ml-engineer", skill: "machine-learning", level: 80 },
      ];

      for (const r of requires) {
        await session.run(
          `MATCH (c:Career {slug: $career}), (s:Skill {slug: $skill})
           MERGE (c)-[r:REQUIRES]->(s) SET r.level = $level`,
          r
        );
      }

      const compatible = [
        ["backend-developer", "full-stack-developer"],
        ["frontend-developer", "full-stack-developer"],
        ["backend-developer", "devops-engineer"],
        ["data-scientist", "ml-engineer"],
      ];

      for (const [a, b] of compatible) {
        await session.run(
          `MATCH (c1:Career {slug: $a}), (c2:Career {slug: $b})
           MERGE (c1)-[:COMPATIBLE_WITH]->(c2)`,
          { a, b }
        );
      }
    } finally {
      await session.close();
    }
  }
}
