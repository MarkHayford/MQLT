BEGIN;

UPDATE "StudyProject"
SET
  "subtitle" = '走进内蒙古正大鸿业食品加工厂，体验现代化食品加工与农食全产业链研习之旅',
  "location" = '内蒙古正大鸿业食品有限公司食品加工厂',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '6';

UPDATE "StudyNotice"
SET
  "content" = '首期学员已入厂参访，内蒙古正大鸿业食品加工厂示范线每日限额接待...',
  "publisher" = '内蒙古正大鸿业食品有限公司 · 研学运营中心',
  "paragraphs" = ARRAY[
    '正大集团企业研学研习已进入正在进行中阶段，实际研学地点为内蒙古正大鸿业食品有限公司食品加工厂。',
    '已预约学员请按通知时间到食品加工厂接待大厅集合。'
  ]
WHERE "id" = '6-1';

UPDATE "StudyRoutePoint" AS point
SET
  "title" = route."title",
  "description" = route."description",
  "latitude" = route."latitude",
  "longitude" = route."longitude",
  "checkRadius" = route."checkRadius",
  "sortOrder" = route."sortOrder",
  "enabled" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  VALUES
    ('study-route-6-1', '接待大厅', '签到、领取物料、讲解研学须知', 40.509204, 111.826493, 120, 1),
    ('study-route-6-2', '科普长廊', '生猪畜牧知识、养殖防疫科普、集章打卡', 40.509780, 111.827020, 120, 2),
    ('study-route-6-3', '观光生产线', '观摩全自动肉类分割生产线、生产链特色拼图体验（附正大智慧工厂实时导览图）', 40.510420, 111.827780, 120, 3),
    ('study-route-6-4', '产品展厅', '产品品鉴、肉制品科普、文创产品选购', 40.509760, 111.828520, 120, 4),
    ('study-route-6-5', 'DIY工坊', '手工灌装香肠、熟食品尝、公益餐贴制作', 40.508980, 111.827680, 120, 5),
    ('study-route-6-6', '大厅（离场）', '收尾离场、领取小礼品、颁发研学结业证书', 40.508420, 111.826760, 120, 6)
) AS route("id", "title", "description", "latitude", "longitude", "checkRadius", "sortOrder")
WHERE point."id" = route."id"
  AND point."projectId" = '6';

COMMIT;
