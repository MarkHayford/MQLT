import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { StudyNoService } from '../common/study-no.service';
import { PrismaService } from '../prisma/prisma.service';
type RouteCoordinate = {
    latitude: number;
    longitude: number;
};
type StudyRoutePolylineSegment = {
    mode: string;
    source: string;
    status: string;
    distance: number | null;
    duration: number | null;
    points: RouteCoordinate[];
};
export declare class StudyService {
    private readonly prisma;
    private readonly jwtService;
    private readonly studyNo;
    private readonly config;
    private readonly amapRouteCache;
    constructor(prisma: PrismaService, jwtService: JwtService, studyNo: StudyNoService, config: ConfigService);
    getProjects(query: {
        category?: string;
        keyword?: string;
    }): Promise<{
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
    }[]>;
    getProjectDetail(id: string): Promise<{
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
    }>;
    getProjectDocumentDetail(id: string, docIndex: string): Promise<{
        projectId: any;
        projectTitle: any;
        title: any;
        subtitle: any;
        updatedAt: string;
        sections: {
            heading: string;
            paragraphs: any;
            bullets: any;
        }[];
    }>;
    getProjectLiveRoute(id: string): Promise<{
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
        routePolylineSegments: StudyRoutePolylineSegment[];
    }>;
    private getProjectLiveRouteSnapshot;
    getProjectLiveNavigationRoute(userId: string, projectId: string, query: Record<string, unknown>): Promise<{
        projectId: string;
        mode: string;
        source: string;
        status: string;
        distance: number | null;
        duration: number | null;
        points: RouteCoordinate[];
    }>;
    updateProjectCurrentRoutePoint(userId: string, projectId: string, body: Record<string, unknown>): Promise<{
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
        routePolylineSegments: StudyRoutePolylineSegment[];
    }>;
    adminConsoleUpdateProjectCurrentRoutePoint(projectId: string, body: Record<string, unknown>): Promise<{
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
        routePolylineSegments: StudyRoutePolylineSegment[];
    }>;
    private applyProjectCurrentRoutePointUpdate;
    getProjectLiveAdminAccess(userId: string, projectId: string): Promise<{
        projectId: string;
        canUseAdminTools: boolean;
        isProjectAdmin: boolean;
        isProjectOrganizer: boolean;
        capabilities: string[];
    }>;
    getProjectDepartureSettings(userId: string, projectId: string): Promise<{
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
    updateProjectDepartureSettings(userId: string, projectId: string, body: Record<string, unknown>): Promise<{
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
    adminReadyProject(userId: string, projectId: string): Promise<{
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
    adminStartProjectDeparture(userId: string, projectId: string): Promise<{
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
    adminStartProjectStudy(userId: string, projectId: string): Promise<{
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
    adminEndProject(userId: string, projectId: string): Promise<{
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
    adminReopenProject(userId: string, projectId: string): Promise<{
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
    private updateProjectLiveStage;
    adminConsoleUpdateProjectLiveStage(operatorUserId: string | undefined, projectId: string, action: string): Promise<{
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
    private applyProjectLiveStageAction;
    private issueStudyCertificatesForProject;
    private resolveCertificateHolderName;
    private buildStudyCertificateNo;
    private certificateNoToken;
    getRoutePointCheckIns(userId: string, projectId: string): Promise<{
        id: any;
        bookingId: any;
        projectId: any;
        routePointId: any;
        routePointTitle: any;
        checkedInAt: any;
        latitude: number | null;
        longitude: number | null;
        accuracy: number | null;
    }[]>;
    reportLiveLocation(userId: string, projectId: string, body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        bookingId: any;
        userId: any;
        latitude: number;
        longitude: number;
        accuracy: number | null;
        speed: number | null;
        updatedAt: any;
    } | null>;
    getProjectLiveParticipants(userId: string, projectId: string): Promise<{
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
    adminConsoleGetProjectLiveParticipants(projectId: string): Promise<{
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
    private getProjectLiveParticipantsSnapshot;
    getProjectPrizeProducts(userId: string, projectId: string): Promise<{
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
    adminConsoleGetProjectPrizeProducts(projectId: string): Promise<{
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
    adminCheckInLiveParticipant(userId: string, projectId: string, bookingId: string): Promise<{
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
    adminCancelLiveParticipantCheckIn(userId: string, projectId: string, bookingId: string): Promise<{
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
    adminCheckInLiveParticipantRoutePoint(userId: string, projectId: string, bookingId: string, routePointId: string): Promise<{
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
    adminConsoleCheckInLiveParticipantRoutePoint(operatorUserId: string | undefined, projectId: string, bookingId: string, routePointId: string): Promise<{
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
    private applyLiveParticipantRoutePointCheckIn;
    adminCancelLiveParticipantRoutePointCheckIn(userId: string, projectId: string, bookingId: string, routePointId: string): Promise<{
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
    adminConsoleCancelLiveParticipantRoutePointCheckIn(projectId: string, bookingId: string, routePointId: string): Promise<{
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
    private applyCancelLiveParticipantRoutePointCheckIn;
    adminGrantLiveParticipantPrize(userId: string, projectId: string, bookingId: string, body: Record<string, unknown>): Promise<{
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
    adminConsoleGrantLiveParticipantPrize(operatorUserId: string | undefined, projectId: string, bookingId: string, body: Record<string, unknown>): Promise<{
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
    private applyLiveParticipantPrizeGrant;
    adminGrantLiveParticipantPoints(userId: string, projectId: string, bookingId: string, body: Record<string, unknown>): Promise<{
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
    adminConsoleGrantLiveParticipantPoints(operatorUserId: string | undefined, projectId: string, bookingId: string, body: Record<string, unknown>): Promise<{
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
    private applyLiveParticipantPointsGrant;
    adminGetLiveParticipantBackpack(userId: string, projectId: string, bookingId: string): Promise<{
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
    adminConsoleGetLiveParticipantBackpack(projectId: string, bookingId: string): Promise<{
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
    private getLiveParticipantBackpackSnapshot;
    checkInRoutePoint(userId: string, projectId: string, routePointId: string, body: Record<string, unknown>): Promise<{
        alreadyCheckedIn: boolean;
        distance: number | null;
        id: any;
        bookingId: any;
        projectId: any;
        routePointId: any;
        routePointTitle: any;
        checkedInAt: any;
        latitude: number | null;
        longitude: number | null;
        accuracy: number | null;
    }>;
    getRoutePointCheckInCode(userId: string, projectId: string, routePointId: string): Promise<{
        routePoint: {
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
        };
        payload: import("./study-check-in-code").StudyRoutePointCheckInPayload;
        raw: string;
        qrImageUrl: string;
    }>;
    getRoutePointAdminSettings(userId: string, projectId: string, routePointId: string): Promise<{
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
    adminConsoleGetRoutePointAdminSettings(projectId: string, routePointId: string): Promise<{
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
    private getRoutePointAdminSettingsSnapshot;
    getRoutePointKnowledgeTask(userId: string, projectId: string, routePointId: string): Promise<{
        projectId: any;
        routePointId: any;
        routePointTitle: any;
        enabled: boolean;
        videoTitle: string;
        videoUrl: string;
        question: string;
        options: string[];
        questions: {
            question: string;
            options: string[];
        }[];
        items: {
            title: string;
            videoTitle: string;
            videoUrl: string;
            questions: {
                question: string;
                options: string[];
            }[];
        }[];
        completed: boolean;
        completedAt: any;
        rewardsPreview: {
            grantPrize: boolean;
            prizeProductId: any;
            prizeQuantity: any;
            grantPoints: boolean;
            pointsAmount: any;
        };
        rewards: {
            prize: {
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
            } | null;
            points: {
                id: any;
                amount: any;
                title: any;
                createdAt: any;
            } | null;
        };
    }>;
    completeRoutePointKnowledgeTask(userId: string, projectId: string, routePointId: string, body: Record<string, unknown>): Promise<{
        correct: boolean;
        completed: boolean;
        alreadyCompleted: boolean;
        message: string;
        rewards: {
            prize: {
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
            } | null;
            points: {
                id: any;
                amount: any;
                title: any;
                createdAt: any;
            } | null;
        };
        projectId: any;
        routePointId: any;
        routePointTitle: any;
        enabled: boolean;
        videoTitle: string;
        videoUrl: string;
        question: string;
        options: string[];
        questions: {
            question: string;
            options: string[];
        }[];
        items: {
            title: string;
            videoTitle: string;
            videoUrl: string;
            questions: {
                question: string;
                options: string[];
            }[];
        }[];
        completedAt: any;
        rewardsPreview: {
            grantPrize: boolean;
            prizeProductId: any;
            prizeQuantity: any;
            grantPoints: boolean;
            pointsAmount: any;
        };
    }>;
    createRoutePoint(userId: string, projectId: string, body: Record<string, unknown>): Promise<{
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
        routePolylineSegments: StudyRoutePolylineSegment[];
    }>;
    updateRoutePointSettings(userId: string, projectId: string, routePointId: string, body: Record<string, unknown>): Promise<{
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
    adminConsoleUpdateRoutePointSettings(projectId: string, routePointId: string, body: Record<string, unknown>): Promise<{
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
    private applyRoutePointSettingsUpdate;
    deleteRoutePoint(userId: string, projectId: string, routePointId: string): Promise<{
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
        routePolylineSegments: StudyRoutePolylineSegment[];
    }>;
    reorderRoutePoints(userId: string, projectId: string, body: Record<string, unknown>): Promise<{
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
        routePolylineSegments: StudyRoutePolylineSegment[];
    }>;
    sendProjectImage(filename: string, res: Response): any;
    checkInProject(userId: string, projectId: string, body: Record<string, unknown>): Promise<{
        booking: {
            id: any;
            projectId: any;
            bookingGroupId: any;
            bookerId: any;
            isBooker: boolean;
            participantCount: number;
            participants: any[];
            status: any;
            amount: string;
            personalAmount: any;
            paidAt: any;
            cancelledAt: any;
            completedAt: any;
            checkedInAt: any;
            checkedInById: any;
            userDeletedAt: any;
            pendingReady: boolean;
            payable: boolean;
            confirmable: boolean;
            cancellable: boolean;
            createdAt: any;
            updatedAt: any;
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
        };
        checkedInAt: any;
        alreadyCheckedIn: boolean;
        participantName: any;
        studyNo: any;
        projectId: any;
        projectTitle: any;
    }>;
    organizerCheckInProject(organizerId: string, projectId: string, body: Record<string, unknown>): Promise<{
        booking: {
            id: any;
            projectId: any;
            bookingGroupId: any;
            bookerId: any;
            isBooker: boolean;
            participantCount: number;
            participants: any[];
            status: any;
            amount: string;
            personalAmount: any;
            paidAt: any;
            cancelledAt: any;
            completedAt: any;
            checkedInAt: any;
            checkedInById: any;
            userDeletedAt: any;
            pendingReady: boolean;
            payable: boolean;
            confirmable: boolean;
            cancellable: boolean;
            createdAt: any;
            updatedAt: any;
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
        };
        checkedInAt: any;
        alreadyCheckedIn: boolean;
        participantName: any;
        studyNo: any;
        projectId: any;
        projectTitle: any;
    }>;
    createBooking(userId: string, body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    payBooking(userId: string, id: string): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    getBookingDetail(userId: string, id: string): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    verifyBookingParticipant(userId: string, id: string): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    confirmBooking(userId: string, id: string): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    addBookingParticipants(userId: string, id: string, body: Record<string, unknown>): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    removeBookingParticipant(userId: string, id: string, participantBookingId: string): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    cancelBooking(userId: string, id: string): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    deleteBooking(userId: string, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    getBookings(userId: string): Promise<{
        id: any;
        projectId: any;
        bookingGroupId: any;
        bookerId: any;
        isBooker: boolean;
        participantCount: number;
        participants: any[];
        status: any;
        amount: string;
        personalAmount: any;
        paidAt: any;
        cancelledAt: any;
        completedAt: any;
        checkedInAt: any;
        checkedInById: any;
        userDeletedAt: any;
        pendingReady: boolean;
        payable: boolean;
        confirmable: boolean;
        cancellable: boolean;
        createdAt: any;
        updatedAt: any;
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
    }[]>;
    getFloatingNotices(token?: string | null): Promise<{
        id: any;
        projectId: any;
        fallbackProjectId: any;
        title: any;
        subtitle: any;
        showSubtitle: any;
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
        updatedAt: any;
        projectTitle: any;
    }[]>;
    private getUserIdFromToken;
    getNotices(projectId?: string): Promise<{
        id: any;
        title: any;
        content: any;
        time: any;
        timestamp: number;
        type: any;
        projectId: any;
        projectTitle: any;
    }[]>;
    getNoticeDetail(id: string): Promise<{
        publisher: string;
        paragraphs: string[];
        id: any;
        title: any;
        content: any;
        time: any;
        timestamp: number;
        type: any;
        projectId: any;
        projectTitle: any;
    }>;
    private serializeProject;
    private serializeDepartureSettings;
    private resolveCurrentRoutePointId;
    private resolveProjectLiveStage;
    private liveStageText;
    private canStudentsEnterLiveStage;
    private canCheckInRoutePointStage;
    private buildRoutePointNavigationRoute;
    private fetchAmapRouteSegment;
    private parseAmapRouteResponse;
    private appendAmapPolyline;
    private createUnavailableRouteSegment;
    private getAmapWebServiceKey;
    private mapAmapRouteMode;
    private formatRouteCoordinate;
    private readAmapMetric;
    private getProjectLiveStageRecord;
    private assertProjectLiveOpenForStudent;
    private assertProjectStudyTasksActive;
    private assertRoutePointOpenForCurrentStage;
    private normalizeProjectDocumentSections;
    private normalizeProjectDocuments;
    private getProjectDocuments;
    private getProjectDocumentSummaries;
    private getDefaultZhengdaProjectDocuments;
    private createProjectDocumentDetail;
    private createZhengdaProjectDocument;
    private projectImageDir;
    private serializeNotice;
    private serializeFloatingNotice;
    private serializeRoutePoint;
    private serializeRoutePointAdminSettings;
    private serializeRoutePointKnowledgeTask;
    private serializeKnowledgeRewardsPreview;
    private emptyKnowledgeRewards;
    private serializeKnowledgeCompletionRewards;
    private serializeRoutePointCheckIn;
    private serializeLiveLocation;
    private serializeLiveParticipant;
    private serializePrizeProduct;
    private serializeStudyPrizeGrant;
    private generatePrizeOrderNo;
    private createPrizeOrderRemark;
    private createRoutePointRewardSourceId;
    private createKnowledgeTaskSourceId;
    private issueRoutePointAutoRewardsTx;
    private issueRoutePointAutoPrizeTx;
    private issueKnowledgeTaskRewardsTx;
    private issueKnowledgeTaskPrizeTx;
    private issueKnowledgeTaskPointsTx;
    private issueRoutePointAutoPointsTx;
    private serializeLiveParticipantBackpack;
    private serializeBackpackPrize;
    private getActiveSeatBookingById;
    private getLiveParticipantSnapshot;
    private getUserActiveSeatBooking;
    private readOptionalNumber;
    private readRequiredLatitude;
    private readRequiredLongitude;
    private readRoutePointTitle;
    private readRoutePointDescription;
    private readRoutePointCheckRadius;
    private readRoutePointIdList;
    private readPrizeQuantity;
    private readPrizeNote;
    private readManualPointsAmount;
    private readPointsNote;
    private readAdminOperatorUserId;
    private normalizeLiveStageAction;
    private readBoolean;
    private readRoutePointAutoPointsAmount;
    private readKnowledgeAnswerIndex;
    private readKnowledgeOptions;
    private readKnowledgeAnswerIndexes;
    private getKnowledgeQuestions;
    private getKnowledgeItems;
    private flattenKnowledgeItems;
    private readKnowledgeQuestions;
    private readKnowledgeItems;
    private serializeKnowledgeQuestionsPublic;
    private serializeKnowledgeQuestionsAdmin;
    private serializeKnowledgeItemsPublic;
    private serializeKnowledgeItemsAdmin;
    private applyKnowledgeQuestionMirror;
    private applyKnowledgeItemMirror;
    private isKnowledgeTaskConfigured;
    private assertKnowledgeTaskConfigured;
    private assertKnowledgeTaskSettingsCandidate;
    private mapRoutePointKnowledgeSettingsData;
    private mapRoutePointRewardSettingsData;
    private normalizeRoutePointSortOrders;
    private mapRoutePointCheckInMode;
    private mapDepartureMode;
    private readOptionalText;
    private readRequiredText;
    private readOptionalLatitude;
    private readOptionalLongitude;
    private mapDepartureSettingsData;
    private getDistanceMeters;
    private toRadians;
    private checkInProjectParticipant;
    private serializeCheckInResult;
    private extractProjectCheckInPayload;
    private extractRoutePointCheckInPayload;
    private extractCheckInUserPayload;
    private parseCheckInPayload;
    private selectedTravelersContainExternalUser;
    private createOrganizerParticipant;
    private resolveBookingParticipants;
    private findOrCreateParticipantUser;
    private resolveAdditionalParticipants;
    private assertStudyProjectOrganizer;
    private assertStudyProjectExists;
    private assertStudyProjectLiveRouteAccess;
    private assertStudyProjectCheckInOperator;
    private assertStudyProjectRoutePointAdmin;
    private assertStudyProjectPrizeGrantAdmin;
    private assertStudyProjectPointsGrantAdmin;
    private assertStudyProjectLifecycleAdmin;
    private isUniqueConstraintError;
    private extractStringList;
    private assertParticipantsNotBooked;
    private getBookingGroupBookings;
    private getGroupsForBookings;
    private serializeBooking;
    private serializeParticipants;
    private isBookingGroupReady;
    private resolveParticipantVerification;
    private isRegisteredUser;
    private matchRealName;
    private canAccessBookingGroup;
    private deleteEmptyPlaceholderUsers;
    private resolveGroupAmount;
    private isBookingGroupBooker;
    private isSeatBooking;
    private countSeatBookings;
    private assertProjectBookable;
    private incrementStudyProjectEnrollment;
    private isActiveBookingStatus;
}
export {};
