'use strict';

const MAX_TITLE = 40;
const MAX_HTML = 80000;
const MAX_FILES = 12;
const MAX_NAME = 80;

function trimStr(value, max) {
  const text = String(value == null ? '' : value).trim();
  if (!max) return text;
  return text.slice(0, max);
}

function stripScripts(html) {
  let out = String(html == null ? '' : html);
  out = out.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/javascript:/gi, '');
  return out;
}

function fileItem(raw) {
  const row = raw && typeof raw === 'object' ? raw : {};
  const url = trimStr(row.url || row.imageUrl, 500);
  if (!url) return null;
  const name = trimStr(row.name || row.originalname || url.split('/').pop() || '文件', MAX_NAME) || '文件';
  const size = Number(row.size);
  return {
    url,
    name,
    size: Number.isFinite(size) && size > 0 ? size : 0,
    mime: trimStr(row.mime || row.contentType, 80),
  };
}

function fileList(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = {};
  for (let i = 0; i < src.length && out.length < MAX_FILES; i++) {
    const item = fileItem(src[i]);
    if (!item || seen[item.url]) continue;
    seen[item.url] = true;
    out.push(item);
  }
  return out;
}

function emptySplash() {
  return {
    enabled: false,
    closable: true,
    title: '',
    html: '',
    images: [],
    videos: [],
    attachments: [],
    version: 0,
  };
}

function normalizeSplashAnnouncement(raw) {
  const row = raw && typeof raw === 'object' ? raw : {};
  const version = Number(row.version);
  return {
    enabled: row.enabled === true,
    closable: row.closable !== false,
    title: trimStr(row.title, MAX_TITLE),
    html: stripScripts(row.html).slice(0, MAX_HTML),
    images: fileList(row.images),
    videos: fileList(row.videos),
    attachments: fileList(row.attachments),
    version: Number.isFinite(version) && version > 0 ? Math.floor(version) : 0,
  };
}

function validateSplashAnnouncement(raw) {
  const item = normalizeSplashAnnouncement(raw);
  const errors = [];
  if (item.enabled && !item.title) {
    errors.push({ field: 'title', message: '启用开屏公告时请填写标题' });
  }
  if (item.enabled && !item.html && item.images.length === 0 && item.videos.length === 0 && item.attachments.length === 0) {
    errors.push({ field: 'html', message: '启用开屏公告时请填写内容，或上传图片 / 视频 / 附件' });
  }
  return { ok: errors.length === 0, value: item, errors };
}

function publicSplashAnnouncement(raw) {
  const item = normalizeSplashAnnouncement(raw);
  if (!item.enabled) {
    return { enabled: false, closable: true, title: '', html: '', images: [], videos: [], attachments: [], version: item.version };
  }
  return item;
}

module.exports = {
  MAX_TITLE,
  MAX_HTML,
  emptySplash,
  normalizeSplashAnnouncement,
  validateSplashAnnouncement,
  publicSplashAnnouncement,
};
