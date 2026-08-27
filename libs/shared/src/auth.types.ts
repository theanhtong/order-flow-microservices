export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  OPERATOR = 'OPERATOR',
  CUSTOMER = 'CUSTOMER',
}

export const ROLE_LEVELS: Record<UserRole, number> = {
  [UserRole.SYSTEM_ADMIN]: 3,
  [UserRole.OPERATOR]: 2,
  [UserRole.CUSTOMER]: 1,
};

export interface UserJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  fullName?: string;
}
