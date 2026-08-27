import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserJwtPayload, UserRole } from '@orderflow-microservices/shared';

export function createJwtGatewayMiddleware(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    let decodedUser: UserJwtPayload | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        decodedUser = jwt.verify(token, jwtSecret) as UserJwtPayload;
        req.headers['x-user-id'] = decodedUser.sub;
        req.headers['x-user-email'] = decodedUser.email;
        req.headers['x-user-role'] = decodedUser.role;
      } catch (err) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Invalid or expired JWT access token',
          error: 'Unauthorized',
        });
      }
    }

    const path = req.path;
    const method = req.method;

    const isPublicAuthRoute =
      path === '/api/v1/auth/register' ||
      path === '/api/v1/auth/login' ||
      path === '/api/v1/auth/refresh';

    const isPublicProductGet =
      path.startsWith('/api/v1/products') && method === 'GET';

    if (isPublicAuthRoute || isPublicProductGet) {
      return next();
    }

    if (path.startsWith('/api/v1/auth/admin')) {
      if (!decodedUser) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Authentication required to access admin endpoints',
          error: 'Unauthorized',
        });
      }
      if (
        decodedUser.role !== UserRole.OPERATOR &&
        decodedUser.role !== UserRole.SYSTEM_ADMIN
      ) {
        return res.status(403).json({
          statusCode: 403,
          message: 'Access denied: Requires OPERATOR or SYSTEM_ADMIN role',
          error: 'Forbidden',
        });
      }
    }

    if (path.startsWith('/api/v1/products') && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
      if (!decodedUser) {
        return res.status(401).json({
          statusCode: 401,
          message: 'Authentication required to modify products',
          error: 'Unauthorized',
        });
      }
      if (
        decodedUser.role !== UserRole.OPERATOR &&
        decodedUser.role !== UserRole.SYSTEM_ADMIN
      ) {
        return res.status(403).json({
          statusCode: 403,
          message: 'Access denied: Only OPERATOR or SYSTEM_ADMIN can modify products',
          error: 'Forbidden',
        });
      }
    }

    const isProtectedRoute =
      path.startsWith('/api/v1/orders') ||
      path.startsWith('/api/v1/auth/me') ||
      path.startsWith('/api/v1/auth/logout-all');

    if (isProtectedRoute && !decodedUser) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Authentication required to access this resource',
        error: 'Unauthorized',
      });
    }

    next();
  };
}
