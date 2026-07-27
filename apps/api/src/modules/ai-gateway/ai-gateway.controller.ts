import { Body, Controller, Post } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";

@Controller("ai")
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  @Post("prompt")
  async prompt(@Body("prompt") prompt: string) {
    return this.aiGatewayService.processPrompt(prompt);
  }
}
