import { ref, computed, nextTick } from "vue"

export function useProjects(s) {
        const projSel = ref([])
        const spotNames = (day) => {
          const spots = (day && day.spots) || []
          if (!spots.length) return "未选点位"
          return spots.map((s) => s.title || s.id).join("、")
        }
        const ROUTE_SPOTS = computed(() => (s.routeSpotCatalog.value || []).map((s) => ({ id: s.id, title: s.title })))
        const projectTitle = (b) => {
          if (!b) return "研学项目"
          if (b.project && b.project.title) return b.project.title
          if (b.projectTitle) return b.projectTitle
          return "研学项目"
        }
        const emptyProjForm = () => ({
          title: "", subtitle: "", category: "", price: "0", status: "可预约",
          maxCapacity: 30, bookableDays: 7, enrolled: 0, location: "", locationLatitude: null, locationLongitude: null,
          enterpriseId: "",
          contactPhone: "",
          mediaColors: [], tags: []
        })
        const projKeyword = ref("")
        const projStatus = ref("all")
        const projPage = ref(1)
        const projTotal = ref(0)
        const projStats = ref({ total: 0, open: 0, full: 0, live: 0, ended: 0, closed: 0, pending: 0, rejected: 0 })
        const projList = ref([])
        const projLoading = ref(false)
        const projSaving = ref(false)
        const projOpen = ref(false)
        const projCreating = ref(false)
        const projSelected = ref(null)
        const projForm = ref(emptyProjForm())
        const projEditPanel = ref("basic")
        const projContacts = ref([])
        const projContactsSaving = ref(false)
        const projStaffOptions = ref([])
        const emptyProjContact = () => ({ id: "", userId: "", name: "", phone: "", wechat: "", role: "现场负责人", visibleToStudents: true, sort: 0, capabilities: s.CONTACT_ROLE_DEFAULT_CAPS["现场负责人"].slice() })
        const loadProjStaffOptions = async () => {
          const eid = String(s.scopeEid.value || (projSelected.value && projSelected.value.enterpriseId) || (s.account.value && s.account.value.enterpriseId) || "")
          if (!eid) { projStaffOptions.value = []; return }
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(eid) + "/staff", { headers: s.authHeaders() })
            const json = await res.json()
            const data = s.unwrap(json) || json
            projStaffOptions.value = (data && data.items) || []
          } catch (_err) { projStaffOptions.value = [] }
        }
        const loadProjContacts = async (pid) => {
          const id = String(pid || (projSelected.value && projSelected.value.id) || (s.opsProj.value && s.opsProj.value.id) || "")
          if (!id) { projContacts.value = []; return }
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(id) + "/contacts", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载负责人失败")
            const data = s.unwrap(json) || json
            projContacts.value = Array.isArray(data.contacts) ? data.contacts.slice() : []
            if (data.contactPhone != null && projForm.value) projForm.value.contactPhone = data.contactPhone || projForm.value.contactPhone || ""
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "加载负责人失败")
            projContacts.value = []
          }
        }
        const addProjContact = () => {
          const row = emptyProjContact()
          row.sort = (projContacts.value || []).length
          projContacts.value = (projContacts.value || []).concat([row])
        }
        const removeProjContact = (idx) => {
          const list = (projContacts.value || []).slice()
          list.splice(idx, 1)
          projContacts.value = list
        }
        const onPickContactStaff = (idx, accountId) => {
          const list = (projContacts.value || []).slice()
          const row = Object.assign({}, list[idx] || emptyProjContact())
          row.userId = String(accountId || "")
          const hit = (projStaffOptions.value || []).find((s) => String(s.id) === row.userId)
          if (hit) {
            if (!row.name) row.name = hit.name || hit.phone || ""
            if (!row.phone) row.phone = hit.phone || ""
          }
          const caps = s.CONTACT_ROLE_DEFAULT_CAPS[row.role] || []
          row.capabilities = caps.slice()
          list[idx] = row
          projContacts.value = list
        }
        const onContactRoleChange = (idx, role) => {
          const list = (projContacts.value || []).slice()
          const row = Object.assign({}, list[idx] || emptyProjContact())
          row.role = role
          row.capabilities = (s.CONTACT_ROLE_DEFAULT_CAPS[role] || []).slice()
          list[idx] = row
          projContacts.value = list
        }
        const moveProjContact = (idx, dir) => {
          const list = (projContacts.value || []).slice()
          const j = idx + dir
          if (j < 0 || j >= list.length) return
          const tmp = list[idx]; list[idx] = list[j]; list[j] = tmp
          list.forEach((r, i) => { r.sort = i })
          projContacts.value = list
        }
        const projCertTemplates = ref([])
        const projCertActiveId = ref("")
        const projCertForm = ref({ id: "", name: "默认模板", title: "结业证书", bodyHtml: "", bgUrl: "", sealUrl: "", enabled: true, setActive: true })
        const projCertLoading = ref(false)
        const projCertSaving = ref(false)
        const projTourMall = ref({ enabled: true, enterBeforeGrad: true, redeemAfterGrad: true, openOnApptDay24h: true, title: "导览积分商城", hint: "结业前可浏览，集齐拼图结业后可用总积分兑换", skus: [] })
        const projTourMallLoading = ref(false)
        const projTourMallSaving = ref(false)
        const projAudienceTemplates = ref([])
        const projAudienceLoading = ref(false)
        const projAudienceSaving = ref(false)
        const projPuzzleSource = ref({ sourceImageUrl: "", title: "", subtitle: "", enabledSpotCount: 0, splitHint: "" })
        const projPuzzleSaving = ref(false)
        const projEnterprises = ref([])
        const projBound = ref([])
        const projAllProducts = ref([])
        const projExpandId = ref("")
        const projNoticeOpen = ref(false)
        const projShopOpen = ref(false)
        const projShopKeyword = ref("")
        const projStatusLabel = (s) => s || "—"
        const loadProjects = async () => {
          projLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (projKeyword.value.trim()) qs.set("keyword", projKeyword.value.trim())
            if (projStatus.value && projStatus.value !== "all") qs.set("status", projStatus.value)
            if (s.active.value === "project-submit" || s.active.value === "project-review") qs.set("review", "pending")
            qs.set("page", String(projPage.value || 1))
            qs.set("pageSize", "20")
            s.scopeQs(qs)
            const res = await fetch("/api/v1/admin/study-projects?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "项目加载失败")
            const paged = s.unwrapPaged(json)
            projList.value = paged.items
            projTotal.value = paged.total
            const stats = (s.unwrap(json) && s.unwrap(json).stats) || {}
            projStats.value = {
              total: Number(stats.total != null ? stats.total : paged.total),
              open: Number(stats.open || 0),
              full: Number(stats.full || 0),
              live: Number(stats.live || 0),
              ended: Number(stats.ended || 0),
              closed: Number(stats.closed || 0),
              pending: Number(stats.pending || 0),
              rejected: Number(stats.rejected || 0)
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "项目加载失败")
            projList.value = []
          } finally {
            projLoading.value = false
          }
        }
        const fillProjForm = (p) => {
          // Live fields only — post-approval edits apply immediately (no pendingRevision draft overlay).
          const src = p || {}
          projForm.value = {
            title: (src && src.title) || "",
            subtitle: (src && src.subtitle) || "",
            category: (src && src.category) || "",
            price: src && src.price != null ? String(src.price) : "0",
            status: (src && src.status) || "可预约",
            maxCapacity: Number((src && src.maxCapacity) || 30),
            bookableDays: Math.max(1, Math.min(365, Number((src && src.bookableDays) != null ? src.bookableDays : 7) || 7)),
            enrolled: Number((src && src.enrolled) || 0),
            location: (src && src.location) || "",
            locationLatitude: src && src.locationLatitude != null ? Number(src.locationLatitude) : (src && src.departureLatitude != null ? Number(src.departureLatitude) : null),
            locationLongitude: src && src.locationLongitude != null ? Number(src.locationLongitude) : (src && src.departureLongitude != null ? Number(src.departureLongitude) : null),
            enterpriseId: (src && src.enterpriseId) || "",
            contactPhone: (src && src.contactPhone) || "",
            mediaColors: Array.isArray(src && src.mediaColors) ? src.mediaColors.slice() : [],
            tags: Array.isArray(src && src.tags) ? src.tags.slice() : []
          }
        }
        const projSaveLabel = computed(() => {
          if (projCreating.value) return (s.isMerchant.value || s.inEntWorkspace.value) ? "提交上架" : "创建项目"
          const st = String((projSelected.value && projSelected.value.status) || "")
          const needsFirstReview = (s.isMerchant.value || s.inEntWorkspace.value) && (st === "待审批" || st === "已驳回")
          if (needsFirstReview) return st === "已驳回" ? "修改并重新提交" : "保存并提交审批"
          return "保存"
        })
        const projReviewKindLabel = (p) => {
          if (!p) return ""
          if (p.reviewKind === "update") return (p.pendingRevision && p.pendingRevision.rejected) ? "修改已驳回" : "修改待审"
          return p.status || ""
        }
        const closeProj = () => {
          const back = (s.pageUnderEdit.value && s.pageUnderEdit.value !== "proj-edit") ? s.pageUnderEdit.value : (s.inProjWorkspace.value ? "proj-home" : "projects")
          s.pageUnderEdit.value = ""
          projEditPanel.value = "basic"
          projOpen.value = false
          projCreating.value = false
          s.openPage(back)
        }
        const toggleProjRow = (row) => {
          projExpandId.value = projExpandId.value === row.id ? "" : row.id
        }
        const hydrateProj = async (row) => {
          projSelected.value = row
          fillProjForm(row)
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
            const json = await res.json()
            if (res.ok) {
              const p = s.unwrap(json)
              projSelected.value = p
              fillProjForm(p)
            }
          } catch (_err) {}
        }
        const loadRouteCatalog = async (projectId) => {
          if (!projectId) {
            s.routeSpotCatalog.value = []
            return
          }
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(projectId) + "/route-points", { headers: s.authHeaders() })
            const json = await res.json()
            s.routeSpotCatalog.value = res.ok ? (s.unwrap(json) || []) : []
          } catch (_err) {
            s.routeSpotCatalog.value = []
          }
        }
        const loadProjRoutes = async (projectId) => {
          if (!projectId) {
            projRoutePoints.value = []
            return
          }
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(projectId) + "/route-points", { headers: s.authHeaders() })
            const json = await res.json()
            projRoutePoints.value = res.ok ? (s.unwrap(json) || []) : []
          } catch (_err) {
            projRoutePoints.value = []
          }
        }
        const escapeSpotHtml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        const isSpotHtml = (s) => {
          const t = String(s || "").trim()
          if (t.indexOf("<p") >= 0 || t.indexOf("<div") >= 0 || t.indexOf("<ul") >= 0) return true
          if (t.indexOf("<img") >= 0 || t.indexOf("<strong") >= 0 || t.indexOf("<span") >= 0) return true
          return false
        }
        const wrapSpotPlain = (s) => {
          const t = String(s || "").trim()
          if (!t) return "<p></p>"
          if (isSpotHtml(t)) return t
          return "<p>" + escapeSpotHtml(t).replace(/\n/g, "<br>") + "</p>"
        }
        const wrapSpotLines = (lines) => {
          const list = Array.isArray(lines) ? lines : []
          if (!list.length) return "<p></p>"
          return "<ul>" + list.map((l) => "<li>" + escapeSpotHtml(l) + "</li>").join("") + "</ul>"
        }
        const ROUTE_SEC_DEFS = [
          { key: "intro", title: "区域介绍" },
          { key: "guide", title: "讲解内容" },
          { key: "game", title: "互动游戏" },
          { key: "gift", title: "研学礼品" },
          { key: "audience", title: "适合人群" }
        ]
        const defaultSpotSections = () => ROUTE_SEC_DEFS.map((d) => ({ key: d.key, title: d.title, html: "<p></p>" }))
        const headingStart = (html, title) => {
          const needle = ">" + title + "<"
          const i = html.indexOf(needle)
          if (i < 0) return -1
          let start = i
          while (start > 0 && html.charAt(start) !== "<") start--
          if (start > 0) {
            let p = start - 1
            while (p > 0 && html.charAt(p) !== "<") p--
            if (html.slice(p, p + 2).toLowerCase() === "<p") start = p
          }
          return start
        }
        const headingEnd = (html, start, title) => {
          const i = html.indexOf(title, start)
          if (i < 0) return start
          const from = i + title.length
          const strongEnd = html.indexOf("</strong>", from)
          const bEnd = html.indexOf("</b>", from)
          let inner = from
          if (strongEnd >= 0 && (bEnd < 0 || strongEnd <= bEnd)) inner = strongEnd + 9
          else if (bEnd >= 0) inner = bEnd + 4
          const pEnd = html.indexOf("</p>", inner)
          if (pEnd >= 0 && pEnd - inner <= 10) return pEnd + 4
          return inner
        }
        const splitSpotHtml = (html) => {
          const t = String(html || "")
          const found = []
          for (let i = 0; i < ROUTE_SEC_DEFS.length; i++) {
            const d = ROUTE_SEC_DEFS[i]
            const s = headingStart(t, d.title)
            if (s < 0) continue
            found.push({ key: d.key, title: d.title, start: s, end: headingEnd(t, s, d.title) })
          }
          if (!found.length) return []
          found.sort((a, b) => a.start - b.start)
          const out = []
          if (found[0].start > 0) {
            const before = t.slice(0, found[0].start).trim()
            if (before && found[0].key !== "intro") out.push({ key: "intro", title: "区域介绍", html: before })
          }
          for (let i = 0; i < found.length; i++) {
            const bodyEnd = i + 1 < found.length ? found[i + 1].start : t.length
            out.push({ key: found[i].key, title: found[i].title, html: t.slice(found[i].end, bodyEnd).trim() || "<p></p>" })
          }
          return out
        }
        const padSpotSections = (list, row) => {
          const rows = Array.isArray(list) ? list : []
          const has = rows.length > 0
          const fallback = {
            intro: has ? "<p></p>" : wrapSpotPlain((row && (row.intro || row.description)) || ""),
            guide: wrapSpotLines((row && row.guideLines) || []),
            game: wrapSpotLines((row && row.gameLines) || []),
            gift: wrapSpotLines((row && row.gifts) || []),
            audience: wrapSpotPlain((row && row.audience) || "")
          }
          const byKey = {}
          const extras = []
          for (let i = 0; i < rows.length; i++) {
            const item = rows[i]
            if (ROUTE_SEC_DEFS.some((d) => d.key === item.key)) byKey[item.key] = item
            else extras.push(item)
          }
          return ROUTE_SEC_DEFS.map((d) => byKey[d.key] || { key: d.key, title: d.title, html: fallback[d.key] || "<p></p>" }).concat(extras)
        }
        const sectionsFromRow = (row) => {
          const src = (row && Array.isArray(row.sections)) ? row.sections : []
          let list = src.map((item, i) => ({
            key: item.key || ("sec" + i),
            title: item.title || ("段落" + (i + 1)),
            html: item.html || item.body || "<p></p>"
          }))
          if (list.length <= 1) {
            const html = (list[0] && list[0].html) || (row && (row.intro || row.description)) || ""
            const split = splitSpotHtml(html)
            if (split.length) list = split
          }
          return padSpotSections(list, row)
        }
        const spotHtmlHasBody = (html) => {
          const t = String(html || "")
          if (t.indexOf("<img") >= 0) return true
          const plain = t.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
          return plain.length > 0
        }
        const spotEditorKey = ref(0)
        const spotEditorFocus = ref(-1)
        const spotPreviewTick = ref(0)
        const spotFormTab = ref("info")
        const spotZoneOpen = ref(false)
        const spotVideoUploading = ref(false)
        const spotUploadHint = ref("")
        const spotGateQrLoading = ref(false)
        const spotGateQrHint = ref("")
        const spotGateQrSerial = ref("")
        const afterSpotFormReady = () => {
          if (spotFormTab.value === "gate") ensureStationReward()
          nextTick(() => {
            if (spotFormTab.value === "story") hydrateSpotEditors()
            if (spotFormTab.value === "map") setTimeout(initProjSpotMap, 180)
            if (spotFormTab.value === "gate") { ensureStationReward(); loadSpotGateQr(); loadProjectResources() }
          })
        }
        const setSpotFormTab = (tab) => {
          if (spotFormTab.value === "story") readSpotEditorsToModel()
          if (tab !== "map") destroyProjSpotMap()
          if (tab === "gate") ensureStationReward()
          spotFormTab.value = tab
          afterSpotFormReady()
        }
        const normalizeSpotQuiz = (raw) => {
          const list = Array.isArray(raw) ? raw : []
          return list.map((q) => normalizeResourceQuizQuestion(q))
        }
        const normalizeResourceQuizQuestion = (q) => {
          let opts = Array.isArray(q && q.options) ? q.options.map((x) => String(x || "")) : ["", "", "", ""]
          opts = opts.filter((x, i) => x || i < 2)
          while (opts.length < 2) opts.push("")
          if (opts.length > 12) opts = opts.slice(0, 12)
          const multiSelect = !!(q && (q.multiSelect === true || q.multi === true))
          let answerIndexes = []
          if (Array.isArray(q && q.answerIndexes) && q.answerIndexes.length) {
            answerIndexes = q.answerIndexes.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 0 && n < opts.length)
          } else {
            const ai = Number.isFinite(Number(q && q.answerIndex)) ? Number(q.answerIndex) : 0
            answerIndexes = [Math.max(0, Math.min(opts.length - 1, ai))]
          }
          if (!answerIndexes.length) answerIndexes = [0]
          if (!multiSelect) answerIndexes = [answerIndexes[0]]
          let partialMode = String((q && (q.partialMode || q.partialScoreMode)) || "none")
          if (partialMode === "half") partialMode = "fixed"
          if (["none", "ratio", "fixed"].indexOf(partialMode) < 0) partialMode = "none"
          const row = {
            id: (q && q.id) ? String(q.id) : "",
            question: String((q && q.question) || ""),
            options: opts,
            multiSelect,
            answerIndexes,
            answerIndex: answerIndexes[0],
            partialMode
          }
          if (q && q.halfScore != null && q.halfScore !== "") row.halfScore = Number(q.halfScore)
          if (q && q.points != null && q.points !== "") row.points = Number(q.points)
          return row
        }
        const normalizeScoreTiersForm = (raw) => {
          const list = Array.isArray(raw) ? raw : []
          return list.map((t) => ({
            minScore: Number((t && t.minScore) || 0),
            points: Number((t && t.points) || 0),
            title: String((t && t.title) || "")
          }))
        }
        const addSpotQuiz = () => {
          const f = projSpotForm.value
          if (!f) return
          const list = (f.knowledgeQuestions || []).slice()
          list.push({ question: "", options: ["", "", "", ""], answerIndex: 0 })
          f.knowledgeQuestions = list
        }
        const removeSpotQuiz = (i) => {
          const f = projSpotForm.value
          if (!f) return
          const list = (f.knowledgeQuestions || []).slice()
          list.splice(i, 1)
          f.knowledgeQuestions = list
        }
        const renderSpotGateQr = (raw) => {
          const el = document.getElementById("spot-gate-qr-box")
          if (!el) return ""
          el.innerHTML = ""
          if (!window.QRCode) return ""
          new QRCode(el, {
            text: raw,
            width: 180,
            height: 180,
            colorDark: "#1A1A1A",
            colorLight: "#FFFFFF",
            correctLevel: QRCode.CorrectLevel.M
          })
          const canvas = el.querySelector("canvas")
          if (canvas && canvas.toDataURL) return canvas.toDataURL("image/png")
          const img = el.querySelector("img")
          return img && img.src ? img.src : ""
        }
        const loadSpotGateQr = async (notify) => {
          const p = projSelected.value
          const f = projSpotForm.value
          if (!p || !f || !f.id) return
          spotGateQrLoading.value = true
          spotGateQrHint.value = "正在生成研学码…"
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/route-points/" + encodeURIComponent(f.id) + "/check-in-code", { headers: { Authorization: "Bearer " + s.token() } })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "研学码加载失败")
            const data = s.unwrap(json) || {}
            const raw = data.raw || (data.payload ? JSON.stringify(data.payload) : "")
            if (!raw) throw new Error("未返回研学码数据")
            await nextTick()
            let url = renderSpotGateQr(raw)
            if (!url) {
              await new Promise((resolve) => setTimeout(resolve, 200))
              url = renderSpotGateQr(raw)
            }
            if (projSpotForm.value && projSpotForm.value.id === f.id) {
              projSpotForm.value.gateQrRaw = raw
              projSpotForm.value.gateQrUrl = url
            }
            spotGateQrSerial.value = data.serial || (data.payload && data.payload.nonce ? String(data.payload.nonce).slice(-6).toUpperCase() : "")
            spotGateQrHint.value = url ? "" : "二维码组件未加载"
            if (notify === true) ElementPlus.ElMessage.success("研学码已刷新")
          } catch (err) {
            spotGateQrHint.value = (err && err.message) || "研学码生成失败"
            if (notify === true) ElementPlus.ElMessage.error(spotGateQrHint.value)
          } finally {
            spotGateQrLoading.value = false
          }
        }
        const refreshSpotGateQr = async () => {
          const p = projSelected.value
          const f = projSpotForm.value
          if (!p || !f || !f.id) return
          const ok = await ElementPlus.ElMessageBox.confirm("更换后旧码立即失效，已打印的研学码不能再用。确定更换？", "更换研学码", { confirmButtonText: "更换", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          spotGateQrLoading.value = true
          spotGateQrHint.value = "正在更换研学码…"
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/route-points/" + encodeURIComponent(f.id) + "/check-in-code/rotate", { method: "POST", headers: { Authorization: "Bearer " + s.token() } })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "更换失败")
            const data = s.unwrap(json) || {}
            const raw = data.raw || (data.payload ? JSON.stringify(data.payload) : "")
            if (!raw) throw new Error("未返回研学码数据")
            await nextTick()
            let url = renderSpotGateQr(raw)
            if (!url) {
              await new Promise((resolve) => setTimeout(resolve, 200))
              url = renderSpotGateQr(raw)
            }
            if (projSpotForm.value && projSpotForm.value.id === f.id) {
              projSpotForm.value.gateQrRaw = raw
              projSpotForm.value.gateQrUrl = url
            }
            spotGateQrSerial.value = data.serial || ""
            spotGateQrHint.value = url ? "" : "二维码组件未加载"
            ElementPlus.ElMessage.success("已更换，校验号 " + (spotGateQrSerial.value || "已更新") + "，旧码失效")
          } catch (err) {
            spotGateQrHint.value = (err && err.message) || "更换失败"
            ElementPlus.ElMessage.error(spotGateQrHint.value)
          } finally {
            spotGateQrLoading.value = false
          }
        }
        const uploadSpotVideo = async (option) => {
          const file = option && option.file
          if (!file || !projSpotForm.value) return
          spotVideoUploading.value = true
          spotUploadHint.value = "准备上传…"
          try {
            const ready = await s.preparePlayableUpload(file, (p, msg) => { spotUploadHint.value = msg || ("处理中 " + Math.round(p * 100) + "%") })
            spotUploadHint.value = "正在上传…"
            const fd = new FormData()
            fd.append("file", ready)
            const res = await fetch("/api/v1/admin/study-projects/videos", {
              method: "POST",
              headers: { Authorization: "Bearer " + s.token() },
              body: fd
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "视频上传失败")
            const data = s.unwrap(json) || {}
            const url = data.videoUrl || data.imageUrl || ""
            if (!url) throw new Error("未返回视频地址")
            projSpotForm.value.knowledgeVideoUrl = url
            if (!projSpotForm.value.knowledgeVideoTitle) projSpotForm.value.knowledgeVideoTitle = "本站讲解"
            ElementPlus.ElMessage.success("视频已上传，保存点位后生效")
            if (option.onSuccess) option.onSuccess(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "视频上传失败")
            if (option.onError) option.onError(err)
          } finally {
            spotVideoUploading.value = false
            spotUploadHint.value = ""
          }
        }
        const newStationStep = (type) => {
          const titles = { video: "讲解视频", quiz: "趣味答题", task: "现场任务", game: "研学小游戏" }
          return {
            id: "s" + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
            type,
            title: titles[type] || "研学内容",
            videoUrl: "",
            questions: type === "quiz" ? [normalizeResourceQuizQuestion({ question: "", options: ["", "", "", ""], answerIndex: 0 })] : [],
            taskBody: "",
            gameUrl: "",
            gameName: "",
            passScore: null,
            resourceId: "",
            skippable: true,
            points: 10,
            maxRetries: null,
            scoreTiers: type === "game" ? [{ minScore: 60, points: 10, title: "及格" }, { minScore: 80, points: 20, title: "优秀" }] : []
          }
        }
        const hydrateStationSteps = (row) => {
          const raw = Array.isArray(row && row.stationSteps) ? row.stationSteps : []
          if (raw.length) {
            return raw.map((s) => ({
              id: String((s && s.id) || ("s" + Math.random().toString(16).slice(2))),
              type: String((s && s.type) || "task"),
              title: String((s && s.title) || ""),
              videoUrl: String((s && s.videoUrl) || ""),
              questions: normalizeSpotQuiz(s && s.questions),
              taskBody: String((s && (s.taskBody || s.body)) || ""),
              gameUrl: String((s && s.gameUrl) || ""),
              gameName: String((s && s.gameName) || ""),
              passScore: (s && s.passScore != null && s.passScore !== "") ? Number(s.passScore) : null,
              resourceId: String((s && s.resourceId) || ""),
              skippable: s && s.skippable === false ? false : true,
              points: Number((s && s.points) || 0),
              maxRetries: (s && s.maxRetries != null && s.maxRetries !== "") ? Number(s.maxRetries) : null,
              scoreTiers: normalizeScoreTiersForm(s && s.scoreTiers)
            }))
          }
          const list = []
          if (row && row.knowledgeVideoUrl) {
            list.push({ id: "legacy_video", type: "video", title: row.knowledgeVideoTitle || "讲解视频", videoUrl: row.knowledgeVideoUrl, questions: [], taskBody: "", gameUrl: "", gameName: "", passScore: null })
          }
          const qs = normalizeSpotQuiz(row && row.knowledgeQuestions)
          if (qs.some((q) => q.question)) {
            list.push({ id: "legacy_quiz", type: "quiz", title: "趣味答题", videoUrl: "", questions: qs, taskBody: "", gameUrl: "", gameName: "", passScore: null })
          }
          if (row && row.offlineTaskBody) {
            list.push({ id: "legacy_task", type: "task", title: row.offlineTaskTitle || "现场趣味任务", videoUrl: "", questions: [], taskBody: row.offlineTaskBody, gameUrl: "", gameName: "", passScore: null })
          }
          return list
        }
        const ensureStationReward = () => {
          const f = projSpotForm.value
          if (!f) return
          if (!f.stationReward) f.stationReward = { enabled: false, maxCoupons: 1, expireDays: 30, tiers: [] }
          if (!Array.isArray(f.stationReward.tiers)) f.stationReward.tiers = []
        }
        const addRewardTier = () => {
          ensureStationReward()
          const f = projSpotForm.value
          f.stationReward.tiers = (f.stationReward.tiers || []).concat([{ minPoints: 0, title: "", productId: "", grade: "bronze" }])
        }
        const removeRewardTier = (i) => {
          const f = projSpotForm.value
          if (!f || !f.stationReward) return
          const list = (f.stationReward.tiers || []).slice()
          list.splice(i, 1)
          f.stationReward.tiers = list
        }
        const addStationStep = (type) => {
          const f = projSpotForm.value
          if (!f) return
          f.stationSteps = (f.stationSteps || []).concat([newStationStep(type)])
        }
        const removeStationStep = (i) => {
          const f = projSpotForm.value
          if (!f) return
          const list = (f.stationSteps || []).slice()
          list.splice(i, 1)
          f.stationSteps = list
        }
        const moveStationStep = (i, dir) => {
          const f = projSpotForm.value
          if (!f) return
          const list = (f.stationSteps || []).slice()
          const j = i + dir
          if (j < 0 || j >= list.length) return
          const tmp = list[i]
          list[i] = list[j]
          list[j] = tmp
          f.stationSteps = list
        }
        const ROUTE_RAIL_W_KEY = "mqlt-route-rail-width"
        const STUDIO_NAV_W_KEY = "mqlt-studio-nav-width"
        const STUDIO_PREVIEW_W_KEY = "mqlt-studio-preview-width"
        const CERT_LIST_W_KEY = "mqlt-cert-list-width"
        const CERT_PREVIEW_W_KEY = "mqlt-cert-preview-width"
        const ROUTE_PREVIEW_W_KEY = "mqlt-route-preview-width"
        const studioNavWidth = ref(s.readStoredPx(STUDIO_NAV_W_KEY, 220, 160, 320))
        const studioPreviewWidth = ref(s.readStoredPx(STUDIO_PREVIEW_W_KEY, 400, 300, 560))
        const certListWidth = ref(s.readStoredPx(CERT_LIST_W_KEY, 200, 160, 300))
        const certPreviewWidth = ref(s.readStoredPx(CERT_PREVIEW_W_KEY, 300, 240, 440))
        const addStepQuiz = (si) => {
          const f = projSpotForm.value
          if (!f || !f.stationSteps || !f.stationSteps[si]) return
          const list = f.stationSteps.slice()
          const step = Object.assign({}, list[si])
          step.questions = (step.questions || []).concat([{ question: "", options: ["", "", "", ""], answerIndex: 0 }])
          list[si] = step
          f.stationSteps = list
        }
        const removeStepQuiz = (si, qi) => {
          const f = projSpotForm.value
          if (!f || !f.stationSteps || !f.stationSteps[si]) return
          const list = f.stationSteps.slice()
          const step = Object.assign({}, list[si])
          const qs = (step.questions || []).slice()
          qs.splice(qi, 1)
          step.questions = qs
          list[si] = step
          f.stationSteps = list
        }
        const uploadStepVideo = async (option, index) => {
          const file = option && option.file
          const f = projSpotForm.value
          if (!file || !f || !f.stationSteps || !f.stationSteps[index]) return
          spotVideoUploading.value = true
          spotUploadHint.value = "准备上传…"
          try {
            const ready = await s.preparePlayableUpload(file, (p, msg) => { spotUploadHint.value = msg || ("处理中 " + Math.round(p * 100) + "%") })
            spotUploadHint.value = "正在上传…"
            const fd = new FormData()
            fd.append("file", ready)
            const res = await fetch("/api/v1/admin/study-projects/videos", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "视频上传失败")
            const url = (s.unwrap(json) || {}).videoUrl || (s.unwrap(json) || {}).imageUrl || ""
            if (!url) throw new Error("未返回视频地址")
            const list = f.stationSteps.slice()
            list[index] = Object.assign({}, list[index], { videoUrl: url })
            f.stationSteps = list
            ElementPlus.ElMessage.success("视频已上传")
            if (option.onSuccess) option.onSuccess(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "视频上传失败")
            if (option.onError) option.onError(err)
          } finally {
            spotVideoUploading.value = false
            spotUploadHint.value = ""
          }
        }
        const uploadStepGame = async (option, index) => {
          const file = option && option.file
          const f = projSpotForm.value
          if (!file || !f || !f.stationSteps || !f.stationSteps[index]) return
          if (file.size > EDGE_UPLOAD_MAX) {
            ElementPlus.ElMessage.warning("小游戏不能超过 800MB")
            return
          }
          spotVideoUploading.value = true
          spotUploadHint.value = "正在上传小游戏…"
          try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/v1/admin/study-projects/games", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "小游戏上传失败")
            const url = (s.unwrap(json) || {}).gameUrl || (s.unwrap(json) || {}).imageUrl || ""
            if (!url) throw new Error("未返回小游戏地址")
            const list = f.stationSteps.slice()
            list[index] = Object.assign({}, list[index], { gameUrl: url, gameName: (s.unwrap(json) || {}).title || list[index].gameName })
            f.stationSteps = list
            ElementPlus.ElMessage.success("小游戏已上传")
            loadStudyGames()
            if (option.onSuccess) option.onSuccess(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "小游戏上传失败")
            if (option.onError) option.onError(err)
          } finally {
            spotVideoUploading.value = false
            spotUploadHint.value = ""
          }
        }
        const copyH5GameGuide = async () => {
          try {
            await navigator.clipboard.writeText(s.H5_GAME_GUIDE)
            ElementPlus.ElMessage.success("已复制 H5 接入规则")
          } catch (_e) {
            ElementPlus.ElMessage.warning("请手动复制控制台里的接入说明")
          }
        }
        const projectResources = ref([])
        const projResourceTab = ref("video")
        const resourceTypes = [
          { key: "video", name: "视频讲解", mark: "视", hint: "上传小程序可播的视频或音频", action: "上传文件" },
          { key: "quiz", name: "趣味题库", mark: "题", hint: "题目、选项和正确答案", action: "出题" },
          { key: "game", name: "H5 小游戏", mark: "游", hint: "上传 HTML，通关后回传分数", action: "上传游戏" },
          { key: "task", name: "现场任务", mark: "任", hint: "线下趣味任务怎么做、怎么确认", action: "写任务" }
        ]
        const projResourceSel = ref([])
        const projResourceForm = ref(null)
        const projResourceLoading = ref(false)
        const projResourceSaving = ref(false)
        const projResourceUploading = ref(false)
        const projResourceHint = ref("")
        const projectResourcesOf = (type) => (projectResources.value || []).filter((r) => r.type === type)
        const resourceTypeOf = (type) => resourceTypes.find((t) => t.key === type) || resourceTypes[0]
        const resourceTimeOf = (v) => {
          if (!v) return ""
          const d = new Date(v)
          return Number.isFinite(d.getTime()) ? s.prettyDate(d) : ""
        }
        const loadProjectResources = async () => {
          const p = projSelected.value
          if (!p || !p.id) { projectResources.value = []; return }
          projResourceLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/resources", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "读取研学资源失败")
            const data = s.unwrap(json) || {}
            projectResources.value = Array.isArray(data.items) ? data.items : []
          } catch (err) {
            projectResources.value = []
            ElementPlus.ElMessage.warning(err.message || "读取研学资源失败")
          } finally {
            projResourceLoading.value = false
          }
        }
        const applyStepResource = (index, resourceId) => {
          const f = projSpotForm.value
          if (!f || !f.stationSteps || !f.stationSteps[index]) return
          const list = f.stationSteps.slice()
          const defaults = { video: "讲解视频", quiz: "趣味答题", task: "现场任务", game: "研学小游戏" }
          const step = Object.assign({}, list[index], { resourceId: resourceId || "" })
          if (!resourceId) {
            step.videoUrl = ""
            step.gameUrl = ""
            step.gameName = ""
            step.taskBody = ""
            step.questions = step.type === "quiz" ? [] : (step.questions || [])
          } else {
            const r = (projectResources.value || []).find((x) => x.id === resourceId)
            if (r) {
              if (!step.title || step.title === defaults[step.type]) step.title = r.title || step.title
              if (r.videoUrl) step.videoUrl = r.videoUrl
              if (r.gameUrl) { step.gameUrl = r.gameUrl; step.gameName = r.title || step.gameName }
              if (r.taskBody) step.taskBody = r.taskBody
              if (r.questions && r.questions.length) step.questions = r.questions.map((q) => normalizeResourceQuizQuestion(q))
              if (step.type === "game") {
                if (r.maxRetries !== undefined) step.maxRetries = r.maxRetries
                if (r.skippable !== undefined) step.skippable = r.skippable !== false
                if (Array.isArray(r.scoreTiers)) step.scoreTiers = normalizeScoreTiersForm(r.scoreTiers)
              }
            }
          }
          list[index] = step
          f.stationSteps = list
        }
        const toggleProjectResourceSel = (id, on) => {
          const cur = projResourceSel.value.slice()
          const i = cur.indexOf(id)
          if (on && i < 0) cur.push(id)
          if (!on && i >= 0) cur.splice(i, 1)
          projResourceSel.value = cur
        }
        const startNewProjectResource = () => {
          const type = projResourceTab.value
          projResourceForm.value = {
            id: "",
            type,
            title: type === "quiz" ? "题库" : (type === "game" ? "研学小游戏" : "现场任务"),
            taskBody: "",
            questions: type === "quiz" ? [normalizeResourceQuizQuestion({ question: "", options: ["", "", "", ""], answerIndex: 0 })] : [],
            maxRetries: null,
            retriesUnlimited: true,
            skippable: true,
            scoreTiers: type === "game" ? [{ minScore: 60, points: 10, title: "及格" }, { minScore: 80, points: 20, title: "优秀" }] : []
          }
        }
        const editProjectResource = (row) => {
          const unlimited = row.maxRetries == null || row.maxRetries === "" || Number(row.maxRetries) <= 0
          projResourceForm.value = {
            id: row.id,
            type: row.type,
            title: row.title || "",
            taskBody: row.taskBody || "",
            questions: (row.questions && row.questions.length)
              ? row.questions.map((q) => normalizeResourceQuizQuestion(q))
              : (row.type === "quiz" ? [normalizeResourceQuizQuestion({ question: "", options: ["", "", "", ""], answerIndex: 0 })] : []),
            maxRetries: unlimited ? null : Number(row.maxRetries),
            retriesUnlimited: unlimited,
            skippable: row.skippable === false ? false : true,
            scoreTiers: normalizeScoreTiersForm(row.scoreTiers && row.scoreTiers.length ? row.scoreTiers : [{ minScore: 60, points: 10, title: "及格" }])
          }
        }
        const closeResourceDialog = () => { projResourceForm.value = null }
        const addResourceQuiz = () => {
          if (!projResourceForm.value) return
          projResourceForm.value.questions = (projResourceForm.value.questions || []).concat([normalizeResourceQuizQuestion({ question: "", options: ["", "", "", ""], answerIndex: 0 })])
        }
        const removeResourceQuiz = (qi) => {
          if (!projResourceForm.value) return
          const qs = (projResourceForm.value.questions || []).slice()
          qs.splice(qi, 1)
          projResourceForm.value.questions = qs
        }
        const addResourceQuizOption = (qi) => {
          const f = projResourceForm.value
          if (!f || !f.questions || !f.questions[qi]) return
          const q = Object.assign({}, f.questions[qi])
          const opts = (q.options || []).slice()
          if (opts.length >= 12) { ElementPlus.ElMessage.warning("最多 12 个选项"); return }
          opts.push("")
          q.options = opts
          const list = f.questions.slice()
          list[qi] = q
          f.questions = list
        }
        const removeResourceQuizOption = (qi, oi) => {
          const f = projResourceForm.value
          if (!f || !f.questions || !f.questions[qi]) return
          const q = Object.assign({}, f.questions[qi])
          const opts = (q.options || []).slice()
          if (opts.length <= 2) { ElementPlus.ElMessage.warning("至少保留 2 个选项"); return }
          opts.splice(oi, 1)
          q.options = opts
          q.answerIndexes = (q.answerIndexes || []).filter((n) => n !== oi).map((n) => (n > oi ? n - 1 : n))
          if (!q.answerIndexes.length) q.answerIndexes = [0]
          q.answerIndex = q.answerIndexes[0]
          const list = f.questions.slice()
          list[qi] = q
          f.questions = list
        }
        const toggleResourceAnswer = (qi, oi, on) => {
          const f = projResourceForm.value
          if (!f || !f.questions || !f.questions[qi]) return
          const q = Object.assign({}, f.questions[qi])
          let idxs = Array.isArray(q.answerIndexes) ? q.answerIndexes.slice() : [Number(q.answerIndex || 0)]
          if (q.multiSelect) {
            const i = idxs.indexOf(oi)
            if (on && i < 0) idxs.push(oi)
            if (!on && i >= 0) idxs.splice(i, 1)
            if (!idxs.length) idxs = [oi]
          } else {
            idxs = [oi]
          }
          q.answerIndexes = idxs
          q.answerIndex = idxs[0]
          const list = f.questions.slice()
          list[qi] = q
          f.questions = list
        }
        const addResourceScoreTier = () => {
          const f = projResourceForm.value
          if (!f) return
          f.scoreTiers = (f.scoreTiers || []).concat([{ minScore: 0, points: 5, title: "" }])
        }
        const removeResourceScoreTier = (ti) => {
          const f = projResourceForm.value
          if (!f) return
          const list = (f.scoreTiers || []).slice()
          list.splice(ti, 1)
          f.scoreTiers = list
        }
        const uploadProjectResource = async (option, resourceId) => {
          const p = projSelected.value
          const file = option && option.file
          if (!p || !p.id || !file) return
          const type = projResourceTab.value
          projResourceUploading.value = true
          projResourceHint.value = "正在上传…"
          try {
            let ready = file
            if (type === "video") ready = await s.preparePlayableUpload(file, (pct, msg) => { projResourceHint.value = msg || ("处理中 " + Math.round(pct * 100) + "%") })
            const fd = new FormData()
            fd.append("file", ready)
            fd.append("type", type)
            fd.append("title", String(file.name || "").replace(/\.[^.]+$/, ""))
            if (resourceId) fd.append("resourceId", resourceId)
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/resources/upload", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "上传失败")
            ElementPlus.ElMessage.success(resourceId ? "文件已更新，旧文件已从存储删除" : "已加入本项目资源库")
            await loadProjectResources()
            const saved = s.unwrap(json)
            if (saved && saved.type === "game") editProjectResource(saved)
            if (option.onSuccess) option.onSuccess(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
            if (option.onError) option.onError(err)
          } finally {
            projResourceUploading.value = false
            projResourceHint.value = ""
          }
        }
        const studyGames = ref([])
        const studyGamesLoading = ref(false)
        const loadStudyGames = async () => {
          studyGamesLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/games", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "读取小游戏列表失败")
            const data = s.unwrap(json) || {}
            studyGames.value = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : [])
          } catch (err) {
            studyGames.value = []
            ElementPlus.ElMessage.warning(err.message || "读取小游戏列表失败")
          } finally {
            studyGamesLoading.value = false
          }
        }
        const pickStudyGame = (index, game) => {
          const f = projSpotForm.value
          if (!f || !f.stationSteps || !f.stationSteps[index] || !game) return
          const url = String(game.url || "")
          if (!url) return
          const list = f.stationSteps.slice()
          const prev = list[index]
          if (String(prev.gameUrl || "") === url) {
            list[index] = Object.assign({}, prev, { gameUrl: "", gameName: "" })
            f.stationSteps = list
            ElementPlus.ElMessage.success("已取消选用")
            return
          }
          const cur = Object.assign({}, prev, { gameUrl: url, gameName: game.title || prev.gameName || "" })
          if (!String(cur.title || "").trim() || cur.title === "研学小游戏") cur.title = game.title || cur.title
          list[index] = cur
          f.stationSteps = list
          ElementPlus.ElMessage.success("已选用「" + (game.title || "小游戏") + "」")
        }
        const previewStudyGame = (game) => {
          const url = game && game.url
          if (url) window.open(url, "_blank")
        }
        const fillSpotForm = (row) => {
          projSpotForm.value = {
            id: row.id || "",
            title: row.title || "",
            description: row.desc || row.description || "",
            zoneKey: row.zoneKey || (projZones.value[0] && projZones.value[0].key) || "test",
            durationMin: Number(row.durationMin || 20),
            sections: sectionsFromRow(row),
            coverUrl: row.coverUrl || "",
            latitude: row.latitude != null ? Number(row.latitude) : DEFAULT_LOC.lat,
            longitude: row.longitude != null ? Number(row.longitude) : DEFAULT_LOC.lng,
            enabled: row.enabled !== false,
            knowledgeVideoTitle: row.knowledgeVideoTitle || "",
            knowledgeVideoUrl: row.knowledgeVideoUrl || "",
            knowledgeQuestions: normalizeSpotQuiz(row.knowledgeQuestions),
            stationSteps: hydrateStationSteps(row),
            stationReward: row.stationReward && typeof row.stationReward === "object" ? {
              enabled: !!row.stationReward.enabled,
              maxCoupons: Number(row.stationReward.maxCoupons || 1),
              expireDays: Number(row.stationReward.expireDays || 30),
              tiers: Array.isArray(row.stationReward.tiers) ? row.stationReward.tiers.map((t) => ({
                minPoints: Number((t && t.minPoints) || 0),
                title: String((t && t.title) || ""),
                productId: String((t && t.productId) || ""),
                grade: String((t && t.grade) || "")
              })) : []
            } : { enabled: false, maxCoupons: 1, expireDays: 30, tiers: [] },
            offlineTaskEnabled: row.offlineTaskEnabled !== false,
            offlineTaskTitle: row.offlineTaskTitle || "现场趣味任务",
            offlineTaskBody: row.offlineTaskBody || "按现场工作人员指引完成互动（观察、动手、合影或小游戏）。完成后请扫描本站研学码（点位码）确认本项任务完成。",
            gateQrUrl: "",
            gateQrRaw: ""
          }
          spotEditorKey.value++
          ensureStationReward()
          if (projSpotForm.value && projSpotForm.value.id) loadSpotGateQr()
        }
        const spotEditorNodes = () => document.querySelectorAll(".route-studio .spot-editor")
        const hydrateSpotEditors = () => {
          const f = projSpotForm.value
          if (!f || !Array.isArray(f.sections)) return
          spotEditorNodes().forEach((el) => {
            const i = Number(el.getAttribute("data-sec-index"))
            if (Number.isFinite(i) && f.sections[i]) el.innerHTML = f.sections[i].html || "<p></p>"
          })
        }
        const readSpotEditorsToModel = () => {
          const f = projSpotForm.value
          if (!f || !Array.isArray(f.sections)) return
          spotEditorNodes().forEach((el) => {
            const i = Number(el.getAttribute("data-sec-index"))
            if (Number.isFinite(i) && f.sections[i]) f.sections[i].html = el.innerHTML
          })
          spotPreviewTick.value++
        }
        const onSpotEditorFocus = (i) => { spotEditorFocus.value = i }
        const onSpotSectionInput = (ev) => {
          const el = ev && ev.currentTarget
          const f = projSpotForm.value
          if (!el || !f || !Array.isArray(f.sections)) return
          const i = Number(el.getAttribute("data-sec-index"))
          if (!Number.isFinite(i) || !f.sections[i]) return
          f.sections[i].html = el.innerHTML
          spotPreviewTick.value++
        }
        const spotPreviewSections = computed(() => {
          const _tick = spotPreviewTick.value
          const f = projSpotForm.value
          const list = (f && f.sections) || []
          return list.map((sec) => ({ key: sec.key, title: sec.title, html: sec.html }))
        })
        const addSpotSection = () => {
          const f = projSpotForm.value
          if (!f) return
          readSpotEditorsToModel()
          const list = (f.sections || []).slice()
          list.push({ key: "sec" + Date.now(), title: "新段落", html: "<p></p>" })
          f.sections = list
          spotEditorKey.value++
        }
        const removeSpotSection = (i) => {
          const f = projSpotForm.value
          if (!f) return
          readSpotEditorsToModel()
          const list = (f.sections || []).slice()
          if (list.length <= 1) return
          list.splice(i, 1)
          f.sections = list
          spotEditorKey.value++
        }
        const moveSpotSection = (i, dir) => {
          const f = projSpotForm.value
          if (!f) return
          readSpotEditorsToModel()
          const list = (f.sections || []).slice()
          const j = i + dir
          if (j < 0 || j >= list.length) return
          const tmp = list[i]
          list[i] = list[j]
          list[j] = tmp
          f.sections = list
          spotEditorKey.value++
        }
        const spotPreviewZone = computed(() => {
          const f = projSpotForm.value
          if (!f) return ""
          const hit = (projZones.value || []).find((z) => z.key === f.zoneKey)
          return hit ? hit.label : (f.zoneKey || "")
        })
        const spotPreviewDur = computed(() => {
          const n = Number((projSpotForm.value && projSpotForm.value.durationMin) || 20)
          if (n < 60) return "约 " + n + " 分钟"
          const h = Math.floor(n / 60)
          const r = n - h * 60
          return r ? ("约 " + h + " 小时 " + r + " 分") : ("约 " + h + " 小时")
        })
        const uploadSpotBodyImage = async (option) => {
          try {
            const file = option && option.file
            if (!file) return
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/v1/admin/products/images", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "上传失败")
            const url = (s.unwrap(json) || {}).imageUrl || ""
            if (url) {
              const i = spotEditorFocus.value
              const nodes = spotEditorNodes()
              if (i >= 0 && nodes[i]) nodes[i].focus()
              document.execCommand("insertImage", false, url)
              readSpotEditorsToModel()
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const startNewProjSpot = () => {
          projSpotForm.value = emptySpotForm()
          spotEditorKey.value++
          spotFormTab.value = "info"
          afterSpotFormReady()
        }
        const destroyProjSpotMap = () => {
          if (projSpotMap) {
            try { projSpotMap.remove() } catch (_err) {}
            projSpotMap = null
            projSpotMapMarker = null
          }
        }
        const applySpotLatLng = (lat, lng) => {
          if (!projSpotForm.value) return
          projSpotForm.value.latitude = Math.round(lat * 1000000) / 1000000
          projSpotForm.value.longitude = Math.round(lng * 1000000) / 1000000
          if (projSpotMapMarker) projSpotMapMarker.setLatLng([lat, lng])
        }
        const initProjSpotMap = () => {
          if (!window.L || !projSpotForm.value) return
          const el = document.getElementById("proj-spot-map")
          if (!el) return
          destroyProjSpotMap()
          const lat = Number(projSpotForm.value.latitude)
          const lng = Number(projSpotForm.value.longitude)
          const has = Number.isFinite(lat) && Number.isFinite(lng)
          const center = has ? [lat, lng] : [DEFAULT_LOC.lat, DEFAULT_LOC.lng]
          projSpotMap = L.map(el, { zoomControl: true }).setView(center, 16)
          L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
            subdomains: "1234",
            maxZoom: 18
          }).addTo(projSpotMap)
          projSpotMapMarker = L.marker(center, { draggable: true }).addTo(projSpotMap)
          projSpotMap.on("click", (e) => applySpotLatLng(e.latlng.lat, e.latlng.lng))
          projSpotMapMarker.on("dragend", () => {
            const p = projSpotMapMarker.getLatLng()
            applySpotLatLng(p.lat, p.lng)
          })
          setTimeout(() => { if (projSpotMap) projSpotMap.invalidateSize() }, 180)
        }
        const searchProjSpotMap = async () => {
          const q = String(projSpotMapQuery.value || "").trim()
          if (!q) return
          try {
            const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q), {
              headers: { "Accept-Language": "zh-CN" }
            })
            const list = await res.json()
            if (!list || !list.length) {
              ElementPlus.ElMessage.warning("没有找到该地点")
              return
            }
            const gcj = wgs84ToGcj02(Number(list[0].lat), Number(list[0].lon))
            applySpotLatLng(gcj[0], gcj[1])
            if (projSpotMap) {
              projSpotMap.setView(gcj, 16)
              if (projSpotMapMarker) projSpotMapMarker.setLatLng(gcj)
            }
          } catch (_err) {
            ElementPlus.ElMessage.warning("搜索暂不可用，请在地图上点选")
          }
        }
        const uploadSpotCover = async (option) => {
          const file = option && option.file
          if (!file) return
          const token = localStorage.getItem(s.KEY)
          const fd = new FormData()
          fd.append("file", file)
          const old = String((projSpotForm.value && projSpotForm.value.coverUrl) || "")
          const res = await fetch("/api/v1/admin/products/images" + (old ? ("?oldUrl=" + encodeURIComponent(old)) : ""), { method: "POST", headers: { Authorization: "Bearer " + s.token }, body: fd })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "上传失败")
          const url = (s.unwrap(json) || {}).imageUrl || ""
          if (url && projSpotForm.value) projSpotForm.value.coverUrl = url
        }
        const moveProjSpot = async (row, dir) => {
          const p = projSelected.value
          if (!p || !row) return
          const list = (projRoutePoints.value || []).slice()
          const i = list.findIndex((x) => x.id === row.id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= list.length) return
          const a = list[i]
          const b = list[j]
          const orderA = Number(a.sortOrder || i)
          const orderB = Number(b.sortOrder || j)
          try {
            await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/route-points/" + encodeURIComponent(a.id), {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ sortOrder: orderB })
            })
            await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/route-points/" + encodeURIComponent(b.id), {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ sortOrder: orderA })
            })
            await loadProjRoutes(p.id)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "排序失败")
          }
        }
        const loadProjShop = async (projectId) => {
          if (!s.mallList.value.length) await s.loadMall()
          projAllProducts.value = s.mallList.value || []
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(projectId) + "/products", { headers: s.authHeaders() })
            const json = await res.json()
            projBound.value = res.ok ? (s.unwrap(json) || []).map((x) => x.id) : []
          } catch (_err) { projBound.value = [] }
        }
        const filteredProjShop = computed(() => {
          const q = String(projShopKeyword.value || "").trim()
          const list = projAllProducts.value || []
          if (!q) return list
          return list.filter((p) => ((p.name || "") + " " + (p.sku || "")).indexOf(q) >= 0)
        })
        const defaultCertBodyHtml = () => '<p style="line-height:1.8;font-size:16px;color:#1C384A">兹证明 <b>{{holderName}}</b> 同学已完成「{{projectTitle}}」研学项目全部点位打卡与研学任务，特发此证。</p><p style="margin-top:18px;color:#64748B;font-size:13px">证书编号：{{certificateNo}}<br/>颁发日期：{{issuedAt}}</p>'
        const certPreviewSample = computed(() => {
          const today = s.shanghaiToday()
          return {
            holderName: "张同学",
            projectTitle: (projForm.value && projForm.value.title) || "研学项目",
            certificateNo: "MQLT-PREVIEW-0001",
            issuedAt: s.prettyDay(today) || today,
            summary: "已完成本次研学全部点位打卡与研学任务"
          }
        })
        const certPreviewHtml = computed(() => {
          const f = projCertForm.value || {}
          let html = String(f.bodyHtml || "")
          const s = certPreviewSample.value
          const keys = ["holderName", "projectTitle", "certificateNo", "issuedAt", "summary"]
          for (let i = 0; i < keys.length; i++) {
            html = html.replace(new RegExp("\\{\\{\\s*" + keys[i] + "\\s*\\}\\}", "g"), s[keys[i]] || "")
          }
          html = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=/gi, " data-on=")
          return html
        })
        const certPreviewPaperStyle = computed(() => {
          const bg = (projCertForm.value && projCertForm.value.bgUrl) || ""
          const style = { backgroundColor: "#FFFFFF" }
          if (bg) {
            style.backgroundImage = "url(" + JSON.stringify(bg).slice(1, -1) + ")"
            style.backgroundSize = "cover"
            style.backgroundPosition = "center"
          }
          return style
        })
        const loadProjCertTemplates = async () => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid) return
          projCertLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/cert-templates", { headers: s.authHeaders() })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || "读取证书模板失败")
            projCertTemplates.value = json.items || []
            projCertActiveId.value = json.activeTemplateId || ""
            if (!(projCertForm.value && projCertForm.value.bodyHtml)) projCertForm.value.bodyHtml = defaultCertBodyHtml()
          } catch (err) {
            ElementPlus.ElMessage.warning(err.message || "读取证书模板失败")
          } finally { projCertLoading.value = false }
        }
        const editCertTemplate = (row) => {
          const r = row || {}
          projCertForm.value = {
            id: r.id || "",
            name: r.name || "模板",
            title: r.title || "结业证书",
            bodyHtml: r.bodyHtml || defaultCertBodyHtml(),
            bgUrl: r.bgUrl || "",
            sealUrl: r.sealUrl || "",
            enabled: r.enabled !== false,
            setActive: !!(r.id && r.id === projCertActiveId.value)
          }
        }
        const resetCertForm = () => {
          projCertForm.value = { id: "", name: "默认模板", title: "结业证书", bodyHtml: defaultCertBodyHtml(), bgUrl: "", sealUrl: "", enabled: true, setActive: true }
        }
        const saveCertTemplate = async () => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid) { ElementPlus.ElMessage.warning("请先保存项目"); return }
          const f = projCertForm.value || {}
          if (!String(f.name || "").trim()) { ElementPlus.ElMessage.warning("请填写模板名称"); return }
          projCertSaving.value = true
          try {
            const body = { name: f.name, title: f.title, bodyHtml: f.bodyHtml, bgUrl: f.bgUrl, sealUrl: f.sealUrl, enabled: f.enabled !== false, setActive: !!f.setActive }
            const isUpdate = !!f.id
            const url = isUpdate
              ? ("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/cert-templates/" + encodeURIComponent(f.id))
              : ("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/cert-templates")
            const res = await fetch(url, { method: isUpdate ? "PUT" : "POST", headers: s.authHeaders(), body: JSON.stringify(body) })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || "保存失败")
            projCertTemplates.value = json.items || []
            projCertActiveId.value = json.activeTemplateId || ""
            ElementPlus.ElMessage.success(isUpdate ? "证书模板已更新" : "证书模板已创建")
            if (!isUpdate) resetCertForm()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally { projCertSaving.value = false }
        }
        const deleteCertTemplate = async (row) => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid || !row || !row.id) return
          try {
            await ElementPlus.ElMessageBox.confirm("确定删除该证书模板？", "删除确认", { type: "warning" })
          } catch (_e) { return }
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/cert-templates/" + encodeURIComponent(row.id), { method: "DELETE", headers: s.authHeaders() })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) { ElementPlus.ElMessage.error(json.message || "删除失败"); return }
          projCertTemplates.value = json.items || []
          projCertActiveId.value = json.activeTemplateId || ""
          if (projCertForm.value && projCertForm.value.id === row.id) resetCertForm()
          ElementPlus.ElMessage.success("已删除")
        }
        const uploadCertImage = async (field) => {
          const input = document.createElement("input")
          input.type = "file"
          input.accept = "image/*"
          input.onchange = async () => {
            const file = input.files && input.files[0]
            if (!file) return
            const fd = new FormData()
            fd.append("file", file)
            try {
              const res = await fetch("/api/v1/admin/products/images", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
              const json = await res.json().catch(() => ({}))
              if (!res.ok) throw new Error(json.message || "上传失败")
              const url = json.url || json.publicUrl || json.imageUrl || ""
              if (!url) throw new Error("上传成功但未返回地址")
              projCertForm.value = Object.assign({}, projCertForm.value, { [field]: url })
              ElementPlus.ElMessage.success("已上传")
            } catch (err) { ElementPlus.ElMessage.error(err.message || "上传失败") }
          }
          input.click()
        }
        const loadProjTourMall = async () => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid) return
          projTourMallLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/tour-mall", { headers: s.authHeaders() })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || "读取积分商城失败")
            projTourMall.value = {
              enabled: json.enabled !== false,
              enterBeforeGrad: json.enterBeforeGrad !== false,
              redeemAfterGrad: json.redeemAfterGrad !== false,
              openOnApptDay24h: json.openOnApptDay24h !== false,
              title: json.title || "导览积分商城",
              hint: json.hint || "",
              skus: Array.isArray(json.skus) ? json.skus : []
            }
          } catch (err) {
            ElementPlus.ElMessage.warning(err.message || "读取积分商城失败")
          } finally { projTourMallLoading.value = false }
        }
        const addTourMallSku = () => {
          const list = (projTourMall.value.skus || []).slice()
          list.push({ id: "sku_" + Date.now().toString(36), productId: "", name: "兑换礼品", imageUrl: "", points: 10, stock: -1, enabled: true, note: "" })
          projTourMall.value = Object.assign({}, projTourMall.value, { skus: list })
        }
        const removeTourMallSku = (idx) => {
          const list = (projTourMall.value.skus || []).slice()
          list.splice(idx, 1)
          projTourMall.value = Object.assign({}, projTourMall.value, { skus: list })
        }
        const saveTourMall = async () => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid) { ElementPlus.ElMessage.warning("请先保存项目"); return }
          projTourMallSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/tour-mall", {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify(projTourMall.value || {})
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || "保存失败")
            projTourMall.value = Object.assign({}, projTourMall.value, json)
            ElementPlus.ElMessage.success("积分商城已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally { projTourMallSaving.value = false }
        }
        const emptyAudienceTpl = () => ({
          id: "tpl_" + Date.now().toString(36),
          name: "",
          audience: "custom",
          audienceLabel: "",
          description: "",
          zoneKey: "",
          pace: "balanced",
          needCar: "auto",
          spotIds: [],
          enabled: true,
          sortOrder: (projAudienceTemplates.value || []).length
        })
        const loadAudienceTemplates = async () => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid) { projAudienceTemplates.value = []; return }
          projAudienceLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/audience-templates", { headers: s.authHeaders() })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || "读取人群模板失败")
            const data = json.data || json
            projAudienceTemplates.value = Array.isArray(data.items) ? data.items : []
          } catch (err) {
            ElementPlus.ElMessage.warning(err.message || "读取人群模板失败")
          } finally { projAudienceLoading.value = false }
        }
        const addAudienceTpl = () => {
          projAudienceTemplates.value = (projAudienceTemplates.value || []).concat([emptyAudienceTpl()])
        }
        const removeAudienceTpl = (idx) => {
          const list = (projAudienceTemplates.value || []).slice()
          list.splice(idx, 1)
          projAudienceTemplates.value = list
        }
        const toggleAudienceSpot = (tpl, spotId) => {
          const id = String(spotId || "")
          const list = (projAudienceTemplates.value || []).slice()
          const next = []
          for (let i = 0; i < list.length; i++) {
            const row = Object.assign({}, list[i])
            row.spotIds = Array.isArray(list[i].spotIds) ? list[i].spotIds.slice() : []
            if (list[i] === tpl || list[i].id === tpl.id) {
              const at = row.spotIds.indexOf(id)
              if (at >= 0) row.spotIds.splice(at, 1)
              else row.spotIds.push(id)
            }
            next.push(row)
          }
          projAudienceTemplates.value = next
        }
        const seedAudienceTplsFromZones = () => {
          const pts = projRoutePoints.value || []
          const buckets = { family: [], college: [], business: [] }
          const labels = { family: "亲子轻松", college: "高校研学", business: "商务接待" }
          const hints = { family: "带小孩轻松走，每天少选几个点", college: "学生团队，偏职业与实验室", business: "接待客户，看展陈与产线" }
          const pace = { family: "light", college: "full", business: "balanced" }
          for (let i = 0; i < pts.length; i++) {
            const z = String(pts[i].zoneKey || pts[i].zone || "")
            if (buckets[z]) buckets[z].push(pts[i].id)
          }
          const next = []
          const keys = ["family", "college", "business"]
          for (let k = 0; k < keys.length; k++) {
            const key = keys[k]
            next.push({
              id: "tpl_" + key,
              name: labels[key],
              audience: key,
              description: hints[key],
              zoneKey: key,
              pace: pace[key],
              needCar: "auto",
              spotIds: buckets[key].slice(),
              enabled: true,
              sortOrder: k
            })
          }
          projAudienceTemplates.value = next
          ElementPlus.ElMessage.success("已按分区生成 3 个人群模板，请核对点位后保存")
        }
        const saveAudienceTemplates = async () => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid) { ElementPlus.ElMessage.warning("请先保存项目"); return }
          const list = projAudienceTemplates.value || []
          for (let i = 0; i < list.length; i++) {
            const tpl = list[i] || {}
            const n = i + 1
            if (tpl.audience === "custom" && !String(tpl.audienceLabel || "").trim()) {
              ElementPlus.ElMessage.warning("第 " + n + " 套：自定义人群请填写人群名称")
              return
            }
            if (tpl.enabled !== false && !(tpl.spotIds || []).length) {
              ElementPlus.ElMessage.warning("第 " + n + " 套已启用，请至少勾选 1 个点位")
              return
            }
          }
          projAudienceSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/audience-templates", {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ items: projAudienceTemplates.value || [] })
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || "保存失败")
            const data = json.data || json
            if (Array.isArray(data.items)) projAudienceTemplates.value = data.items
            ElementPlus.ElMessage.success("人群点位模板已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally { projAudienceSaving.value = false }
        }
        const pickTourMallProduct = (idx, productId) => {
          const list = (projTourMall.value.skus || []).slice()
          const p = (projAllProducts.value || []).find((x) => x.id === productId)
          if (!list[idx]) return
          list[idx] = Object.assign({}, list[idx], {
            productId: productId || "",
            name: p ? p.name : list[idx].name,
            imageUrl: p ? (p.imageUrl || p.icon || list[idx].imageUrl || "") : list[idx].imageUrl
          })
          projTourMall.value = Object.assign({}, projTourMall.value, { skus: list })
        }
        const loadProjPuzzleSource = async () => {
          const pid = projSelected.value && projSelected.value.id
          if (!pid) return
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/puzzle-source", { headers: s.authHeaders() })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || "读取拼图源图失败")
            projPuzzleSource.value = json
          } catch (err) {
            ElementPlus.ElMessage.warning(err.message || "读取拼图源图失败")
          }
        }
        const uploadPuzzleSource = async () => {
          const input = document.createElement("input")
          input.type = "file"
          input.accept = "image/*"
          input.onchange = async () => {
            const file = input.files && input.files[0]
            if (!file) return
            const fd = new FormData()
            fd.append("file", file)
            projPuzzleSaving.value = true
            try {
              const up = await fetch("/api/v1/admin/products/images", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
              const uj = await up.json().catch(() => ({}))
              if (!up.ok) throw new Error(uj.message || "上传失败")
              const url = uj.url || uj.publicUrl || uj.imageUrl || ""
              const pid = projSelected.value && projSelected.value.id
              const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(pid) + "/puzzle-source", {
                method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ sourceImageUrl: url, title: (projForm.value && projForm.value.title) || "研学拼图" })
              })
              const json = await res.json().catch(() => ({}))
              if (!res.ok) throw new Error(json.message || "保存拼图源图失败")
              projPuzzleSource.value = json
              ElementPlus.ElMessage.success("拼图源图已更新")
            } catch (err) {
              ElementPlus.ElMessage.error(err.message || "上传失败")
            } finally { projPuzzleSaving.value = false }
          }
          input.click()
        }
        const openProjEdit = async (panel) => {
          if (panel === "notice" || panel === "shop") return
          if ((panel === "resources" || panel === "cert" || panel === "tourmall" || panel === "audience") && !(projSelected.value && projSelected.value.id)) {
            ElementPlus.ElMessage.warning("请先保存项目，再管理该模块")
            return
          }
          if (panel === "resources" && !s.projectCan("project.resources") && s.currentProjectAccess.value) {
            ElementPlus.ElMessage.warning("当前无研学资源权限")
          }
          if (panel === "cert" && !s.projectCan("project.cert") && s.currentProjectAccess.value) {
            ElementPlus.ElMessage.warning("当前无结业证书权限")
          }
          projEditPanel.value = panel || "basic"
          if (panel === "contact") {
            await loadProjStaffOptions()
            await loadProjContacts()
          }
          if (panel === "cert") {
            resetCertForm()
            await loadProjCertTemplates()
            await loadProjPuzzleSource()
            if (!(projAllProducts.value && projAllProducts.value.length)) {
              try { await loadProjShop(projSelected.value.id) } catch (_e) {}
            }
          }
          if (panel === "tourmall") {
            await loadProjTourMall()
            if (!(projAllProducts.value && projAllProducts.value.length)) {
              try { await loadProjShop(projSelected.value.id) } catch (_e) {}
            }
          }
          if (panel === "audience") {
            const p = projSelected.value
            if (p && p.id) await loadProjRoutes(p.id)
            await loadAudienceTemplates()
          }
        }
        const projPayload = () => {
          const f = projForm.value
          return {
            title: String(f.title || "").trim(),
            subtitle: String(f.subtitle || "").trim(),
            category: String(f.category || "").trim(),
            price: String(f.price || "0"),
            status: f.status || (s.isMerchant.value ? "待审批" : "可预约"),
            maxCapacity: Number(f.maxCapacity || 30),
            bookableDays: Math.max(1, Math.min(365, Number(f.bookableDays || 7) || 7)),
            enrolled: Number(f.enrolled || 0),
            location: String(f.location || "").trim(),
            locationLatitude: (f.locationLatitude == null || f.locationLatitude === "") ? null : Number(f.locationLatitude),
            locationLongitude: (f.locationLongitude == null || f.locationLongitude === "") ? null : Number(f.locationLongitude),
            enterpriseId: String(s.scopeEid.value || f.enterpriseId || "").trim(),
            contactPhone: String(f.contactPhone || "").trim(),
            mediaColors: Array.isArray(f.mediaColors) ? f.mediaColors : [],
            tags: Array.isArray(f.tags) ? f.tags.filter((t) => String(t || "").trim()) : [],
            submitForReview: !!(function(){
              if (!(s.isMerchant.value || s.inEntWorkspace.value)) return false
              if (projCreating.value) return true
              const st = String((projSelected.value && projSelected.value.status) || f.status || "")
              return st === "待审批" || st === "已驳回"
            })()
          }
        }
        const saveProj = async () => {
          const body = projPayload()
          if (!body.title || body.title.length < 2) {
            ElementPlus.ElMessage.warning("请填写项目名称")
            return
          }
          projSaving.value = true
          try {
            const isNew = projCreating.value
            const url = isNew ? "/api/v1/admin/study-projects" : ("/api/v1/admin/study-projects/" + encodeURIComponent(projSelected.value.id))
            const res = await fetch(url, { method: isNew ? "POST" : "PUT", headers: s.authHeaders(), body: JSON.stringify(body) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const saved = s.unwrap(json)
            ElementPlus.ElMessage.success(isNew ? (body.submitForReview ? "已提交，等待平台审批" : "项目已创建") : (body.submitForReview ? "已提交审批" : "项目已保存，立即生效"))
            projCreating.value = false
            await loadProjects()
            if (saved && saved.id) await s.openProj(saved)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            projSaving.value = false
          }
        }
        const projReview = ref({ id: "", category: "", tags: [], status: "暂未开放", note: "" })
        const projReviewOpen = ref(false)
        const toggleReviewTag = (tag, on) => {
          let list = (projReview.value.tags || []).filter((t) => t !== tag)
          if (on) list.push(tag)
          projReview.value = Object.assign({}, projReview.value, { tags: list })
        }
        const submitProjReview = async (action) => {
          const f = projReview.value
          if (!f.id) return
          if (action === "approve" && !String(f.category || "").trim()) {
            ElementPlus.ElMessage.warning("请选择分类")
            return
          }
          projSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(f.id) + "/review", {
              method: "POST", headers: s.authHeaders(),
              body: JSON.stringify({ action, category: f.category, tags: f.tags, status: f.status, note: f.note })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "操作失败")
            ElementPlus.ElMessage.success(action === "approve" ? "已通过" : "已驳回")
            projReviewOpen.value = false
            await loadProjects()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "操作失败")
          } finally {
            projSaving.value = false
          }
        }
        const deleteProj = async () => {
          const p = projSelected.value
          if (!p) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除项目将同时删除其预约。", "删除项目", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("项目已删除")
            closeProj()
            await loadProjects()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const uploadProjMedia = async (option) => {
          const file = option && option.file
          if (!file) return
          try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/v1/admin/products/images", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "上传失败")
            const url = (s.unwrap(json) || {}).imageUrl || ""
            if (url) projForm.value.mediaColors = (projForm.value.mediaColors || []).concat([url])
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const removeProjMedia = async (i) => {
          const list = (projForm.value.mediaColors || []).slice()
          const old = list[i]
          list.splice(i, 1)
          projForm.value.mediaColors = list
          if (old) {
            try { await fetch("/api/v1/admin/storage/purge", { method: "POST", headers: s.authHeaders(), body: JSON.stringify({ urls: [old] }) }) } catch (_e) {}
          }
        }
        const toggleProjBound = (id) => {
          const cur = projBound.value.slice()
          const i = cur.indexOf(id)
          if (i >= 0) cur.splice(i, 1)
          else cur.push(id)
          projBound.value = cur
        }
        const projCover = (p) => {
          const list = (p && p.mediaColors) || []
          for (let i = 0; i < list.length; i++) {
            const u = String(list[i] || "")
            if (u.indexOf("http") === 0 || u.indexOf("/") === 0) return u
          }
          return ""
        }
        const projSerial = computed(() => {
          const id = String((projSelected.value && projSelected.value.id) || "000000")
          const raw = id.length > 6 ? id.slice(-6) : id
          return "MQLT-" + raw.toUpperCase()
        })
        const projEnterpriseName = computed(() => {
          const id = String(projForm.value.enterpriseId || "")
          const hit = (projEnterprises.value || []).find((e) => String(e.id) === id)
          if (hit) return hit.shortName || hit.name
          return (projSelected.value && projSelected.value.enterpriseName) || "待公布"
        })
        const projSeatPct = computed(() => {
          const max = Number(projForm.value.maxCapacity || 0)
          const n = Number(projForm.value.enrolled || 0)
          if (max <= 0) return 8
          return Math.max(8, Math.min(100, Math.floor((n * 100) / max)))
        })
        const projBookText = computed(() => {
          const s = String(projForm.value.status || "")
          const enrolled = Number(projForm.value.enrolled || 0)
          const max = Number(projForm.value.maxCapacity || 0)
          if (s === "暂未开放") return "暂未开放"
          if (s === "已结束") return "已结束"
          if (s === "预约满员" || (max > 0 && enrolled >= max)) return "预约已满"
          return "立即预约"
        })
        const projBookDisabled = computed(() => {
          const s = String(projForm.value.status || "")
          const enrolled = Number(projForm.value.enrolled || 0)
          const max = Number(projForm.value.maxCapacity || 0)
          if (s === "暂未开放" || s === "已结束" || s === "预约满员") return true
          if (max > 0 && enrolled >= max) return true
          return false
        })
        const projStamp = computed(() => {
          const s = String(projForm.value.status || "")
          if (s === "暂未开放") return "暂未开放"
          if (s === "已结束") return "已结束"
          if (s === "预约满员") return "预约满员"
          if (s === "正在进行中") return "可预约"
          return s || "可预约"
        })
        const projPhoneDisplay = computed(() => {
          const raw = String(projForm.value.contactPhone || "19931708002").replace(/[-\s]/g, "")
          if (raw === "19931708002" || raw.length === 0) return "199-3170-8002"
          return String(projForm.value.contactPhone || "").trim()
        })
        const projCapacityText = computed(() => {
          const enrolled = Number(projForm.value.enrolled || 0)
          const max = Number(projForm.value.maxCapacity || 0)
          if (max <= 0) return enrolled + "人"
          return enrolled + "/" + max + "人"
        })
        const projCapacityHint = computed(() => {
          const enrolled = Number(projForm.value.enrolled || 0)
          const max = Number(projForm.value.maxCapacity || 0)
          if (max <= 0) return "已报名 " + enrolled + " 人"
          return "已报名 " + enrolled + " / 限 " + max + " 人"
        })
        const projLocName = computed(() => {
          const loc = String(projForm.value.location || "").trim()
          return loc.length > 0 ? loc : "研学地点待公布"
        })
        const projLocDesc = computed(() => {
          const loc = String(projForm.value.location || "").trim()
          return loc.length > 0 ? "具体集合信息以项目通知和现场组织安排为准。" : "请关注后续通知获取具体集合信息。"
        })
        const projEditTitle = computed(() => {
          const map = { basic: "信息", media: "图文", seat: "名额", schedule: "可约日程", place: "研学地点", route: "研学路径", resources: "研学资源", cert: "结业证书", tourmall: "积分商城", contact: "联系方式", notice: "动态", shop: "店铺" }
          return map[projEditPanel.value] || "编辑"
        })
        const projShopPreview = computed(() => {
          const ids = projBound.value || []
          const all = projAllProducts.value || []
          const out = []
          for (let i = 0; i < all.length && out.length < 2; i++) {
            if (ids.indexOf(all[i].id) >= 0) out.push(all[i])
          }
          return out
        })
        const projHoles = [0,1,2,3,4,5,6,7,8,9,10,11,12]
        const projBars = [2,5,2,2,7,2,4,2,2,8,2,3,2,6,2,2,5,2,9,2,3,2,6,2,2,4,2,7,2,3,2,5,2,8,2,2,4,2,6]
        const projRoutePoints = ref([])
        const projRouteSaving = ref(false)
        const projSpotForm = ref(null)
        const projSpotMapQuery = ref("")
        const padStopNo = (i) => (i < 9 ? "0" : "") + (i + 1)
        const projZones = computed(() => {
          const dict = (s.entDicts.value && s.entDicts.value.routeZones) || []
          if (dict.length) return dict
          const seen = {}
          const out = []
          const list = projRoutePoints.value || []
          for (let i = 0; i < list.length; i++) {
            const key = list[i].zoneKey || "test"
            if (seen[key]) continue
            seen[key] = true
            out.push({ key, label: list[i].zoneLabel || key })
          }
          return out.length ? out : [{ key: "test", label: "测试分类" }]
        })
        const projRouteSpots = computed(() => {
          const list = (projRoutePoints.value || []).filter((p) => p.enabled !== false)
          const out = []
          for (let i = 0; i < list.length && i < 3; i++) {
            out.push({
              no: "·",
              title: list[i].title,
              desc: list[i].desc || list[i].description || "",
              zoneLabel: list[i].zoneLabel || "",
              durationText: list[i].durationText || ""
            })
          }
          return out
        })
        const emptySpotForm = () => {
          const zones = projZones.value
          const locLat = Number(projForm.value.locationLatitude)
          const locLng = Number(projForm.value.locationLongitude)
          const has = Number.isFinite(locLat) && Number.isFinite(locLng) && !(locLat === 0 && locLng === 0)
          return {
            id: "",
            title: "",
            description: "",
            zoneKey: zones.length ? zones[0].key : "test",
            durationMin: 20,
            sections: defaultSpotSections(),
            coverUrl: "",
            latitude: has ? locLat : DEFAULT_LOC.lat,
            longitude: has ? locLng : DEFAULT_LOC.lng,
            enabled: true,
            knowledgeVideoTitle: "",
            knowledgeVideoUrl: "",
            knowledgeQuestions: [],
            stationSteps: [],
            stationReward: { enabled: false, maxCoupons: 1, expireDays: 30, tiers: [] },
            offlineTaskEnabled: true,
            offlineTaskTitle: "现场趣味任务",
            offlineTaskBody: "按现场工作人员指引完成互动（观察、动手、合影或小游戏）。完成后请扫描本站研学码（点位码）确认本项任务完成。",
            gateQrUrl: "",
            gateQrRaw: ""
          }
        }
        const DEFAULT_LOC = { lat: 40.509204, lng: 111.826493 }
        const projMapQuery = ref("")
        const outOfChina = (lat, lng) => lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
        const transformLat = (x, y) => {
          let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
          ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
          ret += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3
          ret += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3
          return ret
        }
        const transformLng = (x, y) => {
          let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
          ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3
          ret += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3
          ret += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3
          return ret
        }
        const deltaCoord = (lat, lng) => {
          const a = 6378245.0
          const ee = 0.00669342162296594323
          let dLat = transformLat(lng - 105.0, lat - 35.0)
          let dLng = transformLng(lng - 105.0, lat - 35.0)
          const radLat = lat / 180 * Math.PI
          let magic = Math.sin(radLat)
          magic = 1 - ee * magic * magic
          const sqrtMagic = Math.sqrt(magic)
          dLat = (dLat * 180) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI)
          dLng = (dLng * 180) / (a / sqrtMagic * Math.cos(radLat) * Math.PI)
          return [dLat, dLng]
        }
        const wgs84ToGcj02 = (lat, lng) => {
          if (outOfChina(lat, lng)) return [lat, lng]
          const d = deltaCoord(lat, lng)
          return [lat + d[0], lng + d[1]]
        }
        const applyProjLatLng = (lat, lng, name) => {
          const la = Number(lat)
          const lo = Number(lng)
          if (!Number.isFinite(la) || !Number.isFinite(lo)) return
          projForm.value.locationLatitude = Number(la.toFixed(6))
          projForm.value.locationLongitude = Number(lo.toFixed(6))
          if (name && !String(projForm.value.location || "").trim()) projForm.value.location = String(name)
          if (projMapMarker) projMapMarker.setLatLng([la, lo])
          if (projMap) projMap.panTo([la, lo])
        }
        const destroyProjMap = () => {
          if (projMap) {
            projMap.remove()
            projMap = null
            projMapMarker = null
          }
        }
        const initProjMap = () => {
          if (!window.L) return
          const el = document.getElementById("proj-loc-map")
          if (!el) return
          destroyProjMap()
          const lat = Number(projForm.value.locationLatitude)
          const lng = Number(projForm.value.locationLongitude)
          const has = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
          const center = has ? [lat, lng] : [DEFAULT_LOC.lat, DEFAULT_LOC.lng]
          projMap = L.map(el, { zoomControl: true }).setView(center, has ? 16 : 13)
          L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
            subdomains: "1234",
            maxZoom: 18
          }).addTo(projMap)
          projMapMarker = L.marker(center, { draggable: true }).addTo(projMap)
          projMap.on("click", (e) => applyProjLatLng(e.latlng.lat, e.latlng.lng))
          projMapMarker.on("dragend", () => {
            const p = projMapMarker.getLatLng()
            applyProjLatLng(p.lat, p.lng)
          })
          setTimeout(() => { if (projMap) projMap.invalidateSize() }, 180)
        }
        const searchProjMap = async () => {
          const q = String(projMapQuery.value || "").trim()
          if (!q) {
            ElementPlus.ElMessage.warning("请输入地点名称")
            return
          }
          try {
            const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q), {
              headers: { "Accept-Language": "zh-CN" }
            })
            const list = await res.json()
            if (!list || !list.length) {
              ElementPlus.ElMessage.warning("没有找到该地点，可在地图上直接点选")
              return
            }
            const hit = list[0]
            const wgsLat = Number(hit.lat)
            const wgsLng = Number(hit.lon)
            const gcj = wgs84ToGcj02(wgsLat, wgsLng)
            applyProjLatLng(gcj[0], gcj[1], hit.display_name || q)
            if (projMap) projMap.setZoom(16)
          } catch (_err) {
            ElementPlus.ElMessage.warning("搜索暂不可用，请在地图上点选")
          }
        }
        const projNotices = ref([])
        const projNoticePreview = computed(() => (projNotices.value || []).slice(0, 3))
  Object.assign(s, {
    projSel,
    spotNames,
    ROUTE_SPOTS,
    projectTitle,
    emptyProjForm,
    projKeyword,
    projStatus,
    projPage,
    projTotal,
    projStats,
    projList,
    projLoading,
    projSaving,
    projOpen,
    projCreating,
    projSelected,
    projForm,
    projEditPanel,
    projContacts,
    projContactsSaving,
    projStaffOptions,
    emptyProjContact,
    loadProjStaffOptions,
    loadProjContacts,
    addProjContact,
    removeProjContact,
    onPickContactStaff,
    onContactRoleChange,
    moveProjContact,
    projCertTemplates,
    projCertActiveId,
    projCertForm,
    projCertLoading,
    projCertSaving,
    projTourMall,
    projTourMallLoading,
    projTourMallSaving,
    projAudienceTemplates,
    projAudienceLoading,
    projAudienceSaving,
    projPuzzleSource,
    projPuzzleSaving,
    projEnterprises,
    projBound,
    projAllProducts,
    projExpandId,
    projNoticeOpen,
    projShopOpen,
    projShopKeyword,
    projStatusLabel,
    loadProjects,
    fillProjForm,
    projSaveLabel,
    projReviewKindLabel,
    closeProj,
    toggleProjRow,
    hydrateProj,
    loadRouteCatalog,
    loadProjRoutes,
    escapeSpotHtml,
    isSpotHtml,
    wrapSpotPlain,
    wrapSpotLines,
    ROUTE_SEC_DEFS,
    defaultSpotSections,
    headingStart,
    headingEnd,
    splitSpotHtml,
    padSpotSections,
    sectionsFromRow,
    spotHtmlHasBody,
    spotEditorKey,
    spotEditorFocus,
    spotPreviewTick,
    spotFormTab,
    spotZoneOpen,
    spotVideoUploading,
    spotUploadHint,
    spotGateQrLoading,
    spotGateQrHint,
    spotGateQrSerial,
    afterSpotFormReady,
    setSpotFormTab,
    normalizeSpotQuiz,
    normalizeResourceQuizQuestion,
    normalizeScoreTiersForm,
    addSpotQuiz,
    removeSpotQuiz,
    renderSpotGateQr,
    loadSpotGateQr,
    refreshSpotGateQr,
    uploadSpotVideo,
    newStationStep,
    hydrateStationSteps,
    ensureStationReward,
    addRewardTier,
    removeRewardTier,
    addStationStep,
    removeStationStep,
    moveStationStep,
    ROUTE_RAIL_W_KEY,
    STUDIO_NAV_W_KEY,
    STUDIO_PREVIEW_W_KEY,
    CERT_LIST_W_KEY,
    CERT_PREVIEW_W_KEY,
    ROUTE_PREVIEW_W_KEY,
    studioNavWidth,
    studioPreviewWidth,
    certListWidth,
    certPreviewWidth,
    addStepQuiz,
    removeStepQuiz,
    uploadStepVideo,
    uploadStepGame,
    copyH5GameGuide,
    projectResources,
    projResourceTab,
    resourceTypes,
    projResourceSel,
    projResourceForm,
    projResourceLoading,
    projResourceSaving,
    projResourceUploading,
    projResourceHint,
    projectResourcesOf,
    resourceTypeOf,
    resourceTimeOf,
    loadProjectResources,
    applyStepResource,
    toggleProjectResourceSel,
    startNewProjectResource,
    editProjectResource,
    closeResourceDialog,
    addResourceQuiz,
    removeResourceQuiz,
    addResourceQuizOption,
    removeResourceQuizOption,
    toggleResourceAnswer,
    addResourceScoreTier,
    removeResourceScoreTier,
    uploadProjectResource,
    studyGames,
    studyGamesLoading,
    loadStudyGames,
    pickStudyGame,
    previewStudyGame,
    fillSpotForm,
    spotEditorNodes,
    hydrateSpotEditors,
    readSpotEditorsToModel,
    onSpotEditorFocus,
    onSpotSectionInput,
    spotPreviewSections,
    addSpotSection,
    removeSpotSection,
    moveSpotSection,
    spotPreviewZone,
    spotPreviewDur,
    uploadSpotBodyImage,
    startNewProjSpot,
    destroyProjSpotMap,
    applySpotLatLng,
    initProjSpotMap,
    searchProjSpotMap,
    uploadSpotCover,
    moveProjSpot,
    loadProjShop,
    filteredProjShop,
    defaultCertBodyHtml,
    certPreviewSample,
    certPreviewHtml,
    certPreviewPaperStyle,
    loadProjCertTemplates,
    editCertTemplate,
    resetCertForm,
    saveCertTemplate,
    deleteCertTemplate,
    uploadCertImage,
    loadProjTourMall,
    addTourMallSku,
    removeTourMallSku,
    saveTourMall,
    emptyAudienceTpl,
    loadAudienceTemplates,
    addAudienceTpl,
    removeAudienceTpl,
    toggleAudienceSpot,
    seedAudienceTplsFromZones,
    saveAudienceTemplates,
    pickTourMallProduct,
    loadProjPuzzleSource,
    uploadPuzzleSource,
    openProjEdit,
    projPayload,
    saveProj,
    projReview,
    projReviewOpen,
    toggleReviewTag,
    submitProjReview,
    deleteProj,
    uploadProjMedia,
    removeProjMedia,
    toggleProjBound,
    projCover,
    projSerial,
    projEnterpriseName,
    projSeatPct,
    projBookText,
    projBookDisabled,
    projStamp,
    projPhoneDisplay,
    projCapacityText,
    projCapacityHint,
    projLocName,
    projLocDesc,
    projEditTitle,
    projShopPreview,
    projHoles,
    projBars,
    projRoutePoints,
    projRouteSaving,
    projSpotForm,
    projSpotMapQuery,
    padStopNo,
    projZones,
    projRouteSpots,
    emptySpotForm,
    DEFAULT_LOC,
    projMapQuery,
    outOfChina,
    transformLat,
    transformLng,
    deltaCoord,
    wgs84ToGcj02,
    applyProjLatLng,
    destroyProjMap,
    initProjMap,
    searchProjMap,
    projNotices,
    projNoticePreview
  })
}
