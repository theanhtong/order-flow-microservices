import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { OutboxMessage, OutboxStatus } from './outbox-message.entity';

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger('OutboxProcessorService');

  constructor(
    @InjectRepository(OutboxMessage)
    private readonly outboxRepository: Repository<OutboxMessage>,
    @Inject('RABBITMQ_SERVICE')
    private readonly rabbitClient: ClientProxy,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutboxMessages() {
    const pendingMessages = await this.outboxRepository.find({
      where: { status: OutboxStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: 20,
    });

    if (pendingMessages.length === 0) {
      return;
    }

    this.logger.log(`Processing ${pendingMessages.length} pending outbox messages`);

    for (const message of pendingMessages) {
      try {
        this.rabbitClient.emit(message.eventType, message.payload).subscribe();
        message.status = OutboxStatus.PROCESSED;
        message.processedAt = new Date();
        await this.outboxRepository.save(message);
        this.logger.log(
          `Published outbox event "${message.eventType}" for ${message.aggregateType} #${message.aggregateId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to publish outbox event #${message.id}: ${error.message}`,
        );
        message.status = OutboxStatus.FAILED;
        await this.outboxRepository.save(message);
      }
    }
  }
}
