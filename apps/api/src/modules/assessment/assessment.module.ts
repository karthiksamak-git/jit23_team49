import { Module } from "@nestjs/common";
import { AssessmentController } from "./assessment.controller";
import { AssessmentEngineService, RuleEngineService } from "./assessment.service";

@Module({
  controllers: [AssessmentController],
  providers: [AssessmentEngineService, RuleEngineService],
  exports: [AssessmentEngineService],
})
export class AssessmentModule {}
