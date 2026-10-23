import { Controller, Get, Param, Request, UseGuards } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @UseGuards(AuthGuard)
  @Get(":userId")
  async getPortfolio(@Param("userId") userId: string, @Request() req: any) {
    return this.portfolioService.getUserPortfolio(userId);
  }
}
