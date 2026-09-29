import { ref, computed } from "vue"

export function useUi(s) {
        const logPage = ref(1)
        const logPageSize = ref(20)
        const logTotal = ref(0)
        const logKeyword = ref("")
        const logModule = ref("all")
        const logFrom = ref("")
        const logTo = ref("")
        const logLoading = ref(false)
        const logList = ref([])
        const selRef = (key) => ({ mo: s.moSel, bk: s.bkSel, wd: s.wdSel, post: s.postSel, notice: s.noticeSel, user: s.userSel, role: s.roleSel, staff: s.staffSel, mpRole: s.mpRoleSel, mpUser: s.mpUserSel, proj: s.projSel }[key])
        const selHas = (key, id) => (selRef(key).value || []).indexOf(id) >= 0
        const selAllOn = (key, list) => {
          const rows = list || []
          const arr = selRef(key).value || []
          return rows.length > 0 && rows.every((x) => arr.indexOf(x.id) >= 0)
        }
        const selSome = (key, list) => {
          const n = (selRef(key).value || []).length
          return n > 0 && !selAllOn(key, list)
        }
        const toggleSelOne = (key, id, on) => {
          const arrRef = selRef(key)
          const cur = (arrRef.value || []).filter((x) => x !== id)
          if (on) cur.push(id)
          arrRef.value = cur
        }
        const toggleSelAll = (key, list, on) => {
          selRef(key).value = on ? (list || []).map((x) => x.id) : []
        }
        const batchDeleteByUrl = async (url, key, reload) => {
          const arrRef = selRef(key)
          const ids = (arrRef.value || []).slice()
          if (!ids.length) return
          const ok = await ElementPlus.ElMessageBox.confirm("将删除选中的 " + ids.length + " 条，无法恢复。", "批量删除", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const data = await s.postBatch(url, { ids })
            const n = (data && (data.deleted != null ? data.deleted : data.updated)) || ids.length
            ElementPlus.ElMessage.success("已删除 " + n + " 条")
            arrRef.value = []
            if (reload) await reload()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const toggleSide = () => {
          s.sideCollapsed.value = !s.sideCollapsed.value
          localStorage.setItem(s.SIDE_KEY, s.sideCollapsed.value ? "1" : "0")
        }
        const displayName = (u) => {
          if (!u) return "未填写"
          const real = String(u.realName || "").trim()
          return real || "未填写"
        }
        const initialOf = (u) => displayName(u).slice(0, 1)
        const avatarSrc = (u) => {
          const url = u && u.avatarUrl ? String(u.avatarUrl) : ""
          if (!url) return ""
          if (url.indexOf("http") === 0) return url
          if (url.indexOf("public/mqlt/") === 0) return "http://127.0.0.1:8080/" + url.slice(12)
          if (url.charAt(0) === "/") return url
          return "http://127.0.0.1:8080/" + url
        }
        const maskPhone = (v) => {
          const s = String(v || "")
          if (s.length < 7) return s || "—"
          return s.slice(0, 3) + "****" + s.slice(-4)
        }
        const maskId = (v) => {
          const s = String(v || "").replace(/\s/g, "")
          if (!s) return "—"
          if (s.length <= 8) return s
          return s.slice(0, 3) + "********" + s.slice(-4)
        }
        const fmtTime = (v) => {
          if (!v) return "—"
          const d = new Date(v)
          if (isNaN(d.getTime())) return String(v).replace("T", " ").slice(0, 16)
          try {
            const s = d.toLocaleString("sv-SE", { timeZone: "Asia/Shanghai" })
            return s.slice(0, 16)
          } catch (_e) {
            const ms = d.getTime() + 8 * 3600000
            const x = new Date(ms)
            const p = (n) => (n < 10 ? "0" + n : "" + n)
            return x.getUTCFullYear() + "-" + p(x.getUTCMonth() + 1) + "-" + p(x.getUTCDate()) + " " + p(x.getUTCHours()) + ":" + p(x.getUTCMinutes())
          }
        }
        const prettyDay = (k) => {
          const p = String(k || "").split("-")
          if (p.length < 3) return k || "—"
          return parseInt(p[1], 10) + "月" + parseInt(p[2], 10) + "日"
        }
        const moneyText = (v) => {
          const n = Number(v)
          if (!Number.isFinite(n) || n === 0) return "免费"
          return "¥" + n.toFixed(2)
        }
        const couponLabel = (s) => {
          const v = String(s || "").toLowerCase()
          if (v === "unused") return "未使用"
          if (v === "used") return "已使用"
          if (v === "expired") return "已过期"
          return s || "—"
        }
        const orderGoods = (o) => {
          const items = (o && o.items) || []
          if (!items.length) return "文创商品"
          const names = []
          for (let i = 0; i < items.length; i++) {
            const n = items[i].product && items[i].product.name ? items[i].product.name : ""
            if (n) names.push(n)
          }
          if (!names.length) return "文创商品"
          if (names.length === 1) return names[0]
          return names[0] + " 等" + names.length + "件"
        }
        const couponFace = (c) => {
          if (!c) return ""
          if (String(c.type).toLowerCase() === "discount") return c.value
          const n = Number(c.value)
          if (Number.isFinite(n) && n > 0) return "¥" + n
          return c.value || ""
        }
        const starText = (n) => {
          const v = Number(n || 0)
          let out = ""
          for (let i = 1; i <= 5; i++) out += i <= v ? "★" : "☆"
          return out
        }
        const prettyDate = (value) => {
          const raw = String(value || "")
          if (!raw) return ""
          if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim().slice(0, 10)
          const d = value instanceof Date ? value : new Date(raw)
          if (Number.isNaN(d.getTime())) {
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
            return raw
          }
          try {
            return d.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })
          } catch (_e) {
            const ms = d.getTime() + 8 * 3600000
            const x = new Date(ms)
            return x.getUTCFullYear() + "-" + String(x.getUTCMonth() + 1).padStart(2, "0") + "-" + String(x.getUTCDate()).padStart(2, "0")
          }
        }
        const walkComments = (list) => {
          const out = []
          const walk = (rows, depth) => {
            for (let i = 0; i < (rows || []).length; i++) {
              const row = rows[i]
              out.push({ row, depth })
              walk(row.replies || [], depth + 1)
            }
          }
          walk(list || [], 0)
          return out
        }
        const commentTargetLabel = (c) => {
          if (!c) return ""
          const snippet = String(c.content || "").replace(/\s+/g, " ").slice(0, 18)
          return prettyDate(c.createdAt) + " · " + (c.authorName || "学员") + (c.rating ? " " + starText(c.rating) : "") + " · " + snippet
        }
        const logModuleLabel = (m) => {
          if (m === "user") return "用户"
          if (m === "mall") return "商品"
          if (m === "comment") return "评价"
          if (m === "study") return "研学"
          if (m === "booking") return "预约"
          if (m === "settings") return "设置"
          if (m === "finance") return "财务"
          if (m === "content") return "动态"
          if (m === "rental") return "租车"
          if (m === "log") return "日志"
          return m || "—"
        }
        const unwrapPaged = (json) => {
          const data = s.unwrap(json)
          if (Array.isArray(data)) return { items: data, total: data.length, page: 1, pageSize: data.length || 20 }
          return {
            items: (data && data.items) || [],
            total: Number((data && data.total) || 0),
            page: Number((data && data.page) || 1),
            pageSize: Number((data && data.pageSize) || 20)
          }
        }
        const loadLogs = async () => {
          logLoading.value = true
          try {
            const qs = new URLSearchParams()
            const keyword = String(logKeyword.value || "").trim()
            const from = String(logFrom.value || "").trim()
            const to = String(logTo.value || "").trim()
            if (keyword) qs.set("keyword", keyword)
            if (logModule.value && logModule.value !== "all") qs.set("module", logModule.value)
            if (from) qs.set("from", from.slice(0, 10))
            if (to) qs.set("to", to.slice(0, 10))
            qs.set("page", String(logPage.value || 1))
            qs.set("pageSize", String(logPageSize.value || 20))
            if (s.inEntWorkspace.value) s.scopeQs(qs)
            const res = await fetch("/api/v1/admin/operation-logs?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "操作日志加载失败")
            const paged = unwrapPaged(json)
            logList.value = paged.items
            logTotal.value = paged.total
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "操作日志加载失败")
            logList.value = []
            logTotal.value = 0
          } finally {
            logLoading.value = false
          }
        }
        const saveProjContacts = async () => {
          const id = String((s.projSelected.value && s.projSelected.value.id) || (s.opsProj.value && s.opsProj.value.id) || "")
          if (!id) { ElementPlus.ElMessage.warning("请先保存项目"); return }
          if (!s.projectCan("project.owners") && s.area.value === "merchant" && (s.currentProjectAccess.value)) {
            ElementPlus.ElMessage.warning("当前无「项目负责人」权限")
            return
          }
          s.projContactsSaving.value = true
          try {
            const payload = {
              contactPhone: String((s.projForm.value && s.projForm.value.contactPhone) || "").trim(),
              contacts: (s.projContacts.value || []).map((c, i) => ({
                id: c.id || undefined,
                userId: c.userId || "",
                name: String(c.name || "").trim(),
                phone: String(c.phone || "").trim(),
                wechat: String(c.wechat || "").trim(),
                role: c.role || "现场负责人",
                visibleToStudents: c.visibleToStudents !== false,
                sort: i,
                capabilities: Array.isArray(c.capabilities) ? c.capabilities : (s.CONTACT_ROLE_DEFAULT_CAPS[c.role] || [])
              }))
            }
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(id) + "/contacts", {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify(payload)
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const data = s.unwrap(json) || json
            s.projContacts.value = Array.isArray(data.contacts) ? data.contacts.slice() : payload.contacts
            ElementPlus.ElMessage.success("项目负责人已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            s.projContactsSaving.value = false
          }
        }
        const GATE_RIGHT_W_KEY = "mqlt-gate-right-width"
        const SHELL_SIDE_W_KEY = "mqlt-shell-side-width"
        const TAX_RIGHT_W_KEY = "mqlt-tax-right-width"
        const DETAIL_DRAWER_W_KEY = "mqlt-detail-drawer-width"
        const clampPx = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
        const readStoredPx = (key, def, lo, hi) => {
          try {
            const n = parseInt(localStorage.getItem(key) || "", 10)
            return Number.isFinite(n) ? clampPx(n, lo, hi) : def
          } catch (_e) { return def }
        }
        const gateRightWidth = ref(readStoredPx(GATE_RIGHT_W_KEY, 320, 280, 420))
        const taxRightWidth = ref(readStoredPx(TAX_RIGHT_W_KEY, 420, 280, 560))
        const detailDrawerPx = ref(readStoredPx(DETAIL_DRAWER_W_KEY, 620, 420, 900))
        const gateSplitHover = ref(false)
        const mqltSplitHover = ref("")
        const startColumnResize = (ev, opts) => {
          ev.preventDefault()
          const startX = ev.clientX
          const startW = opts.getW()
          const maxW = typeof opts.max === "function" ? opts.max() : opts.max
          const minW = typeof opts.min === "function" ? opts.min() : opts.min
          opts.setHover(true)
          const move = (e) => {
            const next = clampPx(startW + opts.dir * (e.clientX - startX), minW, maxW)
            opts.setW(next)
          }
          const up = () => {
            opts.setHover(false)
            window.removeEventListener("mousemove", move)
            window.removeEventListener("mouseup", up)
            document.body.style.userSelect = ""
            document.body.style.cursor = ""
            try { if (opts.key) localStorage.setItem(opts.key, String(opts.getW())) } catch (_e) {}
          }
          document.body.style.userSelect = "none"
          document.body.style.cursor = "col-resize"
          window.addEventListener("mousemove", move)
          window.addEventListener("mouseup", up)
        }
        const startRouteRailResize = (ev) => startColumnResize(ev, {
          getW: () => s.routeRailWidth.value,
          setW: (v) => { s.routeRailWidth.value = v },
          setHover: (v) => { s.routeSplitHover.value = v },
          min: 180, max: 360, dir: 1, key: s.ROUTE_RAIL_W_KEY
        })
        const startGateRightResize = (ev) => startColumnResize(ev, {
          getW: () => gateRightWidth.value,
          setW: (v) => { gateRightWidth.value = v },
          setHover: (v) => { gateSplitHover.value = v },
          min: 280, max: 420, dir: -1, key: GATE_RIGHT_W_KEY
        })
        const startShellSideResize = (ev) => startColumnResize(ev, {
          getW: () => s.shellSideWidth.value,
          setW: (v) => { s.shellSideWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "shell" : "" },
          min: 180, max: 360, dir: 1, key: SHELL_SIDE_W_KEY
        })
        const startStudioNavResize = (ev) => startColumnResize(ev, {
          getW: () => s.studioNavWidth.value,
          setW: (v) => { s.studioNavWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "studio-nav" : "" },
          min: 160, max: 320, dir: 1, key: s.STUDIO_NAV_W_KEY
        })
        const startStudioPreviewResize = (ev) => startColumnResize(ev, {
          getW: () => s.studioPreviewWidth.value,
          setW: (v) => { s.studioPreviewWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "studio-preview" : "" },
          min: 300, max: 560, dir: -1, key: s.STUDIO_PREVIEW_W_KEY
        })
        const startCertListResize = (ev) => startColumnResize(ev, {
          getW: () => s.certListWidth.value,
          setW: (v) => { s.certListWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "cert-list" : "" },
          min: 160, max: 300, dir: 1, key: s.CERT_LIST_W_KEY
        })
        const startCertPreviewResize = (ev) => startColumnResize(ev, {
          getW: () => s.certPreviewWidth.value,
          setW: (v) => { s.certPreviewWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "cert-preview" : "" },
          min: 240, max: 440, dir: -1, key: s.CERT_PREVIEW_W_KEY
        })
        const startRoutePreviewResize = (ev) => startColumnResize(ev, {
          getW: () => s.routePreviewWidth.value,
          setW: (v) => { s.routePreviewWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "route-preview" : "" },
          min: 220, max: 380, dir: -1, key: s.ROUTE_PREVIEW_W_KEY
        })
        const startFinRightResize = (ev) => startColumnResize(ev, {
          getW: () => s.finRightWidth.value,
          setW: (v) => { s.finRightWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "fin" : "" },
          min: 260, max: 520, dir: -1, key: s.FIN_RIGHT_W_KEY
        })
        const startTaxRightResize = (ev) => startColumnResize(ev, {
          getW: () => taxRightWidth.value,
          setW: (v) => { taxRightWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "tax" : "" },
          min: 280, max: 560, dir: -1, key: TAX_RIGHT_W_KEY
        })
        const startLegalRightResize = (ev) => startColumnResize(ev, {
          getW: () => s.legalRightWidth.value,
          setW: (v) => { s.legalRightWidth.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "legal" : "" },
          min: 280, max: 560, dir: -1, key: s.LEGAL_RIGHT_W_KEY
        })
        const startDetailDrawerResize = (ev) => startColumnResize(ev, {
          getW: () => detailDrawerPx.value,
          setW: (v) => { detailDrawerPx.value = v },
          setHover: (v) => { mqltSplitHover.value = v ? "detail-drawer" : "" },
          min: 420, max: () => Math.min(900, (typeof window !== "undefined" ? window.innerWidth : 1280) - 16),
          dir: -1, key: DETAIL_DRAWER_W_KEY
        })
        const saveProjectResource = async () => {
          const p = s.projSelected.value
          const f = s.projResourceForm.value
          if (!p || !p.id || !f) return
          s.projResourceSaving.value = true
          try {
            const body = { type: f.type, title: f.title, taskBody: f.taskBody }
            if (f.type === "quiz") {
              body.questions = (f.questions || []).map((q) => {
                const nq = s.normalizeResourceQuizQuestion(q)
                const row = {
                  question: nq.question,
                  options: nq.options.map((x) => String(x || "").trim()).filter(Boolean),
                  multiSelect: !!nq.multiSelect,
                  answerIndexes: nq.answerIndexes,
                  answerIndex: nq.answerIndexes[0],
                  partialMode: nq.partialMode || "none"
                }
                if (nq.id) row.id = nq.id
                if (nq.partialMode === "fixed" && nq.halfScore != null) row.halfScore = Number(nq.halfScore)
                if (nq.points != null && nq.points !== "") row.points = Number(nq.points)
                return row
              }).filter((q) => q.question && q.options.length >= 2)
            }
            if (f.type === "game") {
              body.maxRetries = f.retriesUnlimited ? null : (f.maxRetries != null && Number(f.maxRetries) > 0 ? Number(f.maxRetries) : null)
              body.skippable = f.skippable !== false
              body.scoreTiers = s.normalizeScoreTiersForm(f.scoreTiers)
            }
            const url = f.id
              ? ("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/resources/" + encodeURIComponent(f.id))
              : ("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/resources")
            const res = await fetch(url, { method: f.id ? "PUT" : "POST", headers: s.authHeaders(), body: JSON.stringify(body) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success("资源已保存")
            s.projResourceForm.value = null
            await s.loadProjectResources()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            s.projResourceSaving.value = false
          }
        }
        const deleteProjectResource = async (row) => {
          const p = s.projSelected.value
          if (!p || !row) return
          try {
            await ElementPlus.ElMessageBox.confirm(row.usedCount ? "该资源正在被站点使用，不能删除。" : "删除后 S3 文件也会清掉，无法恢复。", "删除资源", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" })
          } catch (_e) { return }
          if (row.usedCount) return
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/resources/" + encodeURIComponent(row.id), { method: "DELETE", headers: s.authHeaders() })
          const json = await res.json()
          if (!res.ok) { ElementPlus.ElMessage.error(json.message || "删除失败"); return }
          ElementPlus.ElMessage.success("已删除")
          await s.loadProjectResources()
        }
        const batchDeleteProjectResources = async () => {
          const p = s.projSelected.value
          if (!p || !s.projResourceSel.value.length) return
          try {
            await ElementPlus.ElMessageBox.confirm("将删除选中资源，正在使用中的会跳过。已上传到 S3 的文件会一并清掉。", "批量删除", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" })
          } catch (_e) { return }
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/resources/batch-delete", { method: "POST", headers: s.authHeaders(), body: JSON.stringify({ ids: s.projResourceSel.value }) })
          const json = await res.json()
          if (!res.ok) { ElementPlus.ElMessage.error(json.message || "删除失败"); return }
          const data = s.unwrap(json) || {}
          s.projResourceSel.value = []
          ElementPlus.ElMessage.success("已删除 " + (data.deletedCount || 0) + " 项" + (data.skippedCount ? ("，跳过 " + data.skippedCount) : ""))
          await s.loadProjectResources()
        }
        const selectProjSpot = (row) => {
          s.fillSpotForm(row)
          s.afterSpotFormReady()
        }
        const saveProjSpot = async () => {
          const p = s.projSelected.value
          const f = s.projSpotForm.value
          if (!p || !f) return
          s.readSpotEditorsToModel()
          if (!String(f.title || "").trim()) {
            ElementPlus.ElMessage.warning("请填写点位名称")
            return
          }
          s.projRouteSaving.value = true
          try {
            const zone = (s.projZones.value || []).find((z) => z.key === f.zoneKey)
            const sections = (f.sections || []).map((item, i) => ({
              key: item.key || ("sec" + i),
              title: String(item.title || "").trim() || ("段落" + (i + 1)),
              html: String(item.html || "").trim() || "<p></p>"
            }))
            const htmlOf = (key) => {
              const hit = sections.find((item) => item.key === key)
              return hit ? String(hit.html || "") : ""
            }
            const html = htmlOf("intro") || (sections[0] ? sections[0].html : "")
            const payload = {
              title: String(f.title || "").trim(),
              description: String(f.description || "").trim() || s.htmlToPlain(html).slice(0, 80) || String(f.title || "").trim(),
              intro: html,
              sections,
              zoneKey: f.zoneKey,
              zoneLabel: zone ? zone.label : "",
              durationMin: Number(f.durationMin || 20),
              guideText: s.htmlToPlain(htmlOf("guide")),
              gameText: s.htmlToPlain(htmlOf("game")),
              giftText: s.htmlToPlain(htmlOf("gift")),
              audience: s.htmlToPlain(htmlOf("audience")),
              coverUrl: f.coverUrl || "",
              photoCaption: String(f.title || "").trim(),
              latitude: Number(f.latitude),
              longitude: Number(f.longitude),
              enabled: f.enabled !== false,
              checkInMode: "scan",
              knowledgeVideoTitle: String(f.knowledgeVideoTitle || "").trim(),
              knowledgeVideoUrl: String(f.knowledgeVideoUrl || "").trim(),
              knowledgeQuestions: (f.knowledgeQuestions || []).map((q) => ({
                question: String((q && q.question) || "").trim(),
                options: ((q && q.options) || []).map((opt) => String(opt || "").trim()).filter((opt) => opt),
                answerIndex: Number((q && q.answerIndex) || 0)
              })).filter((q) => q.question && q.options.length >= 2),
              knowledgeEnabled: (f.knowledgeQuestions || []).some((q) => String((q && q.question) || "").trim()),
              offlineTaskEnabled: f.offlineTaskEnabled !== false,
              offlineTaskTitle: String(f.offlineTaskTitle || "").trim() || "现场趣味任务",
              offlineTaskBody: String(f.offlineTaskBody || "").trim(),
              stationSteps: (f.stationSteps || []).map((s, i) => ({
                id: String((s && s.id) || ("s" + i)),
                type: String((s && s.type) || "task"),
                title: String((s && s.title) || "").trim(),
                videoUrl: String((s && s.videoUrl) || "").trim(),
                questions: ((s && s.questions) || []).map((q) => {
                  const nq = s.normalizeResourceQuizQuestion(q)
                  const row = {
                    question: nq.question,
                    options: nq.options.map((opt) => String(opt || "").trim()).filter((opt) => opt),
                    multiSelect: !!nq.multiSelect,
                    answerIndexes: nq.answerIndexes,
                    answerIndex: nq.answerIndexes[0],
                    partialMode: nq.partialMode || "none"
                  }
                  if (nq.id) row.id = nq.id
                  if (nq.partialMode === "fixed" && nq.halfScore != null) row.halfScore = Number(nq.halfScore)
                  if (nq.points != null && nq.points !== "") row.points = Number(nq.points)
                  return row
                }).filter((q) => q.question && q.options.length >= 2),
                taskBody: String((s && s.taskBody) || "").trim(),
                gameUrl: String((s && s.gameUrl) || "").trim(),
                gameName: String((s && s.gameName) || "").trim(),
                passScore: (s && s.passScore != null && s.passScore !== "") ? Number(s.passScore) : null,
                resourceId: String((s && s.resourceId) || "").trim(),
                skippable: s && s.skippable === false ? false : true,
                points: Number((s && s.points) || 0),
                maxRetries: (s && s.maxRetries != null && s.maxRetries !== "" && Number(s.maxRetries) > 0) ? Number(s.maxRetries) : null,
                scoreTiers: s.normalizeScoreTiersForm(s && s.scoreTiers)
              })),
              stationReward: {
                enabled: !!(f.stationReward && f.stationReward.enabled),
                maxCoupons: Number((f.stationReward && f.stationReward.maxCoupons) || 1),
                expireDays: Number((f.stationReward && f.stationReward.expireDays) || 30),
                tiers: ((f.stationReward && f.stationReward.tiers) || []).map((t) => ({
                  minPoints: Number((t && t.minPoints) || 0),
                  title: String((t && t.title) || "").trim(),
                  productId: String((t && t.productId) || "").trim(),
                  grade: String((t && t.grade) || "").trim()
                })).filter((t) => t.productId)
              }
            }
            payload.knowledgeEnabled = payload.knowledgeQuestions.length > 0 || payload.stationSteps.some((s) => s.type === "quiz" && s.questions.length)
            const isNew = !f.id
            const url = isNew
              ? ("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/route-points")
              : ("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/route-points/" + encodeURIComponent(f.id))
            const res = await fetch(url, { method: isNew ? "POST" : "PUT", headers: s.authHeaders(), body: JSON.stringify(payload) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success(isNew ? "点位已添加" : "点位已保存")
            await s.loadProjRoutes(p.id)
            const saved = s.unwrap(json)
            if (saved && saved.id) {
              s.fillSpotForm(saved)
              s.afterSpotFormReady()
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            s.projRouteSaving.value = false
          }
        }
        const deleteProjSpot = async (row) => {
          const p = s.projSelected.value
          const target = row || s.projSpotForm.value
          if (!p || !target || !target.id) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后预约页不再显示该点位。", "删除点位", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/route-points/" + encodeURIComponent(target.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            await s.loadProjRoutes(p.id)
            if (s.projSpotForm.value && s.projSpotForm.value.id === target.id) s.projSpotForm.value = null
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const closeProjNotices = () => { s.projNoticeOpen.value = false }
        const closeProjShop = () => { s.projShopOpen.value = false }
        const batchDeleteProjects = async () => {
          const ids = (s.projSel.value || []).slice()
          if (!ids.length) return
          const ok = await ElementPlus.ElMessageBox.confirm("将删除选中的 " + ids.length + " 个项目及其预约，无法恢复。", "批量删除", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          let n = 0
          try {
            for (let i = 0; i < ids.length; i++) {
              const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(ids[i]), { method: "DELETE", headers: s.authHeaders() })
              const json = await res.json()
              if (!res.ok) throw new Error(json.message || "删除失败")
              n += 1
            }
            ElementPlus.ElMessage.success("已删除 " + n + " 个项目")
            s.projSel.value = []
            await s.loadProjects()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || ("已删除 " + n + " 个后失败"))
            await s.loadProjects()
          }
        }
        const saveProjShop = async () => {
          const p = s.projSelected.value
          if (!p) return
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/products", {
            method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ productIds: s.projBound.value })
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "保存失败")
          ElementPlus.ElMessage.success("店铺商品已更新")
        }
        const closeTab = (key, ev) => {
          if (ev) {
            ev.stopPropagation()
            ev.preventDefault()
          }
          const list = s.pageTabs.value.slice()
          const i = list.findIndex((t) => t.key === key)
          if (i < 0 || list.length === 1) return
          list.splice(i, 1)
          s.pageTabs.value = list
          if (s.active.value === key) s.active.value = (list[i] || list[i - 1]).key
          s.persistTabs()
        }
        const _winW = (typeof window !== "undefined" ? window.innerWidth : 1280)
        const splitHover = ref(false)
        const batchDeleteMpRoles = async () => {
          const ids = (s.mpRoleSel.value || []).slice()
          if (!ids.length) return
          if ((s.mpRoles.value || []).some((r) => ids.indexOf(r.id) >= 0 && r.locked)) {
            ElementPlus.ElMessage.warning("系统职位不能删除")
            return
          }
          const ok = await ElementPlus.ElMessageBox.confirm("将删除选中的 " + ids.length + " 个职位。", "批量删除职位", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          const next = (s.mpRoles.value || []).filter((r) => ids.indexOf(r.id) < 0)
          s.mpSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/mp-roles", { method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ roles: next }) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            s.mpRoleSel.value = []
            if (s.mpRoleEdit.value && ids.indexOf(s.mpRoleEdit.value.id) >= 0) s.mpRoleEdit.value = null
            await s.loadMpStaff()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            s.mpSaving.value = false
          }
        }
        const batchDeleteMpStaff = async () => {
          const ids = (s.mpUserSel.value || []).slice()
          if (!ids.length) return
          const ok = await ElementPlus.ElMessageBox.confirm("将删除选中的 " + ids.length + " 个管理账号。", "批量删除账号", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          s.mpSaving.value = true
          try {
            const data = await s.postBatch("/api/v1/admin/mp-staff/batch-delete", { ids })
            ElementPlus.ElMessage.success("已删除 " + ((data && data.deleted) || 0) + " 个")
            s.mpUserSel.value = []
            s.mpStaffOpen.value = false
            await s.loadMpStaff()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            s.mpSaving.value = false
          }
        }
        const toggleStaffRoleModule = (role, mod, on) => {
          if (!role || role.locked) return
          const kids = s.roleChildValues(mod)
          let list = (role.permissions || []).filter((p) => kids.indexOf(p) < 0)
          if (on) list = list.concat(kids)
          if (list.indexOf("overview.read") < 0) list.unshift("overview.read")
          role.permissions = list
          s.staffRoles.value = s.staffRoles.value.slice()
        }
        const loadEntStaff = async () => {
          const id = s.scopeEid.value
          if (!id) { s.staffList.value = []; s.staffRoles.value = []; return }
          s.staffLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/staff", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            const data = s.unwrap(json) || {}
            s.staffRoles.value = data.roles || []
            s.staffPermOptions.value = data.permissionOptions || []
            s.staffList.value = data.items || []
          } catch (err) {
            s.staffList.value = []
            ElementPlus.ElMessage.error(err.message || "职位加载失败")
          } finally {
            s.staffLoading.value = false
          }
        }
        const toggleRolePerm = (role, value, on) => {
          if (!role || role.locked) return
          let list = (role.permissions || []).filter((p) => p !== value)
          if (on) list.push(value)
          if (list.indexOf("overview.read") < 0) list.unshift("overview.read")
          role.permissions = list
          s.staffRoles.value = s.staffRoles.value.slice()
        }
        const addStaffRole = () => {
          const role = { id: "role" + Date.now().toString(36), name: "新职位", locked: false, permissions: ["overview.read"], projectIds: [] }
          s.staffRoles.value = s.staffRoles.value.concat([role])
          s.staffRoleEdit.value = role
        }
        const setRoleAllProjects = (role, on) => {
          if (!role || role.locked) return
          role.projectIds = on ? [] : ((s.projList.value || []).slice(0, 1).map((p) => p.id))
          s.staffRoles.value = s.staffRoles.value.slice()
        }
        const toggleRoleProject = (role, id, on) => {
          if (!role || role.locked) return
          let list = (role.projectIds || []).filter((x) => x !== id)
          if (on) list.push(id)
          role.projectIds = list
          s.staffRoles.value = s.staffRoles.value.slice()
        }
        const removeStaffRole = (role) => {
          if (!role || role.locked) return
          s.staffRoles.value = s.staffRoles.value.filter((r) => r.id !== role.id)
          if (s.staffRoleEdit.value && s.staffRoleEdit.value.id === role.id) s.staffRoleEdit.value = null
        }
        const unlockedRoles = computed(() => (s.staffRoles.value || []).filter((r) => !r.locked))
        const batchDeleteRoles = async () => {
          const id = s.scopeEid.value
          const ids = (s.roleSel.value || []).slice()
          if (!id || !ids.length) return
          const locked = (s.staffRoles.value || []).filter((r) => ids.indexOf(r.id) >= 0 && r.locked)
          if (locked.length) {
            ElementPlus.ElMessage.warning("系统职位不能删除")
            return
          }
          const ok = await ElementPlus.ElMessageBox.confirm("将删除选中的 " + ids.length + " 个职位。", "批量删除职位", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          const next = (s.staffRoles.value || []).filter((r) => ids.indexOf(r.id) < 0)
          s.staffSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/roles", {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ roles: next })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            s.roleSel.value = []
            if (s.staffRoleEdit.value && ids.indexOf(s.staffRoleEdit.value.id) >= 0) s.staffRoleEdit.value = null
            await loadEntStaff()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            s.staffSaving.value = false
          }
        }
        const batchDeleteStaff = async () => {
          const id = s.scopeEid.value
          const ids = (s.staffSel.value || []).slice()
          if (!id || !ids.length) return
          const ok = await ElementPlus.ElMessageBox.confirm("将删除选中的 " + ids.length + " 个管理账号。", "批量删除账号", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          s.staffSaving.value = true
          try {
            const data = await s.postBatch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/staff/batch-delete", { ids })
            const n = (data && data.deleted) || 0
            ElementPlus.ElMessage.success("已删除 " + n + " 个")
            s.staffSel.value = []
            s.staffOpen.value = false
            await loadEntStaff()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            s.staffSaving.value = false
          }
        }
        const closeStaffRole = () => { s.staffRoleEdit.value = null }
        const saveStaffRoles = async () => {
          const id = s.scopeEid.value
          if (!id) return
          s.staffSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/roles", {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ roles: s.staffRoles.value })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const data = s.unwrap(json) || {}
            if (data.roles) s.staffRoles.value = data.roles
            ElementPlus.ElMessage.success("职位已保存")
            await loadEntStaff()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            s.staffSaving.value = false
          }
        }
        const saveStaff = async () => {
          const id = s.scopeEid.value
          const f = s.staffForm.value
          if (!id) return
          if (!f.id && !/^1[0-9]{10}$/.test(String(f.phone || ""))) {
            ElementPlus.ElMessage.warning("请输入11位手机号")
            return
          }
          if (!f.id && String(f.password || "").length < 6) {
            ElementPlus.ElMessage.warning("请设置至少 6 位密码")
            return
          }
          if (!String(f.roleId || "").trim()) {
            ElementPlus.ElMessage.warning("请选择职位")
            return
          }
          s.staffSaving.value = true
          try {
            const url = f.id
              ? ("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/staff/" + encodeURIComponent(f.id))
              : ("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/staff")
            const res = await fetch(url, { method: f.id ? "PUT" : "POST", headers: s.authHeaders(), body: JSON.stringify(f) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success("已保存")
            s.staffOpen.value = false
            await loadEntStaff()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            s.staffSaving.value = false
          }
        }
        const deleteStaff = async (row) => {
          const id = s.scopeEid.value
          const target = row || s.staffForm.value
          if (!id || !target || !target.id) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后该手机号不能再登录企业控制台。", "删除管理账号", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          s.staffSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/staff/" + encodeURIComponent(target.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            s.staffOpen.value = false
            await loadEntStaff()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            s.staffSaving.value = false
          }
        }
  Object.assign(s, {
    logPage,
    logPageSize,
    logTotal,
    logKeyword,
    logModule,
    logFrom,
    logTo,
    logLoading,
    logList,
    selRef,
    selHas,
    selAllOn,
    selSome,
    toggleSelOne,
    toggleSelAll,
    batchDeleteByUrl,
    toggleSide,
    displayName,
    initialOf,
    avatarSrc,
    maskPhone,
    maskId,
    fmtTime,
    prettyDay,
    moneyText,
    couponLabel,
    orderGoods,
    couponFace,
    starText,
    prettyDate,
    walkComments,
    commentTargetLabel,
    logModuleLabel,
    unwrapPaged,
    loadLogs,
    saveProjContacts,
    GATE_RIGHT_W_KEY,
    SHELL_SIDE_W_KEY,
    TAX_RIGHT_W_KEY,
    DETAIL_DRAWER_W_KEY,
    clampPx,
    readStoredPx,
    gateRightWidth,
    taxRightWidth,
    detailDrawerPx,
    gateSplitHover,
    mqltSplitHover,
    startColumnResize,
    startRouteRailResize,
    startGateRightResize,
    startShellSideResize,
    startStudioNavResize,
    startStudioPreviewResize,
    startCertListResize,
    startCertPreviewResize,
    startRoutePreviewResize,
    startFinRightResize,
    startTaxRightResize,
    startLegalRightResize,
    startDetailDrawerResize,
    saveProjectResource,
    deleteProjectResource,
    batchDeleteProjectResources,
    selectProjSpot,
    saveProjSpot,
    deleteProjSpot,
    closeProjNotices,
    closeProjShop,
    batchDeleteProjects,
    saveProjShop,
    closeTab,
    _winW,
    splitHover,
    batchDeleteMpRoles,
    batchDeleteMpStaff,
    toggleStaffRoleModule,
    loadEntStaff,
    toggleRolePerm,
    addStaffRole,
    setRoleAllProjects,
    toggleRoleProject,
    removeStaffRole,
    unlockedRoles,
    batchDeleteRoles,
    batchDeleteStaff,
    closeStaffRole,
    saveStaffRoles,
    saveStaff,
    deleteStaff
  })
}
