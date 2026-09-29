import { ref, computed } from "vue"

export function useSession(s) {
        const view = ref("login")
        const area = ref("")
        const active = ref("overview")
        const pageUnderEdit = ref("")
        const loading = ref(false)
        const phone = ref("")
        const password = ref("")
        const account = ref(null)
        const opsEnt = ref(null)
        const opsProj = ref(null)
        const isMerchant = computed(() => area.value === "merchant")
        const inEntWorkspace = computed(() => {
          if (area.value === "merchant") return true
          return !!(opsEnt.value && opsEnt.value.id)
        })
        const inProjWorkspace = computed(() => inEntWorkspace.value && !!(opsProj.value && opsProj.value.id))
        const scopeEid = computed(() => {
          if (area.value === "merchant") return String((account.value && account.value.enterpriseId) || "")
          return String((opsEnt.value && opsEnt.value.id) || "")
        })
        const scopePid = computed(() => String((opsProj.value && opsProj.value.id) || ""))
        const accountHasPerm = (perms, code) => {
          const list = perms || []
          if (!list.length) return false
          if (list.indexOf(code) >= 0) return true
          // parent module key implies all children already expanded server-side; keep direct match only
          return false
        }
        const merchantCan = (key) => {
          if (area.value !== "merchant") return true
          const perms = (account.value && account.value.merchantPermissions) || []
          if (!perms.length) return true
          const need = s.ENT_PAGE_PERMS[key]
          if (!need || !need.length) return true
          return need.some((p) => accountHasPerm(perms, p))
        }
        const currentProjectAccess = computed(() => {
          const a = account.value || {}
          const pid = String((opsProj.value && opsProj.value.id) || "")
          const list = Array.isArray(a.projectAccess) ? a.projectAccess : []
          if (!pid) return null
          return list.find((x) => String(x.projectId) === pid) || null
        })
        const projectCapList = computed(() => {
          const hit = currentProjectAccess.value
          const caps = (hit && Array.isArray(hit.capabilities)) ? hit.capabilities : []
          // enterprise owner / broad study.manage still unlocks project panels
          const perms = (account.value && account.value.merchantPermissions) || []
          const merged = caps.slice()
          const map = {
            "study.manage": ["project.live","project.live.read","project.live.write","project.bookings","project.checkin","project.cert","project.mall","project.resources","project.edit","project.owners"],
            "orders.bookings": ["project.bookings","project.checkin"],
            "orders.manage": ["project.bookings","project.checkin","project.live","project.live.read","project.live.write"],
            "mall.manage": ["project.mall"],
            "study.projects": ["project.edit"]
          }
          Object.keys(map).forEach((k) => {
            if (perms.indexOf(k) >= 0) map[k].forEach((c) => { if (merged.indexOf(c) < 0) merged.push(c) })
          })
          return merged
        })
        const projectCan = (cap) => {
          if (area.value !== "merchant") return true
          const need = String(cap || "")
          if (!need) return true
          const list = projectCapList.value || []
          if (!list.length) {
            // no project-affair binding: fall back to enterprise merchantCan via page keys
            return true
          }
          return list.indexOf(need) >= 0
        }
        const projectPageLocked = (key) => {
          if (area.value !== "merchant" || !inProjWorkspace.value) return false
          const need = s.PROJ_AFFAIR_PAGE_CAPS[key]
          if (!need || !need.length) return false
          // if user has any of the affair caps OR enterprise merchantCan, unlock
          if (need.some((c) => projectCan(c))) return false
          if (merchantCan(key)) return false
          return true
        }
        const projectPageHidden = (key) => {
          // 企业对接人: hide write-heavy panels when only empty caps and no merchant page perm
          if (area.value !== "merchant" || !inProjWorkspace.value) return false
          const hit = currentProjectAccess.value
          if (!hit) return false
          if (String(hit.role || "") !== "企业对接人") return false
          const writeKeys = ["proj-edit", "proj-live", "bookings", "mall", "mall-orders"]
          return writeKeys.indexOf(key) >= 0
        }
        const mpCan = (key) => {
          const a = account.value
          if (!a || !a.mpAccess) return false
          if (String(a.mpRole || "") === "SUPER_ADMIN") return true
          const perms = a.adminPermissions || []
          if (!perms.length) return true
          const need = s.MP_PAGE_PERMS[key]
          if (!need || !need.length) return true
          return need.some((p) => accountHasPerm(perms, p))
        }
        const filterMenuTree = (list, gateFn) => {
          const rows = list || []
          const gate = gateFn || (() => true)
          const out = []
          for (let i = 0; i < rows.length; i++) {
            const item = rows[i]
            if (item.children && item.children.length) {
              const kids = item.children.filter((c) => gate(c.key))
              if (kids.length) out.push(Object.assign({}, item, { children: kids }))
            } else if (gate(item.key)) out.push(item)
          }
          return out
        }
        const canAccessManage = computed(() => {
          const a = account.value
          if (!a || !a.mpAccess) return false
          if (String(a.mpRole || "") === "SUPER_ADMIN") return true
          const p = a.adminPermissions || []
          return p.indexOf("access.manage") >= 0
        })
        const menus = computed(() => {
          if (!inEntWorkspace.value) {
            return filterMenuTree(s.MP_MENUS, mpCan)
          }
          if (inProjWorkspace.value) {
            if (area.value !== "merchant") return s.PROJ_MENUS
            return filterMenuTree(s.PROJ_MENUS, (key) => !projectPageHidden(key) && (merchantCan(key) || !projectPageLocked(key) || key === "personal" || key === "proj-home"))
          }
          const list = area.value === "merchant" ? s.ENT_MENUS.filter((m) => !m.opsOnly) : s.ENT_MENUS
          return area.value === "merchant" ? filterMenuTree(list, merchantCan) : list
        })
        const areaLabel = computed(() => {
          if (inProjWorkspace.value) return (opsProj.value && opsProj.value.title) || "研学项目"
          if (inEntWorkspace.value) return (opsEnt.value && (opsEnt.value.shortName || opsEnt.value.name)) || (account.value && account.value.enterpriseName) || "入驻企业"
          return "运维管理"
        })
        const showPage = (key) => {
          if (active.value !== key) return false
          if (key === "personal") return true
          if (key === "ent-archive") return area.value === "mp" && inEntWorkspace.value
          if (s.ENT_PAGE_KEYS.indexOf(key) >= 0) return inEntWorkspace.value
          return area.value === "mp"
        }
        const scopeQs = (qs) => {
          const id = scopeEid.value
          if (id) qs.set("enterpriseId", id)
          const pid = scopePid.value
          if (pid) qs.set("projectId", pid)
          return qs
        }
        const enterEntWorkspace = (row) => {
          if (!row || !row.id) return
          if (area.value === "mp" && !canAllEnterprises.value && mpEnterpriseIds.value.indexOf(String(row.id)) < 0) {
            ElementPlus.ElMessage.warning("当前职位不能进入该企业")
            return
          }
          opsEnt.value = { id: row.id, name: row.name || "", shortName: row.shortName || row.name || "", publisherDisplayName: row.publisherDisplayName || "" }
          opsProj.value = null
          seedTabs("home")
          if (area.value === "mp") s.openEnt(row)
          s.loadEntDicts()
        }
        const leaveEntWorkspace = () => {
          opsEnt.value = null
          opsProj.value = null
          seedTabs("enterprises")
        }
        const merchantProjectIds = computed(() => {
          if (area.value !== "merchant") return []
          const list = (account.value && account.value.merchantProjectIds) || []
          return Array.isArray(list) ? list.map((x) => String(x)) : []
        })
        const mpEnterpriseIds = computed(() => {
          if (area.value !== "mp") return []
          const list = (account.value && account.value.mpEnterpriseIds) || []
          return Array.isArray(list) ? list.map((x) => String(x)) : []
        })
        const mpProjectIds = computed(() => {
          if (area.value !== "mp") return []
          const list = (account.value && account.value.mpProjectIds) || []
          return Array.isArray(list) ? list.map((x) => String(x)) : []
        })
        const canAllEnterprises = computed(() => !mpEnterpriseIds.value.length)
        const canAllProjects = computed(() => {
          if (area.value === "merchant") return !merchantProjectIds.value.length
          if (area.value === "mp") return !mpProjectIds.value.length
          return true
        })
        const enterProjWorkspace = (row, startPage) => {
          if (!row || !row.id) return
          const allowed = area.value === "merchant" ? merchantProjectIds.value : (area.value === "mp" ? mpProjectIds.value : [])
          if (!canAllProjects.value && allowed.indexOf(String(row.id)) < 0) {
            ElementPlus.ElMessage.warning("当前职位不能进入该项目")
            return
          }
          opsProj.value = { id: row.id, title: row.title || "研学项目", status: row.status || "", enrolled: row.enrolled, maxCapacity: row.maxCapacity, price: row.price }
          s.noticeProjectId.value = row.id
          s.bkProjectId.value = row.id
          s.mallProjectFilter.value = String(row.id)
          seedTabs(startPage || "proj-home")
        }
        const leaveProjWorkspace = () => {
          opsProj.value = null
          s.noticeProjectId.value = ""
          s.bkProjectId.value = ""
          s.mallProjectFilter.value = "all"
          seedTabs("projects")
        }
        const sideIcon = (key) => {
          const k = String(key || "")
          if (k.indexOf("posts-") === 0) return s.SIDE_ICONS.posts || s.SIDE_ICONS.overview
          if (k.indexOf("staff-") === 0) return s.SIDE_ICONS.staff || s.SIDE_ICONS.users
          if (k === "proj-home") return s.SIDE_ICONS.home || s.SIDE_ICONS.projects
          if (k === "proj-live") return s.SIDE_ICONS.bookings || s.SIDE_ICONS.projects
          if (k === "proj-edit") return s.SIDE_ICONS.settings || s.SIDE_ICONS.projects
          if (k === "study-group" || k === "project-submit" || k === "project-review") return s.SIDE_ICONS.projects || s.SIDE_ICONS.overview
          if (k === "mp-staff" || k.indexOf("mp-") === 0) return s.SIDE_ICONS.staff || s.SIDE_ICONS.users
          if (k === "ent-money" || k === "finance-withdraw") return s.SIDE_ICONS.finance || s.SIDE_ICONS.overview
          return s.SIDE_ICONS[k] || s.SIDE_ICONS.overview
        }
        const sideCollapsed = ref(localStorage.getItem(s.SIDE_KEY) === "1")
        const title = computed(() => pageLabelOf(active.value) || areaLabel.value)
        const sideOpen = ref({ money: false, fleet: false, media: false, staff: false, "ent-money": false, "study-group": false, "mp-staff": false })
        const groupHasActive = (item) => {
          const kids = (item && item.children) || []
          return kids.some((c) => c.key === active.value)
        }
        const toggleSideGroup = (key) => {
          const next = Object.assign({}, sideOpen.value)
          next[key] = !next[key]
          sideOpen.value = next
        }
        const shellSideWidth = ref(s.readStoredPx(s.SHELL_SIDE_W_KEY, 232, 180, 360))
        const pageTabs = ref([])
        const tabDragFrom = ref(-1)
        const pageLabelOf = (key) => {
          const trees = [inProjWorkspace.value ? s.PROJ_MENUS : (inEntWorkspace.value ? s.ENT_MENUS : s.MP_MENUS), s.PROJ_MENUS, s.ENT_MENUS, s.MP_MENUS]
          for (let t = 0; t < trees.length; t++) {
            const rows = trees[t] || []
            for (let i = 0; i < rows.length; i++) {
              if (rows[i].key === key) return rows[i].label
              const kids = rows[i].children || []
              for (let j = 0; j < kids.length; j++) {
                if (kids[j].key === key) return rows[i].label + "-" + kids[j].label
              }
            }
          }
          return key
        }
        const persistTabs = () => {
          try {
            sessionStorage.setItem(s.TABS_KEY, JSON.stringify({
              area: area.value,
              tabs: pageTabs.value.map((t) => t.key),
              active: active.value,
              entId: opsEnt.value && opsEnt.value.id,
              entName: opsEnt.value && (opsEnt.value.shortName || opsEnt.value.name),
              projId: opsProj.value && opsProj.value.id,
              projTitle: opsProj.value && opsProj.value.title
            }))
          } catch (_err) {}
        }
        const seedTabs = (key) => {
          const k = key || (inEntWorkspace.value ? "home" : "overview")
          pageTabs.value = [{ key: k, label: pageLabelOf(k) }]
          active.value = k
          persistTabs()
        }
        const loadSavedTabs = () => {
          try {
            const raw = sessionStorage.getItem(s.TABS_KEY)
            if (!raw) return false
            const data = JSON.parse(raw)
            if (!data || data.area !== area.value || !Array.isArray(data.tabs) || !data.tabs.length) return false
            if (data.entId) opsEnt.value = { id: data.entId, name: data.entName || "", shortName: data.entName || "" }
            else if (area.value !== "merchant") opsEnt.value = null
            if (data.projId) {
              opsProj.value = { id: data.projId, title: data.projTitle || "研学项目" }
              s.noticeProjectId.value = data.projId
              s.bkProjectId.value = data.projId
              s.mallProjectFilter.value = String(data.projId)
            } else opsProj.value = null
            const tree = inProjWorkspace.value ? s.PROJ_MENUS : (inEntWorkspace.value ? s.ENT_MENUS : s.MP_MENUS)
            const allowed = new Set(s.flattenMenus(tree).map((m) => m.key))
            const tabs = []
            for (let i = 0; i < data.tabs.length; i++) {
              let k = String(data.tabs[i] || "")
              if (k === "posts") k = "posts-overview"
              if (k === "staff") k = "staff-roles"
              if (k === "mp-staff") k = "mp-roles"
              if (allowed.has(k) && !tabs.some((t) => t.key === k)) tabs.push({ key: k, label: pageLabelOf(k) })
            }
            if (!tabs.length) return false
            pageTabs.value = tabs
            if (data.active && tabs.some((t) => t.key === data.active)) active.value = data.active
            else active.value = tabs[0].key
            return true
          } catch (_err) {
            return false
          }
        }
        const openPage = (key) => {
          if (!key) return
          if (key === "staff") key = "staff-roles"
          if (key === "mp-staff") key = "mp-roles"
          if (key === "proj-edit" && active.value !== "proj-edit") pageUnderEdit.value = active.value || (inProjWorkspace.value ? "proj-home" : "projects")
          if (!pageTabs.value.some((t) => t.key === key)) {
            pageTabs.value = pageTabs.value.concat([{ key, label: pageLabelOf(key) }])
          }
          active.value = key
          persistTabs()
        }
        const onTabDragStart = (index, ev) => {
          tabDragFrom.value = index
          if (ev.dataTransfer) {
            ev.dataTransfer.effectAllowed = "move"
            try { ev.dataTransfer.setData("text/plain", String(index)) } catch (_err) {}
          }
        }
        const onTabDragOver = (ev) => {
          ev.preventDefault()
          if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move"
        }
        const onTabDrop = (index, ev) => {
          ev.preventDefault()
          const from = tabDragFrom.value
          tabDragFrom.value = -1
          if (from < 0 || from === index) return
          const list = pageTabs.value.slice()
          const item = list.splice(from, 1)[0]
          list.splice(index, 0, item)
          pageTabs.value = list
          persistTabs()
        }
        const enterArea = (next) => {
          area.value = next
          localStorage.setItem(s.AREA_KEY, next)
          view.value = "app"
          if (next === "mp") { opsEnt.value = null; opsProj.value = null }
          if (next === "merchant" && account.value && account.value.enterpriseId) {
            opsEnt.value = { id: account.value.enterpriseId, name: account.value.enterpriseName || "", shortName: account.value.enterpriseName || "" }
          }
          if (!loadSavedTabs()) seedTabs(next === "merchant" ? "home" : "overview")
        }
        const applyDefaultLanding = async (a) => {
          const land = a && a.defaultLanding
          if (!land || land.area !== "merchant" || !land.projectId) return false
          if (!(a.merchantAccess)) return false
          try {
            if (account.value && account.value.enterpriseId) {
              opsEnt.value = { id: account.value.enterpriseId, name: account.value.enterpriseName || "", shortName: account.value.enterpriseName || "" }
            }
            const qs = new URLSearchParams()
            qs.set("page", "1")
            qs.set("pageSize", "50")
            if (account.value && account.value.enterpriseId) qs.set("enterpriseId", String(account.value.enterpriseId))
            const res = await fetch("/api/v1/admin/study-projects?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            const items = s.unwrapPaged(json).items || []
            s.projList.value = items
            const hit = items.find((p) => String(p.id) === String(land.projectId))
            if (hit) {
              enterProjWorkspace(hit, land.page || "proj-home")
              return true
            }
            // still enter with minimal row
            enterProjWorkspace({ id: String(land.projectId), title: "研学项目" }, land.page || "proj-home")
            return true
          } catch (_err) {
            return false
          }
        }
        const routeAfterLogin = async (a) => {
          const both = a.mpAccess && a.merchantAccess
          if (both) {
            view.value = "gate"
            return
          }
          if (a.mpAccess) enterArea("mp")
          else if (a.merchantAccess) {
            enterArea("merchant")
            await applyDefaultLanding(a)
          }
          else throw new Error("当前账号没有管理权限")
        }
        const restore = async () => {
          const tok = localStorage.getItem(s.KEY)
          const raw = localStorage.getItem(s.USER_KEY)
          if (!tok || !raw) return
          let cached = null
          try {
            cached = JSON.parse(raw)
          } catch (e) {
            logout()
            return
          }
          if (!cached || (!cached.mpAccess && !cached.merchantAccess)) {
            logout()
            return
          }
          try {
            const res = await fetch("/api/v1/console/auth/me", {
              headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }
            })
            if (!res.ok) {
              // fetch interceptor also clears session on auth 401; ensure login view
              logout()
              return
            }
            const json = await res.json()
            const fresh = s.unwrap(json) || cached
            account.value = fresh
            try { localStorage.setItem(s.USER_KEY, JSON.stringify(fresh)) } catch (_err) {}
            await routeAfterLogin(fresh)
          } catch (e) {
            logout()
          }
        }
        const login = async () => {
          const mobile = String(phone.value || "").replace(/[^0-9]/g, "")
          phone.value = mobile
          if (!/^1[0-9]{10}$/.test(mobile)) {
            ElementPlus.ElMessage.warning("请输入11位手机号")
            return
          }
          if (password.value.length < 6) {
            ElementPlus.ElMessage.warning("请输入密码")
            return
          }
          loading.value = true
          try {
            const res = await fetch("/api/v1/console/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone: phone.value, password: password.value })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || json.msg || "登录失败")
            const data = s.unwrap(json)
            const a = data.account || {}
            if (!a.mpAccess && !a.merchantAccess) throw new Error("当前账号没有管理权限")
            localStorage.setItem(s.KEY, data.accessToken || "")
            localStorage.setItem(s.USER_KEY, JSON.stringify(a))
            account.value = a
            await routeAfterLogin(a)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "登录失败")
          } finally {
            loading.value = false
          }
        }
        const logout = () => {
          localStorage.removeItem(s.KEY)
          localStorage.removeItem(s.USER_KEY)
          localStorage.removeItem(s.AREA_KEY)
          try { sessionStorage.removeItem(s.TABS_KEY) } catch (_err) {}
          pageTabs.value = []
          account.value = null
          password.value = ""
          area.value = ""
          view.value = "login"
        }
        if (typeof s.setUnauthorizedHandler === "function") {
          s.setUnauthorizedHandler(() => { logout() })
        }
  Object.assign(s, {
    view,
    area,
    active,
    pageUnderEdit,
    loading,
    phone,
    password,
    account,
    opsEnt,
    opsProj,
    isMerchant,
    inEntWorkspace,
    inProjWorkspace,
    scopeEid,
    scopePid,
    accountHasPerm,
    merchantCan,
    currentProjectAccess,
    projectCapList,
    projectCan,
    projectPageLocked,
    projectPageHidden,
    mpCan,
    filterMenuTree,
    canAccessManage,
    menus,
    areaLabel,
    showPage,
    scopeQs,
    enterEntWorkspace,
    leaveEntWorkspace,
    merchantProjectIds,
    mpEnterpriseIds,
    mpProjectIds,
    canAllEnterprises,
    canAllProjects,
    enterProjWorkspace,
    leaveProjWorkspace,
    sideIcon,
    sideCollapsed,
    title,
    sideOpen,
    groupHasActive,
    toggleSideGroup,
    shellSideWidth,
    pageTabs,
    tabDragFrom,
    pageLabelOf,
    persistTabs,
    seedTabs,
    loadSavedTabs,
    openPage,
    onTabDragStart,
    onTabDragOver,
    onTabDrop,
    enterArea,
    applyDefaultLanding,
    routeAfterLogin,
    restore,
    login,
    logout
  })
}
