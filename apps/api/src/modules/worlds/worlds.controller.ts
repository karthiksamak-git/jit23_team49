import { Controller, Get, Post, Param, Body, Req } from "@nestjs/common";
import { WorldsService } from "./worlds.service";

@Controller("worlds")
export class WorldsController {
  constructor(private worldsService: WorldsService) {}

  @Get()
  async getAllWorlds(@Req() req: { user: { id: string } }) {
    return this.worldsService.getAllWorlds(req.user.id);
  }

  @Get(":slug")
  async getWorld(
    @Param("slug") slug: string,
    @Req() req: { user: { id: string } }
  ) {
    return this.worldsService.getWorld(slug, req.user.id);
  }

  @Get(":slug/missions/:missionId")
  async getMission(
    @Param("slug") slug: string,
    @Param("missionId") missionId: string,
    @Req() req: { user: { id: string } }
  ) {
    return this.worldsService.getMission(slug, missionId, req.user.id);
  }

  @Post(":slug/missions/:missionId/complete")
  async completeMission(
    @Param("slug") slug: string,
    @Param("missionId") missionId: string,
    @Req() req: { user: { id: string } },
    @Body() body: { quizAnswers?: { questionId: string; optionId: string }[] }
  ) {
    return this.worldsService.completeMission(slug, missionId, req.user.id, body.quizAnswers);
  }
}
