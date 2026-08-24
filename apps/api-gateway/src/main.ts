import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as proxy from 'express-http-proxy';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('APIGateway');
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const configService = app.get(ConfigService);

  const orderServiceUrl = configService.get<string>('ORDER_SERVICE_URL', 'http://localhost:3001');
  const inventoryServiceUrl = configService.get<string>('INVENTORY_SERVICE_URL', 'http://localhost:3002');
  const productServiceUrl = configService.get<string>('PRODUCT_SERVICE_URL', 'http://localhost:3003');

  // Reverse Proxy Routing to Downstream Microservices
  app.use(
    '/api/v1/orders',
    proxy(orderServiceUrl, {
      proxyReqPathResolver: (req) => `/api/v1/orders${req.url}`,
    }),
  );

  app.use(
    '/api/v1/inventory',
    proxy(inventoryServiceUrl, {
      proxyReqPathResolver: (req) => `/api/v1/inventory${req.url}`,
    }),
  );

  app.use(
    '/api/v1/products',
    proxy(productServiceUrl, {
      proxyReqPathResolver: (req) => `/api/v1/products${req.url}`,
    }),
  );

  // Consolidated Swagger Documentation for API Gateway Entry Point
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Gateway - OrderFlow Microservices')
    .setDescription(
      'Unified Reverse Proxy & Entry Point for Order, Inventory, and Product Microservices',
    )
    .setVersion('1.0')
    .addTag('products', 'Product Catalog APIs (Proxied to Product Service:3003)')
    .addTag('inventory', 'Inventory & Stock APIs (Proxied to Inventory Service:3002)')
    .addTag('orders', 'Order Management APIs (Proxied to Order Service:3001)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('API_GATEWAY_PORT', 3000);

  await app.listen(port);
  logger.log(`API Gateway is running on port ${port}`);
  logger.log(`Unified Swagger API Documentation available at http://localhost:${port}/api/docs`);
  logger.log(`Routing /api/v1/products -> ${productServiceUrl}`);
  logger.log(`Routing /api/v1/inventory -> ${inventoryServiceUrl}`);
  logger.log(`Routing /api/v1/orders -> ${orderServiceUrl}`);
}

bootstrap();
