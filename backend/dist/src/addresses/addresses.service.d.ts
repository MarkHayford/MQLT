import { PrismaService } from '../prisma/prisma.service';
export declare class AddressesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        userId: string;
        receiver: string;
        province: string;
        city: string;
        district: string;
        detail: string;
        isDefault: boolean;
    }[]>;
    create(userId: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        userId: string;
        receiver: string;
        province: string;
        city: string;
        district: string;
        detail: string;
        isDefault: boolean;
    }>;
    update(userId: string, id: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string;
        userId: string;
        receiver: string;
        province: string;
        city: string;
        district: string;
        detail: string;
        isDefault: boolean;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    private mapAddressCreate;
    private mapAddressUpdate;
}
