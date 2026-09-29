import { ConfigService } from '@nestjs/config';
import { StudyNoService } from '../common/study-no.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AdminService {
    private readonly prisma;
    private readonly config;
    private readonly studyNo;
    constructor(prisma: PrismaService, config: ConfigService, studyNo: StudyNoService);
    overview(): Promise<{
        metrics: {
            users: number;
            products: number;
            studyProjects: number;
            orders: number;
            bookings: number;
            feedback: number;
            revenue: string;
        };
        recentOrders: {
            id: any;
            orderNo: any;
            status: any;
            goodsAmount: any;
            amount: any;
            points: any;
            pointsUsed: any;
            pointsDiscount: any;
            address: {
                id: any;
                receiver: any;
                phone: any;
                province: any;
                city: any;
                district: any;
                detail: any;
            };
            remark: any;
            adminRemark: any;
            shippingCompany: any;
            trackingNo: any;
            shippedAt: any;
            paidAt: any;
            completedAt: any;
            cancelledAt: any;
            pointsRefundedAt: any;
            userDeletedAt: any;
            createdAt: any;
            updatedAt: any;
            user: {
                id: any;
                nickname: any;
                phone: any;
                studyNo: any;
            };
            items: any;
        }[];
        recentFeedback: {
            id: any;
            type: any;
            content: any;
            tags: any;
            contactPhone: any;
            contactEmail: any;
            status: any;
            reply: any;
            createdAt: any;
            updatedAt: any;
            user: {
                id: any;
                nickname: any;
                phone: any;
                studyNo: any;
            } | null;
        }[];
    }>;
    studyProjectCheckInCode(id: string): Promise<{
        project: {
            id: string;
            title: string;
            status: string;
            location: string | null;
        };
        payload: import("../study/study-check-in-code").StudyProjectCheckInPayload;
        raw: string;
        qrImageUrl: string;
    }>;
    users(keyword?: string): Promise<(Omit<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        points: number;
        _count: {
            bookings: number;
            cartItems: number;
            favorites: number;
            travelers: number;
            addresses: number;
            invoiceTitles: number;
            orders: number;
            feedbacks: number;
            pointRecords: number;
        };
        phone: string | null;
        openId: string | null;
        studyNo: string;
        passwordPlain: string | null;
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
        isAdmin: boolean;
        adminRole: string;
        adminPermissions: string[];
    }, "passwordPlain"> & {
        password: string;
        passwordPlain: string;
    })[]>;
    userDetail(id: string): Promise<{
        id: string;
        phone: string | null;
        openId: string | null;
        password: string;
        passwordPlain: string;
        nickname: string;
        avatarUrl: string | null;
        avatarTheme: number;
        gender: string | null;
        region: string | null;
        school: string | null;
        studyNo: string;
        points: number;
        realName: string | null;
        realNameIdCard: string | null;
        realNameVerified: boolean;
        realNameVerifiedAt: Date | null;
        status: import(".prisma/client").$Enums.UserStatus;
        isAdmin: boolean;
        adminRole: string;
        adminPermissions: string[];
        createdAt: Date;
        updatedAt: Date;
        isEmptyAccount: boolean;
        visiblePuzzleProjects: {
            id: string;
            title: string;
            projectStatus: string;
            gridCols: number;
            gridRows: number;
            piecesCount: number;
        }[];
        bookings: {
            project: {
                price: string;
                location: string | null;
                openDate: string | null;
                id: any;
                title: any;
                status: any;
            };
            id: any;
            bookingGroupId: any;
            bookerId: any;
            participantName: any;
            participantPhone: any;
            participantIdCard: any;
            participantRole: any;
            participantIndex: any;
            isBooker: boolean;
            participantCount: number;
            status: any;
            unlocksPuzzle: boolean;
            amount: any;
            groupAmount: string;
            paidAt: any;
            cancelledAt: any;
            completedAt: any;
            userDeletedAt: any;
            createdAt: any;
            updatedAt: any;
            user: {
                id: any;
                nickname: any;
                phone: any;
                studyNo: any;
            };
        }[];
        orders: {
            id: any;
            orderNo: any;
            status: any;
            goodsAmount: any;
            amount: any;
            points: any;
            pointsUsed: any;
            pointsDiscount: any;
            address: {
                id: any;
                receiver: any;
                phone: any;
                province: any;
                city: any;
                district: any;
                detail: any;
            };
            remark: any;
            adminRemark: any;
            shippingCompany: any;
            trackingNo: any;
            shippedAt: any;
            paidAt: any;
            completedAt: any;
            cancelledAt: any;
            pointsRefundedAt: any;
            userDeletedAt: any;
            createdAt: any;
            updatedAt: any;
            user: {
                id: any;
                nickname: any;
                phone: any;
                studyNo: any;
            };
            items: any;
        }[];
        cartItems: {
            id: string;
            quantity: number;
            selected: boolean;
            createdAt: Date;
            updatedAt: Date;
            product: any;
        }[];
        favorites: {
            id: string;
            createdAt: Date;
            product: any;
        }[];
        travelers: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            phone: string;
            idCard: string;
            userId: string;
            isSelf: boolean;
        }[];
        addresses: {
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
        }[];
        invoiceTitles: {
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
        }[];
        pointRecords: {
            id: string;
            title: string;
            createdAt: Date;
            userId: string;
            amount: number;
            sourceType: string | null;
            sourceId: string | null;
        }[];
        feedbacks: {
            id: any;
            type: any;
            content: any;
            tags: any;
            contactPhone: any;
            contactEmail: any;
            status: any;
            reply: any;
            createdAt: any;
            updatedAt: any;
            user: {
                id: any;
                nickname: any;
                phone: any;
                studyNo: any;
            } | null;
        }[];
    }>;
    createUser(body: Record<string, unknown>, canManageAccess?: boolean): Promise<Omit<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        points: number;
        phone: string | null;
        studyNo: string;
        passwordPlain: string | null;
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
        isAdmin: boolean;
        adminRole: string;
        adminPermissions: string[];
    }, "passwordPlain"> & {
        password: string;
        passwordPlain: string;
    }>;
    updateUser(id: string, body: Record<string, unknown>, canManageAccess?: boolean): Promise<Omit<{
        id: string;
        status: import(".prisma/client").$Enums.UserStatus;
        createdAt: Date;
        updatedAt: Date;
        points: number;
        phone: string | null;
        studyNo: string;
        passwordPlain: string | null;
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
        isAdmin: boolean;
        adminRole: string;
        adminPermissions: string[];
    }, "passwordPlain"> & {
        password: string;
        passwordPlain: string;
    }>;
    uploadUserAvatar(userId: string, file?: any): Promise<{
        avatarUrl: string;
        user: {
            id: string;
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
            updatedAt: Date;
            points: number;
            phone: string | null;
            studyNo: string;
            nickname: string;
            avatarUrl: string | null;
            avatarTheme: number;
            gender: string | null;
            region: string | null;
            school: string | null;
        };
    }>;
    grantUserPoints(userId: string, body: Record<string, unknown>): Promise<{
        user: {
            id: string;
            status: import(".prisma/client").$Enums.UserStatus;
            updatedAt: Date;
            points: number;
            phone: string | null;
            studyNo: string;
            nickname: string;
        };
        record: {
            id: string;
            title: string;
            createdAt: Date;
            userId: string;
            amount: number;
            sourceType: string | null;
            sourceId: string | null;
        };
    }>;
    deductUserPoints(userId: string, body: Record<string, unknown>): Promise<{
        user: {
            id: string;
            status: import(".prisma/client").$Enums.UserStatus;
            updatedAt: Date;
            points: number;
            phone: string | null;
            studyNo: string;
            nickname: string;
        } | null;
        record: {
            id: string;
            title: string;
            createdAt: Date;
            userId: string;
            amount: number;
            sourceType: string | null;
            sourceId: string | null;
        };
    }>;
    deletePointRecord(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    deleteUser(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    private mapNullableString;
    private hasAdminAccessFields;
    private normalizeAdminRealNameInput;
    private mapNullableRealName;
    private mapNullableIdCard;
    private withAdminPassword;
    private mapAvatarTheme;
    private avatarDir;
    private avatarPublicPath;
    private cleanupUserAvatarFiles;
    private isUserAvatarFilename;
    private publicApiPrefix;
    private avatarExtension;
    private isSupportedAvatarImage;
    private isJpeg;
    private isPng;
    private isWebp;
    studyProjects(): Promise<{
        price: string;
        liveStage: string;
        liveStageText: string;
        departure: {
            mode: string;
            modeText: string;
            departurePoint: {
                title: any;
                latitude: number | null;
                longitude: number | null;
            };
            dropoffPoint: {
                title: any;
                latitude: number | null;
                longitude: number | null;
            };
            vehicle: {
                plateNo: any;
                driverName: any;
                driverPhone: any;
            };
        };
        organizers: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        }[];
        organizerCount: number;
        admins: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        }[];
        adminCount: number;
        bookingCount: number;
        noticeCount: number;
        routePointCount: number;
        _count: {
            notices: number;
            routePoints: number;
            bookings: number;
        };
        id: string;
        title: string;
        subtitle: string;
        category: string;
        status: string;
        liveStartedAt: Date | null;
        departureStartedAt: Date | null;
        studyStartedAt: Date | null;
        liveEndedAt: Date | null;
        currentRoutePointId: string | null;
        enrolled: number;
        maxCapacity: number;
        tags: string[];
        gradientStart: string;
        gradientEnd: string;
        mediaColors: string[];
        location: string | null;
        documents: import("@prisma/client/runtime/library").JsonValue;
        contactPhone: string | null;
        contactServiceTime: string | null;
        contactWechat: string | null;
        openDate: string | null;
        startTime: Date | null;
        endTime: Date | null;
        departureMode: string;
        departureTitle: string | null;
        departureLatitude: import("@prisma/client/runtime/library").Decimal | null;
        departureLongitude: import("@prisma/client/runtime/library").Decimal | null;
        dropoffTitle: string | null;
        dropoffLatitude: import("@prisma/client/runtime/library").Decimal | null;
        dropoffLongitude: import("@prisma/client/runtime/library").Decimal | null;
        vehiclePlateNo: string | null;
        driverName: string | null;
        driverPhone: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    updateStudyProject(id: string, body: Record<string, unknown>): import(".prisma/client").Prisma.Prisma__StudyProjectClient<{
        id: string;
        title: string;
        subtitle: string;
        category: string;
        price: import("@prisma/client/runtime/library").Decimal;
        status: string;
        liveStage: string;
        liveStartedAt: Date | null;
        departureStartedAt: Date | null;
        studyStartedAt: Date | null;
        liveEndedAt: Date | null;
        currentRoutePointId: string | null;
        enrolled: number;
        maxCapacity: number;
        tags: string[];
        gradientStart: string;
        gradientEnd: string;
        mediaColors: string[];
        location: string | null;
        documents: import("@prisma/client/runtime/library").JsonValue;
        contactPhone: string | null;
        contactServiceTime: string | null;
        contactWechat: string | null;
        openDate: string | null;
        startTime: Date | null;
        endTime: Date | null;
        departureMode: string;
        departureTitle: string | null;
        departureLatitude: import("@prisma/client/runtime/library").Decimal | null;
        departureLongitude: import("@prisma/client/runtime/library").Decimal | null;
        dropoffTitle: string | null;
        dropoffLatitude: import("@prisma/client/runtime/library").Decimal | null;
        dropoffLongitude: import("@prisma/client/runtime/library").Decimal | null;
        vehiclePlateNo: string | null;
        driverName: string | null;
        driverPhone: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    deleteStudyProject(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    private ensureStudyProject;
    studyProjectBookings(projectId: string): Promise<{
        id: any;
        bookingGroupId: any;
        bookerId: any;
        participantName: any;
        participantPhone: any;
        participantIdCard: any;
        participantRole: any;
        participantIndex: any;
        isBooker: boolean;
        participantCount: number;
        status: any;
        unlocksPuzzle: boolean;
        amount: any;
        groupAmount: string;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        userDeletedAt: any;
        createdAt: any;
        updatedAt: any;
        user: {
            id: any;
            nickname: any;
            phone: any;
            studyNo: any;
        };
        project: {
            id: any;
            title: any;
            status: any;
        };
    }[]>;
    studyProjectRoutePoints(projectId: string): Promise<{
        id: any;
        projectId: any;
        title: any;
        description: any;
        latitude: number;
        longitude: number;
        checkRadius: any;
        checkInMode: string;
        sortOrder: any;
        enabled: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    studyProjectDepartureSettings(projectId: string): Promise<{
        mode: string;
        modeText: string;
        departurePoint: {
            title: any;
            latitude: number | null;
            longitude: number | null;
        };
        dropoffPoint: {
            title: any;
            latitude: number | null;
            longitude: number | null;
        };
        vehicle: {
            plateNo: any;
            driverName: any;
            driverPhone: any;
        };
    }>;
    updateStudyProjectDepartureSettings(projectId: string, body: Record<string, unknown>): Promise<{
        mode: string;
        modeText: string;
        departurePoint: {
            title: any;
            latitude: number | null;
            longitude: number | null;
        };
        dropoffPoint: {
            title: any;
            latitude: number | null;
            longitude: number | null;
        };
        vehicle: {
            plateNo: any;
            driverName: any;
            driverPhone: any;
        };
    }>;
    studyProjectRoutePointCheckInCode(projectId: string, pointId: string): Promise<{
        project: {
            id: string;
            title: string;
            location: string | null;
            status: string;
        };
        routePoint: {
            id: any;
            projectId: any;
            title: any;
            description: any;
            latitude: number;
            longitude: number;
            checkRadius: any;
            checkInMode: string;
            sortOrder: any;
            enabled: any;
            createdAt: any;
            updatedAt: any;
        };
        payload: import("../study/study-check-in-code").StudyRoutePointCheckInPayload;
        raw: string;
        qrImageUrl: string;
    }>;
    createStudyProjectRoutePoint(projectId: string, body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        title: any;
        description: any;
        latitude: number;
        longitude: number;
        checkRadius: any;
        checkInMode: string;
        sortOrder: any;
        enabled: any;
        createdAt: any;
        updatedAt: any;
    }>;
    updateStudyProjectRoutePoint(projectId: string, pointId: string, body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        title: any;
        description: any;
        latitude: number;
        longitude: number;
        checkRadius: any;
        checkInMode: string;
        sortOrder: any;
        enabled: any;
        createdAt: any;
        updatedAt: any;
    }>;
    deleteStudyProjectRoutePoint(projectId: string, pointId: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    studyProjectOrganizers(projectId: string): Promise<{
        id: string;
        projectId: string;
        userId: string;
        createdAt: Date;
        user: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        };
    }[]>;
    addStudyProjectOrganizer(projectId: string, body: Record<string, unknown>): Promise<{
        id: string;
        projectId: string;
        userId: string;
        createdAt: Date;
        user: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        };
    }[]>;
    removeStudyProjectOrganizer(projectId: string, userId: string): Promise<{
        id: string;
        projectId: string;
        userId: string;
        createdAt: Date;
        user: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        };
    }[]>;
    studyProjectAdmins(projectId: string): Promise<{
        id: string;
        projectId: string;
        userId: string;
        createdAt: Date;
        user: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        };
    }[]>;
    addStudyProjectAdmin(projectId: string, body: Record<string, unknown>): Promise<{
        id: string;
        projectId: string;
        userId: string;
        createdAt: Date;
        user: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        };
    }[]>;
    removeStudyProjectAdmin(projectId: string, userId: string): Promise<{
        id: string;
        projectId: string;
        userId: string;
        createdAt: Date;
        user: {
            id: string;
            phone: string | null;
            studyNo: string;
            nickname: string;
        };
    }[]>;
    addStudyProjectUser(projectId: string, body: Record<string, unknown>): Promise<{
        id: any;
        bookingGroupId: any;
        bookerId: any;
        participantName: any;
        participantPhone: any;
        participantIdCard: any;
        participantRole: any;
        participantIndex: any;
        isBooker: boolean;
        participantCount: number;
        status: any;
        unlocksPuzzle: boolean;
        amount: any;
        groupAmount: string;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        userDeletedAt: any;
        createdAt: any;
        updatedAt: any;
        user: {
            id: any;
            nickname: any;
            phone: any;
            studyNo: any;
        };
        project: {
            id: any;
            title: any;
            status: any;
        };
    }>;
    addUserStudyProject(userId: string, body: Record<string, unknown>): Promise<{
        id: any;
        bookingGroupId: any;
        bookerId: any;
        participantName: any;
        participantPhone: any;
        participantIdCard: any;
        participantRole: any;
        participantIndex: any;
        isBooker: boolean;
        participantCount: number;
        status: any;
        unlocksPuzzle: boolean;
        amount: any;
        groupAmount: string;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        userDeletedAt: any;
        createdAt: any;
        updatedAt: any;
        user: {
            id: any;
            nickname: any;
            phone: any;
            studyNo: any;
        };
        project: {
            id: any;
            title: any;
            status: any;
        };
    }>;
    private createOrRestoreStudyBooking;
    notices(): Promise<{
        id: any;
        projectId: any;
        title: any;
        content: any;
        type: any;
        publisher: any;
        paragraphs: any;
        publishedAt: any;
        project: {
            id: any;
            title: any;
            status: any;
        } | null;
        projectTitle: any;
    }[]>;
    createNotice(body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        title: any;
        content: any;
        type: any;
        publisher: any;
        paragraphs: any;
        publishedAt: any;
        project: {
            id: any;
            title: any;
            status: any;
        } | null;
        projectTitle: any;
    }>;
    updateNotice(id: string, body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        title: any;
        content: any;
        type: any;
        publisher: any;
        paragraphs: any;
        publishedAt: any;
        project: {
            id: any;
            title: any;
            status: any;
        } | null;
        projectTitle: any;
    }>;
    deleteNotice(id: string): Promise<{
        id: string;
    }>;
    floatingNotices(): Promise<{
        id: any;
        projectId: any;
        title: any;
        subtitle: any;
        showSubtitle: any;
        tag: any;
        content: any;
        imageUrl: any;
        actionText: any;
        actionType: any;
        actionTarget: any;
        gradientStart: any;
        gradientEnd: any;
        titleFontSize: any;
        titleColor: any;
        contentFontSize: any;
        contentColor: any;
        sortOrder: any;
        enabled: any;
        createdAt: any;
        updatedAt: any;
        project: {
            id: any;
            title: any;
            status: any;
            gradientStart: any;
            gradientEnd: any;
        } | null;
        projectTitle: any;
    }[]>;
    createFloatingNotice(body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        title: any;
        subtitle: any;
        showSubtitle: any;
        tag: any;
        content: any;
        imageUrl: any;
        actionText: any;
        actionType: any;
        actionTarget: any;
        gradientStart: any;
        gradientEnd: any;
        titleFontSize: any;
        titleColor: any;
        contentFontSize: any;
        contentColor: any;
        sortOrder: any;
        enabled: any;
        createdAt: any;
        updatedAt: any;
        project: {
            id: any;
            title: any;
            status: any;
            gradientStart: any;
            gradientEnd: any;
        } | null;
        projectTitle: any;
    }>;
    updateFloatingNotice(id: string, body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        title: any;
        subtitle: any;
        showSubtitle: any;
        tag: any;
        content: any;
        imageUrl: any;
        actionText: any;
        actionType: any;
        actionTarget: any;
        gradientStart: any;
        gradientEnd: any;
        titleFontSize: any;
        titleColor: any;
        contentFontSize: any;
        contentColor: any;
        sortOrder: any;
        enabled: any;
        createdAt: any;
        updatedAt: any;
        project: {
            id: any;
            title: any;
            status: any;
            gradientStart: any;
            gradientEnd: any;
        } | null;
        projectTitle: any;
    }>;
    deleteFloatingNotice(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    bookings(status?: string): Promise<{
        id: any;
        bookingGroupId: any;
        bookerId: any;
        participantName: any;
        participantPhone: any;
        participantIdCard: any;
        participantRole: any;
        participantIndex: any;
        isBooker: boolean;
        participantCount: number;
        status: any;
        unlocksPuzzle: boolean;
        amount: any;
        groupAmount: string;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        userDeletedAt: any;
        createdAt: any;
        updatedAt: any;
        user: {
            id: any;
            nickname: any;
            phone: any;
            studyNo: any;
        };
        project: {
            id: any;
            title: any;
            status: any;
        };
    }[]>;
    updateBooking(id: string, body: Record<string, unknown>): Promise<{
        id: any;
        bookingGroupId: any;
        bookerId: any;
        participantName: any;
        participantPhone: any;
        participantIdCard: any;
        participantRole: any;
        participantIndex: any;
        isBooker: boolean;
        participantCount: number;
        status: any;
        unlocksPuzzle: boolean;
        amount: any;
        groupAmount: string;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        userDeletedAt: any;
        createdAt: any;
        updatedAt: any;
        user: {
            id: any;
            nickname: any;
            phone: any;
            studyNo: any;
        };
        project: {
            id: any;
            title: any;
            status: any;
        };
    }>;
    deleteBooking(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    private getBookingGroupsForAdmin;
    private serializeBooking;
    private resolveBookingGroupAmount;
    feedback(status?: string): Promise<{
        id: any;
        type: any;
        content: any;
        tags: any;
        contactPhone: any;
        contactEmail: any;
        status: any;
        reply: any;
        createdAt: any;
        updatedAt: any;
        user: {
            id: any;
            nickname: any;
            phone: any;
            studyNo: any;
        } | null;
    }[]>;
    updateFeedback(id: string, body: Record<string, unknown>): Promise<{
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
    }>;
    private serializeProduct;
    private serializeOrder;
    private serializeNotice;
    private serializeFloatingNotice;
    private serializeRoutePoint;
    private serializeDepartureSettings;
    private resolveProjectLiveStage;
    private liveStageText;
    private normalizeStudyProjectDocumentSections;
    private normalizeStudyProjectDocuments;
    private parseStudyProjectDocumentLines;
    private serializeFeedback;
    private mapBoolean;
    private mapRoutePointCreateData;
    private mapRoutePointUpdateData;
    private mapRoutePointCheckInMode;
    private mapDepartureMode;
    private mapStudyLiveStage;
    private mapNullableLatitude;
    private mapNullableLongitude;
    private mapDepartureSettingsData;
    private mapLatitude;
    private mapLongitude;
    private mapCheckRadius;
    private mapSortOrder;
    private mapNullableText;
    private mapNullableFontSize;
    private mapFloatingNoticeActionType;
    private mapStudyProjectStatus;
    private mapBookingStatus;
    private isActiveStudyBookingStatus;
    private isSeatStudyBooking;
    private countSeatStudyBookings;
    private shouldMarkStudyBookingPaid;
    private resolveStudyBookingPaidAt;
    private incrementStudyProjectEnrollment;
}
