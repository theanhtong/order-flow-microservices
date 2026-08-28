import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment/entities/payment.entity';
import { PaymentModule } from './payment/payment.module';

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
        url: configService.get<string>('DATABASE_URL', 'postgres://postgres:postgres@payment-db:5432/db_payment'),
        entities: [Payment],
        synchronize: String(configService.get('DB_SYNCHRONIZE', 'true')) === 'true',
        retryAttempts: 10,
        retryDelay: 3000,
        logging: false,
      }),
    }),
    PaymentModule,
  ],
})
export class AppModule {}
