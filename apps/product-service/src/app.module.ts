import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule, MetricsModule } from '@orderflow-microservices/shared';
import { ProductModule } from './product/product.module';
import { Product } from './product/entities/product.entity';

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
        url: configService.get<string>('PRODUCT_DATABASE_URL') || configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'db_product'),
        entities: [Product],
        synchronize: String(configService.get('DB_SYNCHRONIZE', 'true')) === 'true',
      }),
    }),
    ProductModule,
    HealthModule,
    MetricsModule,
  ],
})
export class AppModule {}
