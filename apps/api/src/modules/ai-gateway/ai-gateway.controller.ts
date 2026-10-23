import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("ai")
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  @UseGuards(AuthGuard)
  @Post("prompt")
  async prompt(@Body("prompt") prompt: string) {
    return this.aiGatewayService.processPrompt(prompt);
  }
}
