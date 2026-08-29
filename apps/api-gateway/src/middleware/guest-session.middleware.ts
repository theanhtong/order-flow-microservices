import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function createGuestSessionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Read guest_id from cookies or headers
    let guestId = req.cookies?.guest_id || (req.headers['x-guest-id'] as string);

    // 2. If user is unauthenticated and guest_id is missing, generate a new HttpOnly Cookie
    if (!req.headers['x-user-id'] && !guestId) {
      guestId = `guest_${uuidv4()}`;
      res.cookie('guest_id', guestId, {
        httpOnly: true,
        maxAge: 30 * 60 * 1000, // 30 minutes short-lived session
        path: '/',
        sameSite: 'lax',
      });
    }

    if (guestId) {
      req.headers['x-guest-id'] = guestId;
    }

    next();
  };
}
