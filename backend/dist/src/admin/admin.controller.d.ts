import { AdminMallService } from './admin-mall.service';
import { AdminService } from './admin.service';
import { StudyService } from '../study/study.service';
export declare class AdminController {
    private readonly adminService;
    private readonly adminMallService;
    private readonly studyService;
    constructor(adminService: AdminService, adminMallService: AdminMallService, studyService: StudyService);
    accessPolicy(): {
        roles: readonly [{
            readonly value: "NONE";
            readonly label: "普通账号";
            readonly description: "不能进入控制台";
            readonly permissions: readonly [];
        }, {
            readonly value: "SUPER_ADMIN";
            readonly label: "超级管理员";
            readonly description: "拥有全部控制台功能和职位权限管理能力";
            readonly permissions: import("./admin-permissions").AdminPermission[];
        }, {
            readonly value: "OPERATIONS_DIRECTOR";
            readonly label: "运营总监";
            readonly description: "查看全局数据，并管理研学、商城、订单、用户和反馈";
            readonly permissions: readonly ["overview.read", "study.read", "study.manage", "mall.read", "mall.manage", "orders.read", "orders.manage", "users.read", "users.manage", "feedback.read", "feedback.manage"];
        }, {
            readonly value: "STUDY_OPERATOR";
            readonly label: "研学运营";
            readonly description: "管理研学项目、路线、公告和预约视图";
            readonly permissions: readonly ["overview.read", "study.read", "study.manage", "orders.read", "users.read"];
        }, {
            readonly value: "MALL_OPERATOR";
            readonly label: "商城运营";
            readonly description: "管理商城商品、库存和商品资料";
            readonly permissions: readonly ["overview.read", "mall.read", "mall.manage", "orders.read"];
        }, {
            readonly value: "ORDER_OPERATOR";
            readonly label: "订单履约";
            readonly description: "处理商城订单和研学预约履约状态";
            readonly permissions: readonly ["overview.read", "orders.read", "orders.manage", "mall.read", "study.read"];
        }, {
            readonly value: "USER_OPERATOR";
            readonly label: "用户运营";
            readonly description: "管理用户资料、实名信息和积分";
            readonly permissions: readonly ["overview.read", "users.read", "users.manage", "orders.read", "study.read"];
        }, {
            readonly value: "SERVICE_AGENT";
            readonly label: "客服";
            readonly description: "处理用户反馈，并查看必要用户信息";
            readonly permissions: readonly ["overview.read", "feedback.read", "feedback.manage", "users.read", "orders.read"];
        }, {
            readonly value: "OBSERVER";
            readonly label: "只读观察员";
            readonly description: "只能查看经营数据和业务资料，不能修改";
            readonly permissions: readonly ["overview.read", "study.read", "mall.read", "orders.read", "users.read", "feedback.read"];
        }];
        permissions: readonly [{
            readonly value: "overview.read";
            readonly label: "运营总览";
            readonly group: "总览";
        }, {
            readonly value: "study.read";
            readonly label: "查看研学";
            readonly group: "研学";
        }, {
            readonly value: "study.manage";
            readonly label: "管理研学";
            readonly group: "研学";
        }, {
            readonly value: "mall.read";
            readonly label: "查看商城";
            readonly group: "商城";
        }, {
            readonly value: "mall.manage";
            readonly label: "管理商城";
            readonly group: "商城";
        }, {
            readonly value: "orders.read";
            readonly label: "查看订单";
            readonly group: "订单";
        }, {
            readonly value: "orders.manage";
            readonly label: "处理订单";
            readonly group: "订单";
        }, {
            readonly value: "users.read";
            readonly label: "查看用户";
            readonly group: "用户";
        }, {
            readonly value: "users.manage";
            readonly label: "管理用户";
            readonly group: "用户";
        }, {
            readonly value: "feedback.read";
            readonly label: "查看反馈";
            readonly group: "客服";
        }, {
            readonly value: "feedback.manage";
            readonly label: "处理反馈";
            readonly group: "客服";
        }, {
            readonly value: "access.manage";
            readonly label: "职位权限";
            readonly group: "权限";
        }];
    };
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
    createUser(body: Record<string, unknown>, req: any): Promise<Omit<{
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
    updateUser(id: string, body: Record<string, unknown>, req: any): Promise<Omit<{
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
    uploadUserAvatar(id: string, file: any): Promise<{
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
    grantUserPoints(id: string, body: Record<string, unknown>): Promise<{
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
    deductUserPoints(id: string, body: Record<string, unknown>): Promise<{
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
    deleteUser(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    deletePointRecord(id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    products(keyword?: string, category?: string, status?: string): Promise<Record<string, unknown>[]>;
    productCategories(): Promise<string[]>;
    createProduct(body: Record<string, unknown>): Promise<Record<string, unknown>>;
    productDetail(id: string): Promise<Record<string, unknown>>;
    updateProduct(id: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
    adjustProductStock(id: string, body: Record<string, unknown>): Promise<{
        adjustment: {
            delta: number;
            reason: string;
            stockBefore: number;
            stockAfter: number;
        };
    }>;
    deleteProduct(id: string): Promise<{
        id: string;
        deleted: boolean;
        offSale: boolean;
        product: Record<string, unknown>;
    } | {
        id: string;
        deleted: boolean;
        offSale: boolean;
        product?: undefined;
    }>;
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
    studyProjectBookings(id: string): Promise<{
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
    studyProjectRoutePoints(id: string): Promise<{
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
    studyProjectDepartureSettings(id: string): Promise<{
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
    updateStudyProjectDepartureSettings(id: string, body: Record<string, unknown>): Promise<{
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
    studyProjectRoutePointCheckInCode(id: string, pointId: string): Promise<{
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
    createStudyProjectRoutePoint(id: string, body: Record<string, unknown>): Promise<{
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
    updateStudyProjectRoutePoint(id: string, pointId: string, body: Record<string, unknown>): Promise<{
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
    deleteStudyProjectRoutePoint(id: string, pointId: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    studyProjectLiveParticipants(id: string): Promise<{
        projectId: string;
        routePoints: {
            id: number;
            routePointId: any;
            title: any;
            desc: any;
            latitude: number;
            longitude: number;
            checkRadius: any;
            checkInMode: string;
            sortOrder: any;
            autoGrantPrize: any;
            autoPrizeProductId: any;
            autoPrizeQuantity: any;
            autoGrantPoints: any;
            autoPointsAmount: any;
            knowledgeEnabled: any;
            knowledgeVideoTitle: any;
            knowledgeVideoUrl: any;
            knowledgeQuestion: string;
            knowledgeOptions: string[];
            knowledgeQuestions: {
                question: string;
                options: string[];
            }[];
            knowledgeItems: {
                title: string;
                videoTitle: string;
                videoUrl: string;
                questions: {
                    question: string;
                    options: string[];
                }[];
            }[];
            knowledgeGrantPrize: any;
            knowledgePrizeProductId: any;
            knowledgePrizeQuantity: any;
            knowledgeGrantPoints: any;
            knowledgePointsAmount: any;
        }[];
        participants: any[];
    }>;
    studyProjectPrizeProducts(id: string): Promise<{
        id: any;
        sku: any;
        name: any;
        category: any;
        price: any;
        points: any;
        icon: any;
        imageUrl: any;
        imgStyle: any;
        status: string;
        canBePrize: any;
        stock: any;
        sales: any;
    }[]>;
    runStudyProjectLiveAction(id: string, action: string, req: any): Promise<{
        projectId: string;
        status: string;
        liveStage: string;
        liveStageText: string;
        canStudentsEnterLive: boolean;
        canCheckInRoutePoints: boolean;
        issuedCertificateCount: number;
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
        project: {
            id: any;
            title: any;
            subtitle: any;
            price: any;
            status: any;
            liveStage: string;
            liveStageText: string;
            canStudentsEnterLive: boolean;
            canCheckInRoutePoints: boolean;
            liveStartedAt: any;
            departureStartedAt: any;
            studyStartedAt: any;
            liveEndedAt: any;
            currentRoutePointId: any;
            enrolled: any;
            maxCapacity: any;
            tags: any;
            gradientStart: any;
            gradientEnd: any;
            category: any;
            date: any;
            location: any;
            documents: {
                title: any;
                size: any;
                url: any;
            }[];
            contactPhone: any;
            contactServiceTime: any;
            contactWechat: any;
            mediaColors: any;
            openDate: any;
            startTime: number | null;
            endTime: number | null;
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
            createdAt: any;
            updatedAt: any;
        };
    }>;
    updateStudyProjectCurrentRoutePoint(id: string, body: Record<string, unknown>): Promise<{
        projectId: string;
        title: string;
        location: string;
        centerLatitude: number;
        centerLongitude: number;
        liveStage: string;
        liveStageText: string;
        canStudentsEnterLive: boolean;
        canCheckInRoutePoints: boolean;
        currentRoutePointId: string;
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
        points: {
            id: number;
            routePointId: any;
            title: any;
            desc: any;
            latitude: number;
            longitude: number;
            checkRadius: any;
            checkInMode: string;
            sortOrder: any;
            autoGrantPrize: any;
            autoPrizeProductId: any;
            autoPrizeQuantity: any;
            autoGrantPoints: any;
            autoPointsAmount: any;
            knowledgeEnabled: any;
            knowledgeVideoTitle: any;
            knowledgeVideoUrl: any;
            knowledgeQuestion: string;
            knowledgeOptions: string[];
            knowledgeQuestions: {
                question: string;
                options: string[];
            }[];
            knowledgeItems: {
                title: string;
                videoTitle: string;
                videoUrl: string;
                questions: {
                    question: string;
                    options: string[];
                }[];
            }[];
            knowledgeGrantPrize: any;
            knowledgePrizeProductId: any;
            knowledgePrizeQuantity: any;
            knowledgeGrantPoints: any;
            knowledgePointsAmount: any;
        }[];
        routePolylineSource: string;
        routePolylineStatus: string;
        routePolylineSegments: {
            mode: string;
            source: string;
            status: string;
            distance: number | null;
            duration: number | null;
            points: {
                latitude: number;
                longitude: number;
            }[];
        }[];
    }>;
    studyProjectRoutePointSettings(id: string, pointId: string): Promise<{
        knowledgeQuestions: {
            question: string;
            options: string[];
            answerIndex: number;
        }[];
        knowledgeItems: {
            title: string;
            videoTitle: string;
            videoUrl: string;
            questions: {
                question: string;
                options: string[];
                answerIndex: number;
            }[];
        }[];
        knowledgeAnswerIndex: number;
        id: number;
        routePointId: any;
        title: any;
        desc: any;
        latitude: number;
        longitude: number;
        checkRadius: any;
        checkInMode: string;
        sortOrder: any;
        autoGrantPrize: any;
        autoPrizeProductId: any;
        autoPrizeQuantity: any;
        autoGrantPoints: any;
        autoPointsAmount: any;
        knowledgeEnabled: any;
        knowledgeVideoTitle: any;
        knowledgeVideoUrl: any;
        knowledgeQuestion: string;
        knowledgeOptions: string[];
        knowledgeGrantPrize: any;
        knowledgePrizeProductId: any;
        knowledgePrizeQuantity: any;
        knowledgeGrantPoints: any;
        knowledgePointsAmount: any;
    }>;
    updateStudyProjectRoutePointSettings(id: string, pointId: string, body: Record<string, unknown>): Promise<{
        id: number;
        routePointId: any;
        title: any;
        desc: any;
        latitude: number;
        longitude: number;
        checkRadius: any;
        checkInMode: string;
        sortOrder: any;
        autoGrantPrize: any;
        autoPrizeProductId: any;
        autoPrizeQuantity: any;
        autoGrantPoints: any;
        autoPointsAmount: any;
        knowledgeEnabled: any;
        knowledgeVideoTitle: any;
        knowledgeVideoUrl: any;
        knowledgeQuestion: string;
        knowledgeOptions: string[];
        knowledgeQuestions: {
            question: string;
            options: string[];
        }[];
        knowledgeItems: {
            title: string;
            videoTitle: string;
            videoUrl: string;
            questions: {
                question: string;
                options: string[];
            }[];
        }[];
        knowledgeGrantPrize: any;
        knowledgePrizeProductId: any;
        knowledgePrizeQuantity: any;
        knowledgeGrantPoints: any;
        knowledgePointsAmount: any;
    }>;
    checkInStudyProjectParticipantRoutePoint(id: string, bookingId: string, pointId: string, req: any): Promise<{
        bookingId: any;
        userId: any;
        name: any;
        phone: any;
        studyNo: any;
        pointsBalance: number;
        role: any;
        status: string;
        projectCheckedIn: boolean;
        checkedInAt: any;
        checkedInById: any;
        routePointCheckedCount: number;
        routePointTotalCount: number;
        location: {
            id: any;
            projectId: any;
            bookingId: any;
            userId: any;
            latitude: number;
            longitude: number;
            accuracy: number | null;
            speed: number | null;
            updatedAt: any;
        } | null;
        routePointCheckIns: any[];
    }>;
    cancelStudyProjectParticipantRoutePointCheckIn(id: string, bookingId: string, pointId: string): Promise<{
        bookingId: any;
        userId: any;
        name: any;
        phone: any;
        studyNo: any;
        pointsBalance: number;
        role: any;
        status: string;
        projectCheckedIn: boolean;
        checkedInAt: any;
        checkedInById: any;
        routePointCheckedCount: number;
        routePointTotalCount: number;
        location: {
            id: any;
            projectId: any;
            bookingId: any;
            userId: any;
            latitude: number;
            longitude: number;
            accuracy: number | null;
            speed: number | null;
            updatedAt: any;
        } | null;
        routePointCheckIns: any[];
    }>;
    grantStudyProjectParticipantPrize(id: string, bookingId: string, body: Record<string, unknown>, req: any): Promise<{
        id: any;
        projectId: any;
        bookingId: any;
        userId: any;
        productId: any;
        product: {
            id: any;
            sku: any;
            name: any;
            category: any;
            price: any;
            points: any;
            icon: any;
            imageUrl: any;
            imgStyle: any;
            status: string;
            canBePrize: any;
            stock: any;
            sales: any;
        };
        quantity: any;
        note: any;
        grantedAt: any;
        grantedBy: {
            id: any;
            nickname: any;
            phone: any;
            studyNo: any;
        };
    }>;
    grantStudyProjectParticipantPoints(id: string, bookingId: string, body: Record<string, unknown>, req: any): Promise<{
        bookingId: any;
        userId: any;
        name: any;
        phone: any;
        studyNo: any;
        pointsBalance: number;
        role: any;
        status: string;
        projectCheckedIn: boolean;
        checkedInAt: any;
        checkedInById: any;
        routePointCheckedCount: number;
        routePointTotalCount: number;
        location: {
            id: any;
            projectId: any;
            bookingId: any;
            userId: any;
            latitude: number;
            longitude: number;
            accuracy: number | null;
            speed: number | null;
            updatedAt: any;
        } | null;
        routePointCheckIns: any[];
    }>;
    studyProjectParticipantBackpack(id: string, bookingId: string): Promise<{
        projectId: any;
        projectTitle: any;
        subtitle: any;
        gradientStart: any;
        gradientEnd: any;
        gridCols: any;
        gridRows: any;
        collectedCount: any;
        totalCount: any;
        completed: boolean;
        participant: {
            bookingId: any;
            userId: any;
            name: any;
            phone: any;
            studyNo: any;
        };
        pieces: any;
        prizes: {
            id: any;
            productId: any;
            name: string;
            desc: string;
            icon: any;
            imageUrl: any;
            quantity: any;
            acquired: boolean;
            acquiredText: string;
            grantedAt: any;
            grantedByName: any;
        }[];
    }>;
    studyProjectOrganizers(id: string): Promise<{
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
    addStudyProjectOrganizer(id: string, body: Record<string, unknown>): Promise<{
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
    removeStudyProjectOrganizer(id: string, userId: string): Promise<{
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
    studyProjectAdmins(id: string): Promise<{
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
    addStudyProjectAdmin(id: string, body: Record<string, unknown>): Promise<{
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
    removeStudyProjectAdmin(id: string, userId: string): Promise<{
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
    addStudyProjectUser(id: string, body: Record<string, unknown>): Promise<{
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
    addUserStudyProject(id: string, body: Record<string, unknown>): Promise<{
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
    orders(status?: string, keyword?: string): Promise<{
        id: any;
        orderNo: any;
        status: any;
        goodsAmount: string;
        amount: string;
        points: any;
        pointsUsed: any;
        pointsDiscount: string;
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
        } | null;
        items: any;
    }[]>;
    payOrder(id: string): Promise<{
        id: any;
        orderNo: any;
        status: any;
        goodsAmount: string;
        amount: string;
        points: any;
        pointsUsed: any;
        pointsDiscount: string;
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
        } | null;
        items: any;
    }>;
    shipOrder(id: string, body: Record<string, unknown>): Promise<{
        id: any;
        orderNo: any;
        status: any;
        goodsAmount: string;
        amount: string;
        points: any;
        pointsUsed: any;
        pointsDiscount: string;
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
        } | null;
        items: any;
    }>;
    completeOrder(id: string): Promise<{
        id: any;
        orderNo: any;
        status: any;
        goodsAmount: string;
        amount: string;
        points: any;
        pointsUsed: any;
        pointsDiscount: string;
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
        } | null;
        items: any;
    }>;
    cancelOrder(id: string): Promise<{
        id: any;
        orderNo: any;
        status: any;
        goodsAmount: string;
        amount: string;
        points: any;
        pointsUsed: any;
        pointsDiscount: string;
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
        } | null;
        items: any;
    }>;
    orderDetail(id: string): Promise<{
        id: any;
        orderNo: any;
        status: any;
        goodsAmount: string;
        amount: string;
        points: any;
        pointsUsed: any;
        pointsDiscount: string;
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
        } | null;
        items: any;
    }>;
    updateOrder(id: string, body: Record<string, unknown>): Promise<{
        id: any;
        orderNo: any;
        status: any;
        goodsAmount: string;
        amount: string;
        points: any;
        pointsUsed: any;
        pointsDiscount: string;
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
        } | null;
        items: any;
    }>;
    deleteOrder(id: string): Promise<{
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
    private canManageAccess;
}
