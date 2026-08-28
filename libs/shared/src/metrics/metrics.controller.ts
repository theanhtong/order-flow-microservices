import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import * as client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'orderflow_' });

@ApiTags('Observability')
@Controller('metrics')
export class MetricsController {
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @Get()
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  }
}
