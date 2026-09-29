'use strict';

const PRESET = {
  family: { audienceLabel: '亲子', defaultName: '亲子轻松' },
  college: { audienceLabel: '高校', defaultName: '高校研学' },
  business: { audienceLabel: '商务', defaultName: '商务接待' },
};

const MAX_ITEMS = 20;
const MAX_SPOTS = 40;
const MAX_NAME = 40;
const MAX_LABEL = 20;
const MAX_DESC = 240;
const MAX_ZONE = 40;

function trimStr(value, max) {
  const text = String(value == null ? '' : value).trim();
  if (!max) return text;
  return text.slice(0, max);
}

function audienceKind(raw) {
  const value = String(raw || '').trim();
  if (value === 'family' || value === 'college' || value === 'business') return value;
  return 'custom';
}

function paceOf(raw) {
  const value = String(raw || '').trim();
  if (value === 'light' || value === 'full' || value === 'balanced') return value;
  return 'balanced';
}

function needCarOf(raw) {
  const value = String(raw || '').trim();
  if (value === 'yes' || value === 'no' || value === 'auto') return value;
  return 'auto';
}

function uniqueSpotIds(raw) {
  const input = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = {};
  for (let i = 0; i < input.length && out.length < MAX_SPOTS; i++) {
    const id = String(input[i] || '').trim();
    if (!id || seen[id]) continue;
    seen[id] = true;
    out.push(id);
  }
  return out;
}

function sourceList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

function customAudienceLabel(raw) {
  const label = trimStr(raw && raw.audienceLabel, MAX_LABEL);
  if (label && label !== '自定义') return label;
  const name = trimStr(raw && raw.name, MAX_LABEL);
  if (name && name !== '自定义' && name !== '人群模板') return name;
  return '';
}

function normalizeOne(raw, index) {
  const row = raw && typeof raw === 'object' ? raw : {};
  let id = trimStr(row.id, 64);
  if (!id) id = 'tpl_' + String(index);
  const audience = audienceKind(row.audience);
  let audienceLabel;
  let name;
  if (audience === 'custom') {
    audienceLabel = customAudienceLabel(row);
    name = trimStr(row.name, MAX_NAME) || audienceLabel;
  } else {
    audienceLabel = PRESET[audience].audienceLabel;
    name = trimStr(row.name, MAX_NAME) || PRESET[audience].defaultName;
  }
  const sortRaw = Number(row.sortOrder);
  return {
    id,
    name: name.slice(0, MAX_NAME),
    audience,
    audienceLabel: audienceLabel.slice(0, MAX_LABEL),
    description: trimStr(row.description, MAX_DESC),
    zoneKey: trimStr(row.zoneKey, MAX_ZONE),
    pace: paceOf(row.pace),
    needCar: needCarOf(row.needCar),
    spotIds: uniqueSpotIds(row.spotIds),
    enabled: row.enabled !== false,
    sortOrder: Number.isFinite(sortRaw) ? sortRaw : index,
  };
}

function normalizeAudienceTemplates(raw) {
  const src = sourceList(raw);
  const out = [];
  const seen = {};
  for (let i = 0; i < src.length && out.length < MAX_ITEMS; i++) {
    const item = normalizeOne(src[i], i);
    if (seen[item.id]) continue;
    seen[item.id] = true;
    out.push(item);
  }
  out.sort((a, b) => a.sortOrder - b.sortOrder);
  return out;
}

function validateAudienceTemplates(raw) {
  const errors = [];
  const src = sourceList(raw);
  if (src.length > MAX_ITEMS) {
    errors.push({ index: -1, field: 'items', message: '最多保存 ' + MAX_ITEMS + ' 套人群模板' });
  }
  const normalized = [];
  const seen = {};
  const limit = Math.min(src.length, MAX_ITEMS);
  for (let i = 0; i < limit; i++) {
    const item = normalizeOne(src[i], i);
    const n = i + 1;
    if (seen[item.id]) {
      errors.push({ index: i, field: 'id', message: '第 ' + n + ' 套模板编号重复' });
      continue;
    }
    seen[item.id] = true;
    if (item.audience === 'custom') {
      if (!item.audienceLabel) {
        errors.push({ index: i, field: 'audienceLabel', message: '第 ' + n + ' 套：自定义人群请填写人群名称，例如「银发团」「冬令营」' });
      }
      if (!item.name) {
        errors.push({ index: i, field: 'name', message: '第 ' + n + ' 套：请填写模板名称' });
      }
    } else if (!item.name) {
      errors.push({ index: i, field: 'name', message: '第 ' + n + ' 套：请填写模板名称' });
    }
    if (item.enabled && item.spotIds.length === 0) {
      errors.push({ index: i, field: 'spotIds', message: '第 ' + n + ' 套「' + (item.name || item.audienceLabel || '未命名') + '」已启用，请至少勾选 1 个点位' });
    }
    normalized.push(item);
  }
  normalized.sort((a, b) => a.sortOrder - b.sortOrder);
  return { ok: errors.length === 0, items: normalized, errors };
}

function publicAudienceTemplates(raw) {
  const all = normalizeAudienceTemplates(raw);
  return all.filter((item) => item.enabled);
}

function displayAudienceLabel(item) {
  if (!item) return '自定义';
  const kind = audienceKind(item.audience);
  if (kind !== 'custom') return PRESET[kind].audienceLabel;
  const label = trimStr(item.audienceLabel || item.name, MAX_LABEL);
  if (label && label !== '自定义') return label;
  return '自定义';
}

module.exports = {
  PRESET,
  MAX_ITEMS,
  MAX_SPOTS,
  MAX_NAME,
  MAX_LABEL,
  audienceKind,
  normalizeAudienceTemplates,
  validateAudienceTemplates,
  publicAudienceTemplates,
  displayAudienceLabel,
};
