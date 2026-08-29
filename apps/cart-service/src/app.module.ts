import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule, MetricsModule } from '@orderflow-microservices/shared';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    CartModule,
    HealthModule,
    MetricsModule,
  ],
})
export class AppModule {}
