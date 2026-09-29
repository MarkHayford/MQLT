import { PrismaService } from '../prisma/prisma.service';
export declare class TravelersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string;
        idCard: string;
        userId: string;
        isSelf: boolean;
    }[]>;
    create(userId: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string;
        idCard: string;
        userId: string;
        isSelf: boolean;
    }>;
    update(userId: string, id: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        phone: string;
        idCard: string;
        userId: string;
        isSelf: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    private syncSelfTraveler;
    private mapTravelerUpdate;
}
