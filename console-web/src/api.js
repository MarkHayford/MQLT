export const KEY = "mqlt_console_token"
export const USER_KEY = "mqlt_console_user"
export const AREA_KEY = "mqlt_console_area"
export const TABS_KEY = "mqlt_console_tabs"
export const SIDE_KEY = "mqlt_console_side"

export function unwrap(json) {
  if (json && json.data != null) return json.data
  return json
}

export function token() {
  return localStorage.getItem(KEY) || ""
}

export function authHeaders() {
  return {
    Authorization: "Bearer " + token(),
    "Content-Type": "application/json",
  }
}

let _onUnauthorized = null
let _handlingUnauthorized = false

export function setUnauthorizedHandler(fn) {
  _onUnauthorized = typeof fn === "function" ? fn : null
}

function clearSessionKeys() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(AREA_KEY)
    sessionStorage.removeItem(TABS_KEY)
  } catch (_err) {}
}

export function handleUnauthorized() {
  if (_handlingUnauthorized) return
  _handlingUnauthorized = true
  try {
    if (typeof _onUnauthorized === "function") {
      _onUnauthorized()
    } else {
      clearSessionKeys()
    }
  } finally {
    setTimeout(() => {
      _handlingUnauthorized = false
    }, 50)
  }
}

function requestUrl(input) {
  if (typeof input === "string") return input
  if (input && typeof input.url === "string") return input.url
  try {
    return String(input)
  } catch (_err) {
    return ""
  }
}

function isApiV1Url(url) {
  const u = String(url || "")
  return u.indexOf("/api/v1/") >= 0
}

function isLoginUrl(url) {
  const u = String(url || "")
  return u.indexOf("/api/v1/console/auth/login") >= 0
}

/** Permission-style 401s that must NOT force logout (token still valid). */
function isPermissionOnly401(message) {
  const msg = String(message || "")
  return /没有运维权限|未绑定企业|职位没有/.test(msg)
}

async function shouldForceLogout(res) {
  if (!res || res.status !== 401) return false
  let msg = ""
  try {
    const j = await res.clone().json()
    msg = String((j && (j.message || j.msg)) || "")
  } catch (_err) {}
  if (isPermissionOnly401(msg)) return false
  return true
}

/**
 * Authenticated fetch helper. Attaches Bearer token when missing,
 * and on session-expiry 401 clears session / returns to login.
 */
export async function apiFetch(input, init) {
  const url = requestUrl(input)
  const opts = Object.assign({}, init || {})
  const headers = new Headers(opts.headers || {})
  if (!isLoginUrl(url) && !headers.has("Authorization")) {
    const t = token()
    if (t) headers.set("Authorization", "Bearer " + t)
  }
  if (!headers.has("Content-Type") && opts.body && typeof opts.body === "string") {
    headers.set("Content-Type", "application/json")
  }
  opts.headers = headers
  const res = await fetch(input, opts)
  if (!isLoginUrl(url) && (await shouldForceLogout(res))) {
    handleUnauthorized()
  }
  return res
}

/**
 * Thin global patch: wrap window.fetch for /api/v1/* (except login)
 * so existing modules keep calling fetch() but still redirect on auth expiry.
 */
export function installFetchInterceptor() {
  if (typeof window === "undefined" || window.__mqltFetchPatched) return
  const raw = window.fetch.bind(window)
  window.fetch = async function mqltPatchedFetch(input, init) {
    const url = requestUrl(input)
    if (!isApiV1Url(url) || isLoginUrl(url)) {
      return raw(input, init)
    }
    const res = await raw(input, init)
    if (await shouldForceLogout(res)) {
      handleUnauthorized()
    }
    return res
  }
  window.__mqltFetchPatched = true
}
