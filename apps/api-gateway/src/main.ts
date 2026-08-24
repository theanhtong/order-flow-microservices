import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
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

  const createProxyErrorHandler = (serviceName: string, serviceUrl: string) => {
    return (err: any, res: any, next: any) => {
      logger.warn(`Upstream service "${serviceName}" at ${serviceUrl} is unreachable: ${err.message}`);
      res.status(503).json({
        statusCode: 503,
        message: `Upstream service "${serviceName}" at ${serviceUrl} is currently unavailable. Please ensure the service container is running.`,
        error: 'Service Unavailable',
      });
    };
  };

  // Reverse Proxy Routing to Downstream Microservices
  app.use(
    '/api/v1/orders',
    proxy(orderServiceUrl, {
      proxyReqPathResolver: (req) => `/api/v1/orders${req.url}`,
      proxyErrorHandler: createProxyErrorHandler('Order Service', orderServiceUrl),
    }),
  );

  app.use(
    '/api/v1/inventory',
    proxy(inventoryServiceUrl, {
      proxyReqPathResolver: (req) => `/api/v1/inventory${req.url}`,
      proxyErrorHandler: createProxyErrorHandler('Inventory Service', inventoryServiceUrl),
    }),
  );

  app.use(
    '/api/v1/products',
    proxy(productServiceUrl, {
      proxyReqPathResolver: (req) => `/api/v1/products${req.url}`,
      proxyErrorHandler: createProxyErrorHandler('Product Service', productServiceUrl),
    }),
  );

  // Reverse Proxy OpenAPI Spec JSONs for Unified Swagger UI Dropdown
  app.use(
    '/api/docs/swagger-products.json',
    proxy(productServiceUrl, {
      proxyReqPathResolver: () => '/api/docs-json',
      proxyErrorHandler: createProxyErrorHandler('Product Service Docs', productServiceUrl),
    }),
  );

  app.use(
    '/api/docs/swagger-inventory.json',
    proxy(inventoryServiceUrl, {
      proxyReqPathResolver: () => '/api/docs-json',
      proxyErrorHandler: createProxyErrorHandler('Inventory Service Docs', inventoryServiceUrl),
    }),
  );

  app.use(
    '/api/docs/swagger-orders.json',
    proxy(orderServiceUrl, {
      proxyReqPathResolver: () => '/api/docs-json',
      proxyErrorHandler: createProxyErrorHandler('Order Service Docs', orderServiceUrl),
    }),
  );

  SwaggerModule.setup('api/docs', app, null, {
    explorer: true,
    swaggerOptions: {
      urls: [
        { url: '/api/docs/swagger-products.json', name: 'Product Service API' },
        { url: '/api/docs/swagger-inventory.json', name: 'Inventory Service API' },
        { url: '/api/docs/swagger-orders.json', name: 'Order Service API' },
      ],
    },
  });

  const port = configService.get<number>('API_GATEWAY_PORT', 3000);

  await app.listen(port);
  logger.log(`API Gateway is running on port ${port}`);
  logger.log(`Unified Swagger API Documentation available at http://localhost:${port}/api/docs`);
  logger.log(`Routing /api/v1/products -> ${productServiceUrl}`);
  logger.log(`Routing /api/v1/inventory -> ${inventoryServiceUrl}`);
  logger.log(`Routing /api/v1/orders -> ${orderServiceUrl}`);
}

bootstrap();
