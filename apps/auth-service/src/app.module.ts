import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule, MetricsModule } from '@orderflow-microservices/shared';
import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Address } from './auth/entities/address.entity';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL', 'postgres://postgres:postgres@auth-db:5432/db_auth'),
        entities: [User, RefreshToken, Address],
        synchronize: String(configService.get('DB_SYNCHRONIZE', 'true')) === 'true',
        retryAttempts: 10,
        retryDelay: 3000,
        logging: false,
      }),
    }),
    AuthModule,
    HealthModule,
    MetricsModule,
  ],
})
export class AppModule {}
