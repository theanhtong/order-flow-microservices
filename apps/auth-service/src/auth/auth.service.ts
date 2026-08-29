import {
  Injectable,
  Logger,
  OnModuleInit,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Address } from './entities/address.entity';
import { RegisterDto, LoginDto, CreateUserAdminDto, UpdateStatusDto, CreateAddressDto, UpdateAddressDto } from './dto';
import { UserRole, ROLE_LEVELS, UserJwtPayload } from '@orderflow-microservices/shared';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger('AuthService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  private async seedDefaultAdmin() {
    try {
      const adminCount = await this.userRepository.count({
        where: { role: UserRole.SYSTEM_ADMIN },
      });
      if (adminCount === 0) {
        const passwordHash = await bcrypt.hash('Sysadmin@123', 10);
        const defaultAdmin = this.userRepository.create({
          email: 'sysadmin@example.com',
          passwordHash,
          fullName: 'Master System Administrator',
          role: UserRole.SYSTEM_ADMIN,
          isActive: true,
        });
        await this.userRepository.save(defaultAdmin);
        this.logger.log('Seeded default SYSTEM_ADMIN account: sysadmin@example.com / Sysadmin@123');
      }
    } catch (error) {
      this.logger.warn(`Could not seed default admin on startup: ${error.message}`);
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: UserRole.CUSTOMER,
    });

    const savedUser = await this.userRepository.save(user);
    const tokens = await this.generateTokens(savedUser);

    return {
      user: this.sanitizeUser(savedUser),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshTokenStr: string) {
    const tokenRecord = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshTokenStr,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findOne({ where: { id: tokenRecord.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    tokenRecord.isRevoked = true;
    await this.refreshTokenRepository.save(tokenRecord);

    const newTokens = await this.generateTokens(user);
    return newTokens;
  }

  async logout(refreshTokenStr: string) {
    if (refreshTokenStr) {
      await this.refreshTokenRepository.update({ token: refreshTokenStr }, { isRevoked: true });
    }
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.refreshTokenRepository.update({ userId, isRevoked: false }, { isRevoked: true });
    return { message: 'Logged out from all devices successfully' };
  }

  async adminCreateUser(operatorUser: UserJwtPayload, dto: CreateUserAdminDto) {
    this.verifyHierarchyAuthority(operatorUser.role, dto.role, 'create');

    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
    });

    const savedUser = await this.userRepository.save(user);
    return this.sanitizeUser(savedUser);
  }

  async adminLogoutUser(operatorUser: UserJwtPayload, targetUserId: string) {
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    this.verifyHierarchyAuthority(operatorUser.role, targetUser.role, 'logout from remote');
    await this.logoutAll(targetUserId);

    return { message: `Successfully logged out user ${targetUser.email} from all devices` };
  }

  async adminUpdateUserStatus(
    operatorUser: UserJwtPayload,
    targetUserId: string,
    dto: UpdateStatusDto,
  ) {
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    this.verifyHierarchyAuthority(operatorUser.role, targetUser.role, 'modify status of');

    targetUser.isActive = dto.isActive;
    const updatedUser = await this.userRepository.save(targetUser);

    if (!dto.isActive) {
      await this.logoutAll(targetUserId);
    }

    return this.sanitizeUser(updatedUser);
  }

  async adminDeleteUser(operatorUser: UserJwtPayload, targetUserId: string) {
    const targetUser = await this.userRepository.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    if (operatorUser.sub === targetUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    this.verifyHierarchyAuthority(operatorUser.role, targetUser.role, 'delete');

    await this.logoutAll(targetUserId);
    await this.userRepository.remove(targetUser);

    return { message: `User ${targetUser.email} has been permanently deleted` };
  }

  async adminGetAllUsers() {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => this.sanitizeUser(u));
  }

  private verifyHierarchyAuthority(
    operatorRole: UserRole,
    targetRole: UserRole,
    actionName: string,
  ) {
    const operatorLevel = ROLE_LEVELS[operatorRole] ?? 0;
    const targetLevel = ROLE_LEVELS[targetRole] ?? 0;

    if (operatorRole === UserRole.OPERATOR && targetRole !== UserRole.CUSTOMER) {
      throw new ForbiddenException(
        `OPERATOR role is not authorized to ${actionName} account with role "${targetRole}". Only SYSTEM_ADMIN can perform this action.`,
      );
    }

    if (operatorLevel <= targetLevel && operatorRole !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(
        `Insufficient privileges: You cannot ${actionName} an account with equal or higher role level (${targetRole}).`,
      );
    }
  }

  private async generateTokens(user: User) {
    const payload: UserJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshTokenStr = this.jwtService.sign(
      { sub: user.id, jti: `${user.id}-${Date.now()}-${Math.random()}` },
      { expiresIn: '7d' },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: refreshTokenStr,
      userId: user.id,
      expiresAt,
      isRevoked: false,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken: refreshTokenStr,
    };
  }

  async findUserByIdOrEmail(identifier: string) {
    let user = await this.userRepository.findOne({
      where: { id: identifier },
      relations: ['addresses'],
    });
    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: identifier },
        relations: ['addresses'],
      });
    }
    return user;
  }

  async getUserProfile(userIdOrEmail: string) {
    const user = await this.findUserByIdOrEmail(userIdOrEmail);
    if (!user) {
      throw new NotFoundException(`User "${userIdOrEmail}" not found`);
    }
    return this.sanitizeUser(user);
  }

  async getAddresses(userIdOrEmail: string) {
    const user = await this.findUserByIdOrEmail(userIdOrEmail);
    if (!user) {
      throw new NotFoundException(`User "${userIdOrEmail}" not found`);
    }
    return this.addressRepository.find({
      where: { userId: user.id },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async createAddress(userIdOrEmail: string, dto: CreateAddressDto) {
    const user = await this.findUserByIdOrEmail(userIdOrEmail);
    if (!user) {
      throw new NotFoundException(`User "${userIdOrEmail}" not found`);
    }

    const existingCount = await this.addressRepository.count({ where: { userId: user.id } });
    const isFirstAddress = existingCount === 0;
    const shouldBeDefault = dto.isDefault ?? isFirstAddress;

    if (shouldBeDefault && !isFirstAddress) {
      await this.addressRepository.update({ userId: user.id }, { isDefault: false });
    }

    const address = this.addressRepository.create({
      ...dto,
      userId: user.id,
      isDefault: shouldBeDefault,
    });

    return this.addressRepository.save(address);
  }

  async updateAddress(userIdOrEmail: string, addressId: string, dto: UpdateAddressDto) {
    const user = await this.findUserByIdOrEmail(userIdOrEmail);
    if (!user) {
      throw new NotFoundException(`User "${userIdOrEmail}" not found`);
    }

    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId: user.id },
    });

    if (!address) {
      throw new NotFoundException(`Address "${addressId}" not found for this user`);
    }

    if (dto.isDefault) {
      await this.addressRepository.update({ userId: user.id }, { isDefault: false });
    }

    Object.assign(address, dto);
    return this.addressRepository.save(address);
  }

  async deleteAddress(userIdOrEmail: string, addressId: string) {
    const user = await this.findUserByIdOrEmail(userIdOrEmail);
    if (!user) {
      throw new NotFoundException(`User "${userIdOrEmail}" not found`);
    }

    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId: user.id },
    });

    if (!address) {
      throw new NotFoundException(`Address "${addressId}" not found`);
    }

    const wasDefault = address.isDefault;
    await this.addressRepository.remove(address);

    if (wasDefault) {
      const remaining = await this.addressRepository.findOne({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
      if (remaining) {
        remaining.isDefault = true;
        await this.addressRepository.save(remaining);
      }
    }

    return { message: 'Address deleted successfully' };
  }

  async setDefaultAddress(userIdOrEmail: string, addressId: string) {
    const user = await this.findUserByIdOrEmail(userIdOrEmail);
    if (!user) {
      throw new NotFoundException(`User "${userIdOrEmail}" not found`);
    }

    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId: user.id },
    });

    if (!address) {
      throw new NotFoundException(`Address "${addressId}" not found`);
    }

    await this.addressRepository.update({ userId: user.id }, { isDefault: false });
    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
