import { Controller, Post, Get, Body, Req, HttpCode } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";
import { Public } from "../auth/public.decorator";

@Controller("onboarding")
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get("progress")
  async getProgress(@Req() req: { user: { id: string } }) {
    return this.onboardingService.getProgress(req.user.id);
  }

  @Post("step")
  @HttpCode(200)
  async saveStep(
    @Req() req: { user: { id: string } },
    @Body() body: { step: number; data: Record<string, unknown> }
  ) {
    return this.onboardingService.saveStep(req.user.id, body.step, body.data);
  }

  @Post("complete")
  @HttpCode(200)
  async complete(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      educationLevel: string;
      experienceLevel: string;
      careerGoals: string[];
      interests: string[];
      learningStyle: string;
      dailyTimeMinutes: number;
      preferredDomains: string[];
    }
  ) {
    return this.onboardingService.complete(req.user.id, body);
  }
}
