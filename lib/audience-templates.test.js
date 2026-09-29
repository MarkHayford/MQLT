'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('./audience-templates');

test('empty and junk input normalize to []', () => {
  assert.deepEqual(lib.normalizeAudienceTemplates(null), []);
  assert.deepEqual(lib.normalizeAudienceTemplates(undefined), []);
  assert.deepEqual(lib.normalizeAudienceTemplates('x'), []);
  assert.deepEqual(lib.normalizeAudienceTemplates(1), []);
  assert.deepEqual(lib.normalizeAudienceTemplates({}), []);
  assert.deepEqual(lib.normalizeAudienceTemplates({ items: null }), []);
});

test('reads { items: [] } wrapper', () => {
  const out = lib.normalizeAudienceTemplates({
    items: [{ audience: 'family', spotIds: ['a'] }],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].audience, 'family');
  assert.equal(out[0].audienceLabel, '亲子');
  assert.equal(out[0].name, '亲子轻松');
});

test('preset audiences get fixed labels and default names', () => {
  const out = lib.normalizeAudienceTemplates([
    { audience: 'family' },
    { audience: 'college' },
    { audience: 'business' },
  ]);
  assert.equal(out[0].audienceLabel, '亲子');
  assert.equal(out[1].audienceLabel, '高校');
  assert.equal(out[2].audienceLabel, '商务');
  assert.equal(out[0].name, '亲子轻松');
  assert.equal(out[1].name, '高校研学');
  assert.equal(out[2].name, '商务接待');
});

test('preset keeps a custom template name', () => {
  const out = lib.normalizeAudienceTemplates([
    { audience: 'family', name: '  亲子半日  ' },
  ]);
  assert.equal(out[0].name, '亲子半日');
  assert.equal(out[0].audienceLabel, '亲子');
});

test('unknown audience becomes custom', () => {
  const out = lib.normalizeAudienceTemplates([{ audience: 'vip', name: '贵宾线', audienceLabel: '贵宾' }]);
  assert.equal(out[0].audience, 'custom');
  assert.equal(out[0].audienceLabel, '贵宾');
});

test('custom without label but with a real name reuses the name', () => {
  const out = lib.normalizeAudienceTemplates([{ audience: 'custom', name: '银发团' }]);
  assert.equal(out[0].audienceLabel, '银发团');
  assert.equal(out[0].name, '银发团');
});

test('custom label "自定义" or empty name is not treated as a real crowd name', () => {
  const out = lib.normalizeAudienceTemplates([
    { audience: 'custom', name: '自定义' },
    { audience: 'custom', name: '人群模板' },
    { audience: 'custom', audienceLabel: '自定义' },
  ]);
  assert.equal(out[0].audienceLabel, '');
  assert.equal(out[1].audienceLabel, '');
  assert.equal(out[2].audienceLabel, '');
});

test('custom audienceLabel wins over name for the crowd tag', () => {
  const out = lib.normalizeAudienceTemplates([
    { audience: 'custom', name: '半天轻松线', audienceLabel: '冬令营' },
  ]);
  assert.equal(out[0].audienceLabel, '冬令营');
  assert.equal(out[0].name, '半天轻松线');
});

test('spot ids are trimmed, de-duplicated and capped at 40', () => {
  const ids = [];
  for (let i = 0; i < 50; i++) ids.push('s' + i);
  ids.push('s1', '  s2  ', '', null);
  const out = lib.normalizeAudienceTemplates([{ audience: 'family', spotIds: ids }]);
  assert.equal(out[0].spotIds.length, 40);
  assert.equal(out[0].spotIds[0], 's0');
  assert.equal(new Set(out[0].spotIds).size, 40);
});

test('duplicate template ids are skipped', () => {
  const out = lib.normalizeAudienceTemplates([
    { id: 'a', audience: 'family', name: '一' },
    { id: 'a', audience: 'college', name: '二' },
    { id: 'b', audience: 'business', name: '三' },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].name, '一');
  assert.equal(out[1].name, '三');
});

test('caps at 20 templates', () => {
  const src = [];
  for (let i = 0; i < 25; i++) src.push({ id: 't' + i, audience: 'family', name: 'n' + i });
  assert.equal(lib.normalizeAudienceTemplates(src).length, 20);
});

test('pace and needCar fall back to safe enums', () => {
  const out = lib.normalizeAudienceTemplates([
    { audience: 'family', pace: 'crazy', needCar: 'maybe' },
    { audience: 'family', pace: 'light', needCar: 'yes' },
    { audience: 'family', pace: 'full', needCar: 'no' },
  ]);
  assert.equal(out[0].pace, 'balanced');
  assert.equal(out[0].needCar, 'auto');
  assert.equal(out[1].pace, 'light');
  assert.equal(out[1].needCar, 'yes');
  assert.equal(out[2].pace, 'full');
  assert.equal(out[2].needCar, 'no');
});

test('enabled defaults true; explicit false is kept', () => {
  const out = lib.normalizeAudienceTemplates([
    { audience: 'family' },
    { audience: 'family', enabled: false },
  ]);
  assert.equal(out[0].enabled, true);
  assert.equal(out[1].enabled, false);
});

test('sortOrder orders the list', () => {
  const out = lib.normalizeAudienceTemplates([
    { id: 'b', audience: 'family', sortOrder: 5, name: '后' },
    { id: 'a', audience: 'family', sortOrder: 1, name: '前' },
  ]);
  assert.equal(out[0].id, 'a');
  assert.equal(out[1].id, 'b');
});

test('description and name are length-capped', () => {
  const long = '名'.repeat(80);
  const desc = '说'.repeat(300);
  const out = lib.normalizeAudienceTemplates([{ audience: 'family', name: long, description: desc }]);
  assert.equal(out[0].name.length, 40);
  assert.equal(out[0].description.length, 240);
});

test('validate rejects custom crowd without a real name', () => {
  const r1 = lib.validateAudienceTemplates([{ audience: 'custom', name: '', audienceLabel: '' }]);
  assert.equal(r1.ok, false);
  assert.ok(r1.errors.some((e) => e.field === 'audienceLabel'));

  const r2 = lib.validateAudienceTemplates([{ audience: 'custom', name: '自定义', audienceLabel: '自定义' }]);
  assert.equal(r2.ok, false);
  assert.ok(r2.errors.some((e) => e.field === 'audienceLabel'));
});

test('validate accepts custom crowd with audienceLabel', () => {
  const r = lib.validateAudienceTemplates([
    { audience: 'custom', audienceLabel: '银发团', name: '半日线', spotIds: ['p1'], enabled: true },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.items[0].audienceLabel, '银发团');
  assert.equal(r.items[0].name, '半日线');
});

test('validate: custom name can default from audienceLabel', () => {
  const r = lib.validateAudienceTemplates([
    { audience: 'custom', audienceLabel: '冬令营', spotIds: ['p1'] },
  ]);
  assert.equal(r.ok, true);
  assert.equal(r.items[0].name, '冬令营');
});

test('validate rejects enabled template with no spots', () => {
  const r = lib.validateAudienceTemplates([{ audience: 'family', enabled: true, spotIds: [] }]);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.field === 'spotIds'));
});

test('validate allows disabled draft with no spots', () => {
  const r = lib.validateAudienceTemplates([{ audience: 'family', enabled: false, spotIds: [] }]);
  assert.equal(r.ok, true);
});

test('validate rejects more than 20 items', () => {
  const src = [];
  for (let i = 0; i < 21; i++) src.push({ id: 't' + i, audience: 'family', spotIds: ['s'], enabled: false });
  const r = lib.validateAudienceTemplates(src);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.field === 'items'));
});

test('validate rejects duplicate ids', () => {
  const r = lib.validateAudienceTemplates([
    { id: 'x', audience: 'family', spotIds: ['a'] },
    { id: 'x', audience: 'college', spotIds: ['b'] },
  ]);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.field === 'id'));
});

test('publicAudienceTemplates only returns enabled plans', () => {
  const out = lib.publicAudienceTemplates([
    { audience: 'family', enabled: true, name: 'A', spotIds: ['1'] },
    { audience: 'college', enabled: false, name: 'B', spotIds: ['2'] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, 'A');
});

test('displayAudienceLabel uses preset or custom label, never a bare 自定义 if a name exists', () => {
  assert.equal(lib.displayAudienceLabel({ audience: 'family' }), '亲子');
  assert.equal(lib.displayAudienceLabel({ audience: 'college' }), '高校');
  assert.equal(lib.displayAudienceLabel({ audience: 'business' }), '商务');
  assert.equal(lib.displayAudienceLabel({ audience: 'custom', audienceLabel: '银发团' }), '银发团');
  assert.equal(lib.displayAudienceLabel({ audience: 'custom', name: '冬令营' }), '冬令营');
  assert.equal(lib.displayAudienceLabel({ audience: 'custom' }), '自定义');
  assert.equal(lib.displayAudienceLabel(null), '自定义');
});

test('missing id is generated stably by index', () => {
  const out = lib.normalizeAudienceTemplates([{ audience: 'family' }, { audience: 'college' }]);
  assert.equal(out[0].id, 'tpl_0');
  assert.equal(out[1].id, 'tpl_1');
});

test('whitespace-only custom label is rejected', () => {
  const r = lib.validateAudienceTemplates([
    { audience: 'custom', audienceLabel: '   ', name: '   ', spotIds: ['a'] },
  ]);
  assert.equal(r.ok, false);
});
