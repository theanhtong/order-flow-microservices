import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '@orderflow-microservices/shared';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: any;

  const mockUserResult = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    fullName: 'Test User',
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse = {
    user: mockUserResult,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    authServiceMock = {
      register: jest.fn().mockResolvedValue(mockAuthResponse),
      login: jest.fn().mockResolvedValue(mockAuthResponse),
      refreshTokens: jest.fn().mockResolvedValue(mockAuthResponse),
      logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
      logoutAll: jest.fn().mockResolvedValue({ message: 'Logged out of all sessions' }),
      getUserProfile: jest.fn().mockResolvedValue(mockUserResult),
      adminCreateUser: jest.fn().mockResolvedValue(mockUserResult),
      adminGetAllUsers: jest.fn().mockResolvedValue([mockUserResult]),
      adminLogoutUser: jest.fn().mockResolvedValue({ message: 'User sessions invalidated' }),
      adminUpdateUserStatus: jest.fn().mockResolvedValue(mockUserResult),
      adminDeleteUser: jest.fn().mockResolvedValue({ message: 'User deleted' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a user via DTO', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123',
        fullName: 'Test User',
      };
      const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      const result = await controller.register(dto, mockRes);

      expect(authServiceMock.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should login user with valid DTO', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123',
      };
      const mockRes = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

      const result = await controller.login(dto, mockRes);

      expect(authServiceMock.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('adminCreateUser', () => {
    it('should delegate admin create user request with header values', async () => {
      const userId = 'admin-uuid';
      const userRole = UserRole.SYSTEM_ADMIN;

      const dto = {
        email: 'operator@example.com',
        password: 'Password123',
        fullName: 'Operator User',
        role: UserRole.OPERATOR,
      };

      const result = await controller.adminCreateUser(userId, userRole, dto);

      expect(authServiceMock.adminCreateUser).toHaveBeenCalledWith(
        { sub: userId, role: userRole, email: '' },
        dto,
      );
      expect(result).toEqual(mockUserResult);
    });
  });
});
