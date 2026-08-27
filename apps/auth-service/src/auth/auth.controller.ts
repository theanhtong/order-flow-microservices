import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, CreateUserAdminDto, UpdateStatusDto } from './dto';
import { UserRole, UserJwtPayload } from '@orderflow-microservices/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    return await this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful with accessToken & refreshToken' })
  async login(@Body() dto: LoginDto) {
    return await this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New access token generated' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout current device' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto) {
    return await this.authService.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'User ID passed from Gateway' })
  async logoutAll(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.logoutAll(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'User ID passed from Gateway' })
  async getProfile(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.getUserProfile(userId);
  }

  @Post('admin/users')
  @ApiOperation({ summary: 'Admin create user with specified role' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-role', required: true })
  async adminCreateUser(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: UserRole,
    @Body() dto: CreateUserAdminDto,
  ) {
    this.verifyAdminPermission(userRole);
    const operator: UserJwtPayload = { sub: userId, email: '', role: userRole };
    return await this.authService.adminCreateUser(operator, dto);
  }

  @Get('admin/users')
  @ApiOperation({ summary: 'Get list of all users in the system' })
  @ApiHeader({ name: 'x-user-role', required: true })
  async adminGetAllUsers(@Headers('x-user-role') userRole: UserRole) {
    this.verifyAdminPermission(userRole);
    return await this.authService.adminGetAllUsers();
  }

  @Post('admin/users/:userId/logout')
  @ApiOperation({ summary: 'Remote logout a user from all devices' })
  @ApiParam({ name: 'userId', description: 'Target User UUID' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-role', required: true })
  async adminLogoutUser(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: UserRole,
    @Param('userId') targetUserId: string,
  ) {
    this.verifyAdminPermission(userRole);
    const operator: UserJwtPayload = { sub: userId, email: '', role: userRole };
    return await this.authService.adminLogoutUser(operator, targetUserId);
  }

  @Patch('admin/users/:userId/status')
  @ApiOperation({ summary: 'Lock or unlock a user account' })
  @ApiParam({ name: 'userId', description: 'Target User UUID' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-role', required: true })
  async adminUpdateUserStatus(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: UserRole,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    this.verifyAdminPermission(userRole);
    const operator: UserJwtPayload = { sub: userId, email: '', role: userRole };
    return await this.authService.adminUpdateUserStatus(operator, targetUserId, dto);
  }

  @Delete('admin/users/:userId')
  @ApiOperation({ summary: 'Permanently delete a user account' })
  @ApiParam({ name: 'userId', description: 'Target User UUID' })
  @ApiHeader({ name: 'x-user-id', required: true })
  @ApiHeader({ name: 'x-user-role', required: true })
  async adminDeleteUser(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: UserRole,
    @Param('userId') targetUserId: string,
  ) {
    this.verifyAdminPermission(userRole);
    const operator: UserJwtPayload = { sub: userId, email: '', role: userRole };
    return await this.authService.adminDeleteUser(operator, targetUserId);
  }

  private verifyAdminPermission(role: UserRole) {
    if (role !== UserRole.OPERATOR && role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Access denied: Admin privileges required');
    }
  }
}
