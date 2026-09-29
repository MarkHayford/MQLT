import { type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
    list(user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<{
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
    create(user: CurrentUserPayload, body: Record<string, unknown>): Promise<{
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
    update(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    remove(user: CurrentUserPayload, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
