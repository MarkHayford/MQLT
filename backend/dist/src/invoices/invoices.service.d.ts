import { PrismaService } from '../prisma/prisma.service';
export declare class InvoicesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        phone: string | null;
        userId: string;
        isDefault: boolean;
        taxNo: string | null;
        email: string;
    }[]>;
    create(userId: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        phone: string | null;
        userId: string;
        isDefault: boolean;
        taxNo: string | null;
        email: string;
    }>;
    update(userId: string, id: string, body: Record<string, unknown>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        phone: string | null;
        userId: string;
        isDefault: boolean;
        taxNo: string | null;
        email: string;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    private mapInvoiceTitleCreate;
    private mapInvoiceTitleUpdate;
}
