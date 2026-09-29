CREATE TABLE "StudyRoutePoint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DECIMAL(10,6) NOT NULL,
    "longitude" DECIMAL(10,6) NOT NULL,
    "checkRadius" INTEGER NOT NULL DEFAULT 120,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyRoutePoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudyRoutePoint_projectId_enabled_sortOrder_idx" ON "StudyRoutePoint"("projectId", "enabled", "sortOrder");

ALTER TABLE "StudyRoutePoint" ADD CONSTRAINT "StudyRoutePoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudyProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "StudyRoutePoint" ("id", "projectId", "title", "description", "latitude", "longitude", "checkRadius", "sortOrder", "enabled", "createdAt", "updatedAt")
SELECT route."id", route."projectId", route."title", route."description", route."latitude", route."longitude", route."checkRadius", route."sortOrder", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    VALUES
    ('study-route-6-1', '6', '园区集合', '访客中心签到，领取研习手册与安全装备', 40.814920, 111.701520, 120, 1),
    ('study-route-6-2', '6', '产业链参观', '参观现代农业示范线与食品加工流程', 40.816260, 111.704180, 120, 2),
    ('study-route-6-3', '6', '现场研讨', '导师讲解农食安全与企业管理案例', 40.817740, 111.706480, 120, 3),
    ('study-route-6-4', '6', '总结分享', '分组汇报研习心得，完成结营记录', 40.819160, 111.708780, 120, 4),
    ('study-route-3-1', '3', '牧场集合', '访客中心集合，完成安全教育', 40.823350, 111.612780, 120, 1),
    ('study-route-3-2', '3', '奶源参观', '了解奶牛饲养、挤奶与原奶检测流程', 40.825020, 111.615420, 120, 2),
    ('study-route-3-3', '3', '工厂研学', '参观乳品加工线，学习品质管控体系', 40.826560, 111.617980, 120, 3),
    ('study-route-3-4', '3', '品鉴交流', '营养科普课堂与研习笔记分享', 40.828120, 111.620560, 120, 4),
    ('study-route-4-1', '4', '基地报到', '研学大厅签到，观看企业安全短片', 40.130260, 116.653200, 120, 1),
    ('study-route-4-2', '4', '智造参观', '参观自动化生产线与包装物流中心', 40.131640, 116.656120, 120, 2),
    ('study-route-4-3', '4', '冷链体验', '了解全程温控监测与食品安全追溯', 40.133080, 116.658740, 120, 3),
    ('study-route-4-4', '4', '创新课堂', '营养科技创新案例分享与互动问答', 40.134420, 116.661360, 120, 4),
    ('study-route-5-1', '5', '牧场抵达', '抵达营地，了解有机牧场生态概况', 38.847400, 105.706800, 160, 1),
    ('study-route-5-2', '5', '有机巡览', '参观有机饲草种植与奶牛放牧区', 38.849320, 105.710120, 160, 2),
    ('study-route-5-3', '5', '可持续课堂', '学习沙漠生态修复与碳中和实践', 38.851120, 105.713560, 160, 3),
    ('study-route-5-4', '5', '闭营总结', '完成研习打卡，提交观察记录', 38.853040, 105.716880, 160, 4)
) AS route("id", "projectId", "title", "description", "latitude", "longitude", "checkRadius", "sortOrder")
INNER JOIN "StudyProject" project ON project."id" = route."projectId";
