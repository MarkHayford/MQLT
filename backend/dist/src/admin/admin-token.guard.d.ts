import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
export declare class AdminTokenGuard implements CanActivate {
    private readonly config;
    private readonly jwtService;
    private readonly prisma;
    private readonly reflector;
    constructor(config: ConfigService, jwtService: JwtService, prisma: PrismaService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
