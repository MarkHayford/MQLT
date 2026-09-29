import type { Response } from 'express';
import { type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    profile(user: CurrentUserPayload): Promise<Omit<{
        id: string;
        updatedAt: Date;
        points: number;
        phone: string | null;
        openId: string | null;
        studyNo: string;
        nickname: string;
        avatarUrl: string | null;
        avatarTheme: number;
        gender: string | null;
        region: string | null;
        school: string | null;
        realName: string | null;
        realNameIdCard: string | null;
        realNameVerified: boolean;
        realNameVerifiedAt: Date | null;
    }, "avatarUrl" | "realNameIdCard"> & {
        avatarUrl: string | null;
        realNameIdCardMasked: string;
    }>;
    updateProfile(user: CurrentUserPayload, body: Record<string, unknown>): Promise<Omit<{
        id: string;
        updatedAt: Date;
        points: number;
        phone: string | null;
        openId: string | null;
        studyNo: string;
        nickname: string;
        avatarUrl: string | null;
        avatarTheme: number;
        gender: string | null;
        region: string | null;
        school: string | null;
        realName: string | null;
        realNameIdCard: string | null;
        realNameVerified: boolean;
        realNameVerifiedAt: Date | null;
    }, "avatarUrl" | "realNameIdCard"> & {
        avatarUrl: string | null;
        realNameIdCardMasked: string;
    }>;
    changePassword(user: CurrentUserPayload, body: Record<string, unknown>): Promise<{
        success: boolean;
    }>;
    saveRealName(user: CurrentUserPayload, body: Record<string, unknown>): Promise<Omit<{
        id: string;
        updatedAt: Date;
        points: number;
        phone: string | null;
        openId: string | null;
        studyNo: string;
        nickname: string;
        avatarUrl: string | null;
        avatarTheme: number;
        gender: string | null;
        region: string | null;
        school: string | null;
        realName: string | null;
        realNameIdCard: string | null;
        realNameVerified: boolean;
        realNameVerifiedAt: Date | null;
    }, "avatarUrl" | "realNameIdCard"> & {
        avatarUrl: string | null;
        realNameIdCardMasked: string;
    }>;
    uploadAvatar(user: CurrentUserPayload, file: any): Promise<{
        avatarUrl: string | null;
    }>;
    avatar(filename: string, res: Response): any;
    points(user: CurrentUserPayload): Promise<{
        balance: number;
        records: {
            id: string;
            title: string;
            createdAt: Date;
            userId: string;
            amount: number;
            sourceType: string | null;
            sourceId: string | null;
        }[];
    }>;
}
