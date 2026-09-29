import { type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { FeedbackService } from './feedback.service';
export declare class FeedbackController {
    private readonly feedbackService;
    constructor(feedbackService: FeedbackService);
    submit(user: CurrentUserPayload, body: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__FeedbackClient<{
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
    list(user: CurrentUserPayload): import(".prisma/client").Prisma.PrismaPromise<{
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
    withdraw(user: CurrentUserPayload, id: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
