import { Controller, Get, Req } from "@nestjs/common";
import { RecommendationService } from "./recommendation.service";

@Controller("recommendations")
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  @Get()
  async getRecommendations(@Req() req: { user: { id: string } }) {
    return this.recommendationService.getRecommendations(req.user.id);
  }
}
