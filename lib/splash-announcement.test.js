'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const lib = require('./splash-announcement');

test('empty / junk normalizes to disabled draft', () => {
  const a = lib.normalizeSplashAnnouncement(null);
  assert.equal(a.enabled, false);
  assert.equal(a.closable, true);
  assert.equal(a.title, '');
  assert.deepEqual(a.images, []);
  const b = lib.normalizeSplashAnnouncement('x');
  assert.equal(b.enabled, false);
});

test('enabled requires title', () => {
  const r = lib.validateSplashAnnouncement({ enabled: true, title: '  ', html: '<p>hi</p>' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.field === 'title'));
});

test('enabled requires some content', () => {
  const r = lib.validateSplashAnnouncement({ enabled: true, title: '维护' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.field === 'html'));
});

test('enabled with image only is ok', () => {
  const r = lib.validateSplashAnnouncement({
    enabled: true,
    title: '维护',
    images: [{ url: 'http://127.0.0.1:8080/a.jpg' }],
  });
  assert.equal(r.ok, true);
});

test('strips script and javascript handlers from html', () => {
  const a = lib.normalizeSplashAnnouncement({
    html: '<p>ok</p><script>alert(1)</script><img src="x" onerror="alert(1)">',
  });
  assert.equal(a.html.indexOf('<script'), -1);
  assert.equal(a.html.indexOf('onerror'), -1);
  assert.ok(a.html.indexOf('<p>ok</p>') >= 0);
});

test('file lists de-dupe and drop empty urls', () => {
  const a = lib.normalizeSplashAnnouncement({
    images: [{ url: 'https://a/1.jpg' }, { url: 'https://a/1.jpg' }, { url: '' }, 'nope'],
    videos: [{ imageUrl: 'https://a/v.mp4', name: '介绍' }],
  });
  assert.equal(a.images.length, 1);
  assert.equal(a.videos.length, 1);
  assert.equal(a.videos[0].url, 'https://a/v.mp4');
  assert.equal(a.videos[0].name, '介绍');
});

test('closable defaults true; explicit false kept', () => {
  assert.equal(lib.normalizeSplashAnnouncement({}).closable, true);
  assert.equal(lib.normalizeSplashAnnouncement({ closable: false }).closable, false);
});

test('public view hides body when disabled', () => {
  const p = lib.publicSplashAnnouncement({
    enabled: false,
    title: 'secret',
    html: '<p>nope</p>',
    version: 3,
  });
  assert.equal(p.enabled, false);
  assert.equal(p.title, '');
  assert.equal(p.html, '');
  assert.equal(p.version, 3);
});

test('public view returns full payload when enabled', () => {
  const p = lib.publicSplashAnnouncement({
    enabled: true,
    title: '升级',
    html: '<p>今晚</p>',
    closable: false,
    version: 2,
  });
  assert.equal(p.enabled, true);
  assert.equal(p.title, '升级');
  assert.equal(p.closable, false);
});

test('title is capped', () => {
  const a = lib.normalizeSplashAnnouncement({ title: '标'.repeat(80) });
  assert.equal(a.title.length, 40);
});

test('disabled draft with empty content is valid', () => {
  const r = lib.validateSplashAnnouncement({ enabled: false });
  assert.equal(r.ok, true);
});
