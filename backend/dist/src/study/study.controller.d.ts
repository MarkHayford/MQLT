import type { Response } from 'express';
import { type CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { StudyService } from './study.service';
export declare class StudyController {
    private readonly studyService;
    constructor(studyService: StudyService);
    projects(category?: string, keyword?: string): Promise<{
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
    projectDetail(id: string): Promise<{
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
    projectDocumentDetail(id: string, docIndex: string): Promise<{
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
    projectLiveRoute(id: string): Promise<{
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
    projectLiveNavigationRoute(user: CurrentUserPayload, id: string, query: Record<string, unknown>): Promise<{
        projectId: string;
        mode: string;
        source: string;
        status: string;
        distance: number | null;
        duration: number | null;
        points: {
            latitude: number;
            longitude: number;
        }[];
    }>;
    projectLiveAdminAccess(user: CurrentUserPayload, id: string): Promise<{
        projectId: string;
        canUseAdminTools: boolean;
        isProjectAdmin: boolean;
        isProjectOrganizer: boolean;
        capabilities: string[];
    }>;
    projectDepartureSettings(user: CurrentUserPayload, id: string): Promise<{
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
    updateProjectDepartureSettings(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    updateProjectCurrentRoutePoint(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    readyProjectLive(user: CurrentUserPayload, id: string): Promise<{
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
    startProjectDeparture(user: CurrentUserPayload, id: string): Promise<{
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
    startProjectStudy(user: CurrentUserPayload, id: string): Promise<{
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
    endProjectLive(user: CurrentUserPayload, id: string): Promise<{
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
    reopenProjectLive(user: CurrentUserPayload, id: string): Promise<{
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
    routePointCheckIns(user: CurrentUserPayload, id: string): Promise<{
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
    reportLiveLocation(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    liveParticipants(user: CurrentUserPayload, id: string): Promise<{
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
    prizeProducts(user: CurrentUserPayload, id: string): Promise<{
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
    projectImage(filename: string, res: Response): any;
    checkInProject(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    organizerCheckInProject(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    adminCheckInParticipant(user: CurrentUserPayload, id: string, bookingId: string): Promise<{
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
    adminCancelParticipantCheckIn(user: CurrentUserPayload, id: string, bookingId: string): Promise<{
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
    checkInRoutePoint(user: CurrentUserPayload, id: string, routePointId: string, body: Record<string, unknown>): Promise<{
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
    adminCheckInParticipantRoutePoint(user: CurrentUserPayload, id: string, bookingId: string, routePointId: string): Promise<{
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
    adminCancelParticipantRoutePointCheckIn(user: CurrentUserPayload, id: string, bookingId: string, routePointId: string): Promise<{
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
    adminGrantParticipantPrize(user: CurrentUserPayload, id: string, bookingId: string, body: Record<string, unknown>): Promise<{
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
    adminGrantParticipantPoints(user: CurrentUserPayload, id: string, bookingId: string, body: Record<string, unknown>): Promise<{
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
    adminGetParticipantBackpack(user: CurrentUserPayload, id: string, bookingId: string): Promise<{
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
    routePointCheckInCode(user: CurrentUserPayload, id: string, routePointId: string): Promise<{
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
    routePointAdminSettings(user: CurrentUserPayload, id: string, routePointId: string): Promise<{
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
    routePointKnowledgeTask(user: CurrentUserPayload, id: string, routePointId: string): Promise<{
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
    completeRoutePointKnowledgeTask(user: CurrentUserPayload, id: string, routePointId: string, body: Record<string, unknown>): Promise<{
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
    createRoutePoint(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    reorderRoutePoints(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    updateRoutePointSettings(user: CurrentUserPayload, id: string, routePointId: string, body: Record<string, unknown>): Promise<{
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
    deleteRoutePoint(user: CurrentUserPayload, id: string, routePointId: string): Promise<{
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
    createBooking(user: CurrentUserPayload, body: Record<string, unknown>): Promise<{
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
    payBooking(user: CurrentUserPayload, id: string): Promise<{
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
    bookingDetail(user: CurrentUserPayload, id: string): Promise<{
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
    verifyBooking(user: CurrentUserPayload, id: string): Promise<{
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
    confirmBooking(user: CurrentUserPayload, id: string): Promise<{
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
    addBookingParticipants(user: CurrentUserPayload, id: string, body: Record<string, unknown>): Promise<{
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
    removeBookingParticipantByDelete(user: CurrentUserPayload, id: string, participantBookingId: string): Promise<{
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
    removeBookingParticipant(user: CurrentUserPayload, id: string, participantBookingId: string): Promise<{
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
    cancelBooking(user: CurrentUserPayload, id: string): Promise<{
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
    deleteBooking(user: CurrentUserPayload, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
    bookings(user: CurrentUserPayload): Promise<{
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
    floatingNotices(authorization?: string): Promise<{
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
    notices(projectId?: string): Promise<{
        id: any;
        title: any;
        content: any;
        time: any;
        timestamp: number;
        type: any;
        projectId: any;
        projectTitle: any;
    }[]>;
    noticeDetail(id: string): Promise<{
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
    private extractBearerToken;
}
