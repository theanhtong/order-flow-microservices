import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserRole } from '@orderflow-microservices/shared';

describe('AuthService', () => {
  let service: AuthService;
  let userRepositoryMock: any;
  let refreshTokenRepositoryMock: any;
  let jwtServiceMock: any;
  let queryBuilderMock: any;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: '$2a$10$hashedpassword',
    fullName: 'Test User',
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin: User = {
    id: 'admin-uuid-1234',
    email: 'sysadmin@example.com',
    passwordHash: '$2a$10$hashedadminpassword',
    fullName: 'System Admin',
    role: UserRole.SYSTEM_ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    queryBuilderMock = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    userRepositoryMock = {
      count: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'new-user-uuid', ...dto })),
      save: jest.fn((user) => Promise.resolve(user)),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilderMock),
    };

    refreshTokenRepositoryMock = {
      create: jest.fn((dto) => ({ id: 'token-uuid', ...dto })),
      save: jest.fn((token) => Promise.resolve(token)),
      update: jest.fn(),
    };

    jwtServiceMock = {
      sign: jest.fn(() => 'mock-jwt-token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepositoryMock,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepositoryMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedDefaultAdmin', () => {
    it('should seed default admin when zero admins exist', async () => {
      userRepositoryMock.count.mockResolvedValue(0);

      await service['seedDefaultAdmin']();

      expect(userRepositoryMock.count).toHaveBeenCalledWith({
        where: { role: UserRole.SYSTEM_ADMIN },
      });
      expect(userRepositoryMock.create).toHaveBeenCalled();
      expect(userRepositoryMock.save).toHaveBeenCalled();
    });

    it('should not seed default admin when an admin already exists', async () => {
      userRepositoryMock.count.mockResolvedValue(1);

      await service['seedDefaultAdmin']();

      expect(userRepositoryMock.save).not.toHaveBeenCalled();
    });

    it('should handle database error during seeding gracefully', async () => {
      userRepositoryMock.count.mockRejectedValue(new Error('DB Error'));

      await expect(service['seedDefaultAdmin']()).resolves.not.toThrow();
    });
  });

  describe('register', () => {
    it('should register a new customer successfully', async () => {
      userRepositoryMock.findOne.mockResolvedValue(null);

      const dto = {
        email: 'newcustomer@example.com',
        password: 'Password123',
        fullName: 'New Customer',
      };

      const result = await service.register(dto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(userRepositoryMock.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already registered', async () => {
      userRepositoryMock.findOne.mockResolvedValue(mockUser);

      const dto = {
        email: mockUser.email,
        password: 'Password123',
        fullName: 'Existing User',
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user with correct credentials', async () => {
      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'compare').mockImplementation(() => Promise.resolve(true));

      queryBuilderMock.getOne.mockResolvedValue(mockUser);

      const dto = { email: mockUser.email, password: 'Password123' };
      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      queryBuilderMock.getOne.mockResolvedValue(null);

      const dto = { email: 'wrong@example.com', password: 'Password123' };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const bcryptjs = require('bcryptjs');
      jest.spyOn(bcryptjs, 'compare').mockImplementation(() => Promise.resolve(false));

      queryBuilderMock.getOne.mockResolvedValue(mockUser);

      const dto = { email: mockUser.email, password: 'WrongPassword' };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if user account is deactivated', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      queryBuilderMock.getOne.mockResolvedValue(inactiveUser);

      const dto = { email: inactiveUser.email, password: 'Password123' };

      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('adminCreateUser', () => {
    it('SYSTEM_ADMIN can create an OPERATOR account', async () => {
      const operatorPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: UserRole.SYSTEM_ADMIN,
        fullName: mockAdmin.fullName,
      };

      const dto = {
        email: 'operator@example.com',
        password: 'OperatorPassword123',
        fullName: 'New Operator',
        role: UserRole.OPERATOR,
      };

      userRepositoryMock.findOne.mockResolvedValue(null);

      const result = await service.adminCreateUser(operatorPayload, dto);

      expect(result.email).toBe(dto.email);
      expect(result.role).toBe(UserRole.OPERATOR);
    });

    it('OPERATOR cannot create a SYSTEM_ADMIN account (ForbiddenException)', async () => {
      const operatorPayload = {
        sub: 'op-uuid-123',
        email: 'op@example.com',
        role: UserRole.OPERATOR,
        fullName: 'Operator',
      };

      const dto = {
        email: 'newadmin@example.com',
        password: 'AdminPassword123',
        fullName: 'New Admin',
        role: UserRole.SYSTEM_ADMIN,
      };

      await expect(service.adminCreateUser(operatorPayload, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('adminDeleteUser', () => {
    it('SYSTEM_ADMIN can delete an OPERATOR user', async () => {
      const adminPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: UserRole.SYSTEM_ADMIN,
        fullName: mockAdmin.fullName,
      };

      const targetOperator: User = {
        ...mockUser,
        id: 'op-target-uuid',
        role: UserRole.OPERATOR,
      };

      userRepositoryMock.findOne.mockResolvedValue(targetOperator);

      const result = await service.adminDeleteUser(adminPayload, targetOperator.id);

      expect(userRepositoryMock.remove).toHaveBeenCalledWith(targetOperator);
      expect(result.message).toContain('permanently deleted');
    });

    it('User cannot delete their own account (BadRequestException)', async () => {
      const adminPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: UserRole.SYSTEM_ADMIN,
        fullName: mockAdmin.fullName,
      };

      userRepositoryMock.findOne.mockResolvedValue(mockAdmin);

      await expect(service.adminDeleteUser(adminPayload, mockAdmin.id)).rejects.toThrow(BadRequestException);
    });

    it('Throws NotFoundException if target user ID does not exist', async () => {
      const adminPayload = {
        sub: mockAdmin.id,
        email: mockAdmin.email,
        role: UserRole.SYSTEM_ADMIN,
        fullName: mockAdmin.fullName,
      };

      userRepositoryMock.findOne.mockResolvedValue(null);

      await expect(service.adminDeleteUser(adminPayload, 'non-existent-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
