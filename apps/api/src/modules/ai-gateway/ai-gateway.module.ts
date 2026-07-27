import { Module } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";
import { AiGatewayController } from "./ai-gateway.controller";

@Module({
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
