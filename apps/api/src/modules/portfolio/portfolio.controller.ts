import { Controller, Get, Param, Request, UseGuards } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get(":userId")
  async getPortfolio(@Param("userId") userId: string) {
    return this.portfolioService.getUserPortfolio(userId);
  }
}
