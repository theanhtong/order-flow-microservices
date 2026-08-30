import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule, MetricsModule } from '@orderflow-microservices/shared';
import { ShippingModule } from './shipping/shipping.module';
import { Shipment } from './shipping/entities/shipment.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'db_order'),
        entities: [Shipment],
        synchronize: String(configService.get('DB_SYNCHRONIZE', 'true')) === 'true',
      }),
    }),
    ShippingModule,
    HealthModule,
    MetricsModule,
  ],
})
export class AppModule {}
