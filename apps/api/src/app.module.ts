import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { Neo4jModule } from "./neo4j/neo4j.module";
import { AuthModule } from "./modules/auth/auth.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { AssessmentModule } from "./modules/assessment/assessment.module";
import { RecommendationModule } from "./modules/recommendation/recommendation.module";
import { WorldsModule } from "./modules/worlds/worlds.module";
import { GamificationModule } from "./modules/gamification/gamification.module";
import { AiGatewayModule } from "./modules/ai-gateway/ai-gateway.module";
import { PortfolioModule } from "./modules/portfolio/portfolio.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    Neo4jModule,
    AuthModule,
    OnboardingModule,
    AssessmentModule,
    RecommendationModule,
    WorldsModule,
    GamificationModule,
    AiGatewayModule,
    PortfolioModule,
  ],
})
export class AppModule {}
