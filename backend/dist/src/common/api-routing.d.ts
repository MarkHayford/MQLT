import type { INestApplication } from '@nestjs/common';
export declare const DEFAULT_API_PREFIX = "v1";
export declare const LIVENESS_PATH = "healthz";
export declare function normalizeApiPrefix(configuredPrefix?: string): string;
export declare function configureApiRouting(app: Pick<INestApplication, 'setGlobalPrefix'>, configuredPrefix?: string): string;
