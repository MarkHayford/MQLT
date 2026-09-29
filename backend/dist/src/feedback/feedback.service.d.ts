import { PrismaService } from '../prisma/prisma.service';
export declare class FeedbackService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    submit(userId: string, body: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__FeedbackClient<{
        id: string;
        status: string;
        tags: string[];
        contactPhone: string | null;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        type: string;
        userId: string | null;
        contactEmail: string | null;
        reply: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    list(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        status: string;
        tags: string[];
        contactPhone: string | null;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        type: string;
        userId: string | null;
        contactEmail: string | null;
        reply: string | null;
    }[]>;
    withdraw(userId: string, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
