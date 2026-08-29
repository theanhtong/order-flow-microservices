import { Response, Request } from 'express';
import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Res,
  Req,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, CreateUserAdminDto, UpdateStatusDto, CreateAddressDto, UpdateAddressDto } from './dto';
import { UserRole, UserJwtPayload } from '@orderflow-microservices/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: false, // process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    if (result.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful with accessToken & refreshToken' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    if (result.refreshToken) {
      this.setRefreshTokenCookie(res, result.refreshToken);
    }
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie or body' })
  @ApiResponse({ status: 200, description: 'New access token generated' })
  async refresh(
    @Req() req: Request,
    @Body() dto: Partial<RefreshTokenDto>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenStr = req.cookies?.refreshToken || dto?.refreshToken;
    if (!refreshTokenStr) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const newTokens = await this.authService.refreshTokens(refreshTokenStr);
    if (newTokens.refreshToken) {
      this.setRefreshTokenCookie(res, newTokens.refreshToken);
    }
    return newTokens;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout current device' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Body() dto: Partial<RefreshTokenDto>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenStr = req.cookies?.refreshToken || dto?.refreshToken;
    res.clearCookie('refreshToken', { path: '/' });
    return await this.authService.logout(refreshTokenStr);
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
  async getProfile(
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-user-email') userEmailHeader?: string,
  ) {
    const identifier = userIdHeader || userEmailHeader;
    if (!identifier) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.getUserProfile(identifier);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get user addresses' })
  async getAddresses(
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-user-email') userEmailHeader?: string,
  ) {
    const identifier = userIdHeader || userEmailHeader;
    if (!identifier) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.getAddresses(identifier);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Create new user address' })
  async createAddress(
    @Body() dto: CreateAddressDto,
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-user-email') userEmailHeader?: string,
  ) {
    const identifier = userIdHeader || userEmailHeader;
    if (!identifier) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.createAddress(identifier, dto);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Update user address' })
  async updateAddress(
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-user-email') userEmailHeader?: string,
  ) {
    const identifier = userIdHeader || userEmailHeader;
    if (!identifier) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.updateAddress(identifier, addressId, dto);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete user address' })
  async deleteAddress(
    @Param('id') addressId: string,
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-user-email') userEmailHeader?: string,
  ) {
    const identifier = userIdHeader || userEmailHeader;
    if (!identifier) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.deleteAddress(identifier, addressId);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set address as default' })
  async setDefaultAddress(
    @Param('id') addressId: string,
    @Headers('x-user-id') userIdHeader?: string,
    @Headers('x-user-email') userEmailHeader?: string,
  ) {
    const identifier = userIdHeader || userEmailHeader;
    if (!identifier) {
      throw new UnauthorizedException('Missing user identity');
    }
    return await this.authService.setDefaultAddress(identifier, addressId);
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
