import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import * as proxy from 'express-http-proxy';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { createJwtGatewayMiddleware } from './middleware/jwt-auth.middleware';
import { createGuestSessionMiddleware } from './middleware/guest-session.middleware';

async function bootstrap() {
  const logger = new Logger('APIGateway');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.use(cookieParser());

  const configService = app.get(ConfigService);
  const jwtSecret = configService.get<string>('JWT_SECRET', 'super_secret_jwt_key_2026');

  const authServiceUrl = configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:3004');
  const orderServiceUrl = configService.get<string>('ORDER_SERVICE_URL', 'http://localhost:3001');
  const inventoryServiceUrl = configService.get<string>('INVENTORY_SERVICE_URL', 'http://localhost:3002');
  const productServiceUrl = configService.get<string>('PRODUCT_SERVICE_URL', 'http://localhost:3003');
  const paymentServiceUrl = configService.get<string>('PAYMENT_SERVICE_URL', 'http://localhost:3005');
  const cartServiceUrl = configService.get<string>('CART_SERVICE_URL', 'http://localhost:3007');
  const shippingServiceUrl = configService.get<string>('SHIPPING_SERVICE_URL', 'http://localhost:3006');

  const createProxyErrorHandler = (serviceName: string, serviceUrl: string) => {
    return (err: any, res: any) => {
      logger.warn(`Upstream service "${serviceName}" at ${serviceUrl} is unreachable: ${err.message}`);
      res.status(503).json({
        statusCode: 503,
        message: `Upstream service "${serviceName}" at ${serviceUrl} is currently unavailable. Please ensure the service container is running.`,
        error: 'Service Unavailable',
      });
    };
  };

  const createProxyOptions = (serviceUrl: string, pathPrefix: string, serviceName: string) => ({
    proxyReqPathResolver: (req: any) => `${pathPrefix}${req.url}`,
    proxyErrorHandler: createProxyErrorHandler(serviceName, serviceUrl),
    userResHeaderDecorator: (headers: any, userReq: any) => {
      if (userReq.headers.origin) {
        headers['access-control-allow-origin'] = userReq.headers.origin;
      }
      headers['access-control-allow-credentials'] = 'true';
      return headers;
    },
  });

  // Attach JWT Security & Guest Session Middleware
  app.use(cookieParser());
  app.use(createJwtGatewayMiddleware(jwtSecret));
  app.use(createGuestSessionMiddleware());

  // Reverse Proxy Routing to Downstream Microservices
  app.use('/api/v1/auth', proxy(authServiceUrl, createProxyOptions(authServiceUrl, '/api/v1/auth', 'Auth Service')));
  app.use('/api/v1/orders', proxy(orderServiceUrl, createProxyOptions(orderServiceUrl, '/api/v1/orders', 'Order Service')));
  app.use('/api/v1/inventory', proxy(inventoryServiceUrl, createProxyOptions(inventoryServiceUrl, '/api/v1/inventory', 'Inventory Service')));
  app.use('/api/v1/products', proxy(productServiceUrl, createProxyOptions(productServiceUrl, '/api/v1/products', 'Product Service')));
  app.use('/api/v1/payments', proxy(paymentServiceUrl, createProxyOptions(paymentServiceUrl, '/api/v1/payments', 'Payment Service')));
  app.use('/api/v1/cart', proxy(cartServiceUrl, createProxyOptions(cartServiceUrl, '/api/v1/cart', 'Cart Service')));
  app.use('/api/v1/shipments', proxy(shippingServiceUrl, createProxyOptions(shippingServiceUrl, '/api/v1/shipments', 'Shipping Service')));

  // Reverse Proxy OpenAPI Spec JSONs for Unified Swagger UI Dropdown
  app.use(
    '/api/docs/swagger-auth.json',
    proxy(authServiceUrl, {
      proxyReqPathResolver: () => '/api/docs-json',
      proxyErrorHandler: createProxyErrorHandler('Auth Service Docs', authServiceUrl),
    }),
  );

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

  app.use(
    '/api/docs/swagger-payment.json',
    proxy(paymentServiceUrl, {
      proxyReqPathResolver: () => '/api/docs-json',
      proxyErrorHandler: createProxyErrorHandler('Payment Service Docs', paymentServiceUrl),
    }),
  );

  app.use(
    '/api/docs/swagger-cart.json',
    proxy(cartServiceUrl, {
      proxyReqPathResolver: () => '/api/docs-json',
      proxyErrorHandler: createProxyErrorHandler('Cart Service Docs', cartServiceUrl),
    }),
  );

  SwaggerModule.setup('api/docs', app, null, {
    explorer: true,
    swaggerOptions: {
      urls: [
        { url: '/api/docs/swagger-auth.json', name: 'Auth Service API' },
        { url: '/api/docs/swagger-products.json', name: 'Product Service API' },
        { url: '/api/docs/swagger-inventory.json', name: 'Inventory Service API' },
        { url: '/api/docs/swagger-orders.json', name: 'Order Service API' },
        { url: '/api/docs/swagger-payment.json', name: 'Payment Service API' },
        { url: '/api/docs/swagger-cart.json', name: 'Cart Service API' },
      ],
    },
  });

  const port = configService.get<number>('API_GATEWAY_PORT', 3000);

  await app.listen(port);
  logger.log(`API Gateway is running on port ${port}`);
  logger.log(`Unified Swagger API Documentation available at http://localhost:${port}/api/docs`);
  logger.log(`Routing /api/v1/auth -> ${authServiceUrl}`);
  logger.log(`Routing /api/v1/products -> ${productServiceUrl}`);
  logger.log(`Routing /api/v1/inventory -> ${inventoryServiceUrl}`);
  logger.log(`Routing /api/v1/orders -> ${orderServiceUrl}`);
  logger.log(`Routing /api/v1/payments -> ${paymentServiceUrl}`);
  logger.log(`Routing /api/v1/cart -> ${cartServiceUrl}`);
}

bootstrap();
