(function (root) {
  var API_DEFAULT = 'http://127.0.0.1:3000/api/v1';
  function parseQuery() {
    var out = {};
    var loc = root.location;
    var s = String((loc && loc.search) || '').replace(/^\?/, '');
    var parts = s.split('&');
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var kv = parts[i].split('=');
      var k = decodeURIComponent(kv[0] || '');
      var v = decodeURIComponent(kv.slice(1).join('=') || '');
      if (k) out[k] = v;
    }
    return out;
  }
  function unwrap(json) {
    if (json && typeof json === 'object' && json.data != null && (json.code === 200 || json.code === 0)) return json.data;
    return json;
  }
  function postMini(data) {
    try {
      if (root.wx && wx.miniProgram && typeof wx.miniProgram.postMessage === 'function') {
        wx.miniProgram.postMessage({ data: data });
      }
    } catch (e) {}
  }
  function goBack() {
    try {
      if (root.wx && wx.miniProgram && typeof wx.miniProgram.navigateBack === 'function') {
        setTimeout(function () { wx.miniProgram.navigateBack(); }, 160);
      }
    } catch (e) {}
  }
  var qs = parseQuery();
  var passRaw = qs.passScore;
  var cfg = {
    playToken: qs.playToken || qs.token || '',
    apiBase: String(qs.apiBase || API_DEFAULT).replace(/\/+$/, ''),
    projectId: qs.projectId || '',
    routePointId: qs.routePointId || '',
    stepId: qs.stepId || '',
    passScore: passRaw != null && passRaw !== '' && isFinite(Number(passRaw)) ? Number(passRaw) : null
  };
  function send(result, back) {
    var body = {
      token: cfg.playToken,
      event: result.event || 'complete',
      score: result.score,
      passed: result.passed,
      durationMs: result.durationMs,
      payload: result.payload || {}
    };
    postMini({
      type: 'mqlt-game-complete',
      event: body.event,
      complete: body.event === 'complete' && body.passed !== false,
      score: body.score,
      passed: body.passed,
      durationMs: body.durationMs,
      payload: body.payload
    });
    var p = Promise.resolve(null);
    if (cfg.playToken) {
      p = fetch(cfg.apiBase + '/study/h5/game-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MQLT-Play-Token': cfg.playToken
        },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); }).then(unwrap).catch(function () { return null; });
    }
    if (back) {
      p.then(function () { goBack(); }, function () { goBack(); });
    }
    return p;
  }
  var MQLT = {
    version: '1',
    config: cfg,
    report: function (x) { return send(x || {}, false); },
    progress: function (x) { var d = x || {}; d.event = 'progress'; return send(d, false); },
    complete: function (x) {
      var d = x || {};
      if (d.passed == null) d.passed = true;
      d.event = 'complete';
      return send(d, true);
    },
    fail: function (x) { var d = x || {}; d.passed = false; d.event = 'fail'; return send(d, false); },
    retry: function () { try { root.location.reload(); } catch (e) {} }
  };
  root.MQLT = MQLT;
  root.mqltGameComplete = function (score, extra) {
    var d = { event: 'complete', passed: true };
    if (score != null && typeof score === 'object') d = score;
    else if (score != null) {
      d.score = score;
      d.payload = extra || {};
    }
    return MQLT.complete(d);
  };
})(typeof window !== 'undefined' ? window : this);
