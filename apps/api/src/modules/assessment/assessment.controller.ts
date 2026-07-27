import { Controller, Get, Post, Param, Body, Req } from "@nestjs/common";
import { AssessmentEngineService } from "./assessment.service";

@Controller("assessments")
export class AssessmentController {
  constructor(private assessmentService: AssessmentEngineService) {}

  @Get(":type")
  async getAssessment(@Param("type") type: string) {
    const assessment = await this.assessmentService.getAssessment(type);
    if (!assessment) return { error: "Assessment not found" };
    return assessment;
  }

  @Post(":type/submit")
  async submitAssessment(
    @Req() req: { user: { id: string } },
    @Param("type") type: string,
    @Body() body: { answers: { questionId: string; optionId: string | string[] }[] }
  ) {
    return this.assessmentService.submitAssessment(req.user.id, type, body.answers);
  }

  @Get("results/me")
  async getMyResults(@Req() req: { user: { id: string } }) {
    return this.assessmentService.getUserResults(req.user.id);
  }
}
