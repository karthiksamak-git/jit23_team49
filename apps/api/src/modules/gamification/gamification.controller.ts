import { Controller, Get, Query, Request, UseGuards } from "@nestjs/common";
import { GamificationService } from "./gamification.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("gamification")
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @UseGuards(AuthGuard)
  @Get("stats")
  async getStats(@Request() req: any) {
    return this.gamificationService.getUserStats(req.user.id);
  }

  @Get("leaderboard")
  async getLeaderboard(@Query("limit") limit?: string) {
    const take = limit ? parseInt(limit, 10) : 50;
    return this.gamificationService.getLeaderboard(take);
  }
}
