"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_presigned_post_1 = require("@aws-sdk/s3-presigned-post");
const PURPOSE_RULES = {
    avatar: {
        prefix: "avatars",
        maxBytes: 2 * 1024 * 1024,
        contentTypes: {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        },
    },
    product: {
        prefix: "products",
        maxBytes: 8 * 1024 * 1024,
        contentTypes: {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        },
    },
    "study-project": {
        prefix: "study-projects",
        maxBytes: 12 * 1024 * 1024,
        contentTypes: {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        },
    },
    notice: {
        prefix: "notices",
        maxBytes: 8 * 1024 * 1024,
        contentTypes: {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
        },
    },
    community: {
        prefix: "community",
        maxBytes: 80 * 1024 * 1024,
        contentTypes: {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "video/mp4": ".mp4",
            "video/quicktime": ".mov",
            "video/webm": ".webm",
        },
    },
    media: {
        prefix: "misc",
        maxBytes: 80 * 1024 * 1024,
        contentTypes: {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "video/mp4": ".mp4",
            "video/quicktime": ".mov",
            "video/webm": ".webm",
        },
    },
    splash: {
        prefix: "splash",
        maxBytes: 80 * 1024 * 1024,
        contentTypes: {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif",
            "video/mp4": ".mp4",
            "video/quicktime": ".mov",
            "video/webm": ".webm",
            "application/pdf": ".pdf",
            "application/zip": ".zip",
            "application/msword": ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/vnd.ms-excel": ".xls",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        },
    },
};
let StorageService = class StorageService {
    constructor(config) {
        this.config = config;
        this.client = null;
    }
    getClient() {
        if (this.client)
            return this.client;
        const endpoint = (this.config.get("S3_ENDPOINT") || "").trim();
        const region = (this.config.get("S3_REGION") || "ap-northeast-1").trim();
        const accessKeyId = (this.config.get("S3_ACCESS_KEY_ID") || "").trim();
        const secretAccessKey = (this.config.get("S3_SECRET_ACCESS_KEY") || "").trim();
        if (!endpoint || !accessKeyId || !secretAccessKey) {
            throw new common_1.ServiceUnavailableException("对象存储未配置");
        }
        const forcePathStyle = String(this.config.get("S3_FORCE_PATH_STYLE") || "1") !== "0";
        this.client = new client_s3_1.S3Client({
            region,
            endpoint,
            forcePathStyle,
            credentials: { accessKeyId, secretAccessKey },
        });
        return this.client;
    }
    bucket() {
        const bucket = (this.config.get("S3_BUCKET") || "").trim();
        if (!bucket)
            throw new common_1.ServiceUnavailableException("S3_BUCKET 未配置");
        return bucket;
    }
    keyPrefix() {
        return String(this.config.get("S3_KEY_PREFIX") || "public/mqlt/media")
            .replace(/^\/+/, "")
            .replace(/\/+$/, "");
    }
    mediaBaseUrl() {
        const media = (this.config.get("MEDIA_BASE_URL") || "").trim().replace(/\/+$/, "");
        if (media)
            return media;
        const cdn = (this.config.get("CDN_BASE_URL") || "http://127.0.0.1:8080").trim().replace(/\/+$/, "");
        return `${cdn}/media`;
    }
    expiresSeconds() {
        const n = Number(this.config.get("UPLOAD_PRESIGN_EXPIRES") || 600);
        if (!Number.isFinite(n))
            return 600;
        return Math.max(60, Math.min(3600, Math.floor(n)));
    }
    normalizePurpose(raw) {
        const purpose = String(raw || "").trim().toLowerCase();
        if (!PURPOSE_RULES[purpose]) {
            throw new common_1.BadRequestException("不支持的上传类型");
        }
        return purpose;
    }
    normalizeContentType(raw) {
        const ct = String(raw || "").trim().toLowerCase();
        if (!ct)
            throw new common_1.BadRequestException("请指定 contentType");
        return ct;
    }
    resolveRule(purpose, contentType) {
        const rule = PURPOSE_RULES[purpose];
        const ext = rule.contentTypes[contentType];
        if (!ext) {
            throw new common_1.BadRequestException("不支持的文件类型");
        }
        return { rule, ext };
    }
    buildObjectKey(purpose, ext, ownerHint) {
        const rule = PURPOSE_RULES[purpose];
        const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
        const rand = (0, crypto_1.randomBytes)(8).toString("hex");
        const safeOwner = String(ownerHint || "anon").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "anon";
        if (purpose === "avatar") {
            return `${this.keyPrefix()}/${rule.prefix}/${safeOwner}_${stamp}_${rand}${ext}`;
        }
        return `${this.keyPrefix()}/${rule.prefix}/${stamp}_${rand}${ext}`;
    }
    publicUrlForKey(key) {
        const prefix = this.keyPrefix() + "/";
        const relative = key.startsWith(prefix)
            ? key.slice(prefix.length)
            : key.replace(/^public\/mqlt\/media\//, "");
        return `${this.mediaBaseUrl()}/${relative}`;
    }
    async createPresignedUpload(input) {
        const purpose = this.normalizePurpose(input.purpose);
        const contentType = this.normalizeContentType(input.contentType);
        const { rule, ext } = this.resolveRule(purpose, contentType);
        const requestedMax = Number(input.maxBytes || rule.maxBytes);
        if (!Number.isFinite(requestedMax) || requestedMax <= 0 || requestedMax > rule.maxBytes) {
            throw new common_1.BadRequestException(`文件大小不能超过 ${rule.maxBytes} 字节`);
        }
        const key = this.buildObjectKey(purpose, ext, input.ownerHint);
        const client = this.getClient();
        const bucket = this.bucket();
        const expiresIn = this.expiresSeconds();
        const { url, fields } = await (0, s3_presigned_post_1.createPresignedPost)(client, {
            Bucket: bucket,
            Key: key,
            Expires: expiresIn,
            Conditions: [
                ["content-length-range", 1, rule.maxBytes],
                ["eq", "$Content-Type", contentType],
            ],
            Fields: {
                key,
                "Content-Type": contentType,
            },
        });
        const formFields = Object.keys(fields || {}).map((name) => ({
            name,
            value: String(fields[name]),
        }));
        return {
            method: "POST",
            uploadUrl: url,
            fields,
            formFields,
            headers: {},
            key,
            publicUrl: this.publicUrlForKey(key),
            expiresIn,
            maxBytes: rule.maxBytes,
            contentType,
            purpose,
        };
    }
    async putPublicFile(purpose, file) {
        if (!file)
            throw new common_1.BadRequestException("请选择文件");
        const purposeN = this.normalizePurpose(purpose);
        const contentType = this.normalizeContentType(file.mimetype || file.contentType);
        const { rule, ext } = this.resolveRule(purposeN, contentType);
        const size = Number(file.size || 0);
        if (size > rule.maxBytes)
            throw new common_1.BadRequestException("文件过大");
        const key = this.buildObjectKey(purposeN, ext, "splash");
        const body = file.buffer != null ? file.buffer : require("fs").readFileSync(file.path);
        await this.getClient().send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket(),
            Key: key,
            Body: body,
            ContentType: contentType,
        }));
        if (file.path) {
            try { require("fs").unlinkSync(file.path); } catch (_e) {}
        }
        return {
            url: this.publicUrlForKey(key),
            key,
            name: String(file.originalname || "文件"),
            size: size,
            mime: contentType,
        };
    }
    isManagedPublicUrl(url) {
        const value = String(url || "").trim();
        if (!value)
            return false;
        const base = this.mediaBaseUrl();
        if (value.startsWith(base + "/"))
            return true;
        return value.startsWith("http://127.0.0.1:8080/media/");
    }
    assertManagedPublicUrl(url) {
        const value = String(url || "").trim();
        if (!this.isManagedPublicUrl(value)) {
            throw new common_1.BadRequestException("无效的上传结果地址");
        }
        return value;
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StorageService);
//# sourceMappingURL=storage.service.js.map
