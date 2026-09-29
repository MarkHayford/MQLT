import { ref, computed } from "vue"

export function useMall(s) {
        const mallKeyword = ref("")
        const mallStatusFilter = ref("all")
        const mallProjectFilter = ref("all")
        const mallLowOnly = ref(false)
        const mallLoading = ref(false)
        const mallSaving = ref(false)
        const mallList = ref([])
        const mallProjects = ref([])
        const mallOpen = ref(false)
        const mallCreating = ref(false)
        const mallEditing = ref(false)
        const mallSelected = ref(null)
        const mallStockDelta = ref(0)
        const mallStockReason = ref("后台盘点")
        const mallStockInQty = ref(1)
        const mallStockOutQty = ref(1)
        const mallUploading = ref(false)
        const mallComments = ref([])
        const mallCommentGroups = ref([])
        const mallCommentTargets = ref([])
        const mallCommentKeyword = ref("")
        const mallCommentDate = ref("")
        const mallCommentRating = ref("")
        const mallRatingAvg = ref(0)
        const mallRatingCount = ref(0)
        const mallReplyFor = ref("")
        const mallReplyText = ref("")
        const mallLogs = ref([])
        const mallEditPanel = ref("")
        const mallCommentPage = ref(1)
        const mallCommentPageSize = ref(20)
        const mallCommentTotal = ref(0)
        const mallLogPage = ref(1)
        const mallLogPageSize = ref(20)
        const mallLogTotal = ref(0)
        const mallExpandId = ref("")
        const mallCommentOpen = ref(false)
        const mallLogOpen = ref(false)
        const emptyMallForm = () => ({
          name: "",
          sku: "",
          intro: "",
          description: "",
          category: "生活用品",
          price: "",
          stock: 0,
          status: "ON_SALE",
          imageUrl: "",
          icon: "",
          projectId: "",
          gallery: [],
          specs: [{ label: "品类", value: "研学文创周边" }, { label: "适用", value: "研学纪念 / 日常使用" }, { label: "发货", value: "下单后安排发出" }],
          services: ["官方正品", "极速发货", "七天无理由"],
          detailBlocks: []
        })
        const mallForm = ref(emptyMallForm())
        const moKeyword = ref("")
        const moStatus = ref("all")
        const moLoading = ref(false)
        const moList = ref([])
        const moOpen = ref(false)
        const moSelected = ref(null)
        const moSaving = ref(false)
        const moShip = ref({ shippingCompany: "", trackingNo: "" })
        const moSel = ref([])
        const LOW_STOCK = 20
        const mallProjectTitle = (id) => {
          const pid = String(id || "")
          if (!pid) return ""
          const hit = (mallProjects.value || []).find((p) => String(p.id) === pid)
          return hit ? (hit.title || hit.name || pid) : pid
        }
        const mallCategories = computed(() => {
          const set = {}
          const list = mallList.value || []
          for (let i = 0; i < list.length; i++) {
            const c = String(list[i].category || "").trim()
            if (c) set[c] = true
          }
          const extra = (s.entDicts.value && s.entDicts.value.mallCategories && s.entDicts.value.mallCategories.length)
            ? s.entDicts.value.mallCategories
            : ((s.platformDicts.value && s.platformDicts.value.mallCategories) || ["文具礼品", "生活用品"])
          for (let i = 0; i < extra.length; i++) set[extra[i]] = true
          return Object.keys(set)
        })
        const filteredMall = computed(() => {
          let list = mallList.value || []
          const st = mallStatusFilter.value
          if (st !== "all") {
            list = list.filter((p) => String(p.status || "").toUpperCase() === st)
          }
          const proj = mallProjectFilter.value
          if (proj === "none") list = list.filter((p) => !p.projectId)
          else if (proj !== "all") list = list.filter((p) => String(p.projectId || "") === proj)
          if (mallLowOnly.value) list = list.filter((p) => Number(p.stock || 0) <= LOW_STOCK)
          return list
        })
        const moStats = computed(() => {
          const list = filteredMo.value || []
          const n = (s) => list.filter((o) => String(o.status || "").toUpperCase() === s).length
          return { total: list.length, unpaid: n("UNPAID"), paid: n("PAID"), shipped: n("UNRECEIVED"), done: n("COMPLETED"), cancelled: n("CANCELLED") + n("CANCELED") }
        })
        const loadMallOrders = async () => {
          moLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (moKeyword.value.trim()) qs.set("keyword", moKeyword.value.trim())
            if (moStatus.value && moStatus.value !== "all") qs.set("status", moStatus.value)
            s.scopeQs(qs)
            const res = await fetch("/api/v1/admin/orders?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            moList.value = s.unwrap(json) || []
          } catch (_err) {
            moList.value = []
          } finally {
            moLoading.value = false
          }
        }
        const closeMallOrder = () => { moOpen.value = false; moSelected.value = null }
        const mallOrderAct = async (action) => {
          const o = moSelected.value
          if (!o) return
          if (action === "complete" && (s.area.value === "merchant" || !(s.account.value && s.account.value.mpAccess))) {
            ElementPlus.ElMessage.warning("入驻企业不能完成订单，请等待用户在小程序确认收货")
            return
          }
          moSaving.value = true
          try {
            let url = "/api/v1/admin/orders/" + encodeURIComponent(o.id)
            let method = "POST"
            let body = null
            if (action === "pay") url += "/pay"
            else if (action === "ship") {
              url += "/ship"
              body = { shippingCompany: moShip.value.shippingCompany, trackingNo: moShip.value.trackingNo }
            }
            else if (action === "complete") url += "/complete"
            else if (action === "cancel") url += "/cancel"
            else if (action === "delete") method = "DELETE"
            else method = "PUT"
            const res = await fetch(url, { method, headers: s.authHeaders(), body: body ? JSON.stringify(body) : undefined })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "操作失败")
            ElementPlus.ElMessage.success("已处理")
            if (action === "delete") closeMallOrder()
            await loadMallOrders()
            if (action !== "delete") {
              const hit = (moList.value || []).find((x) => x.id === o.id)
              if (hit) s.openMallOrder(hit)
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "操作失败")
          } finally {
            moSaving.value = false
          }
        }
        const mallStats = computed(() => {
          const list = filteredMall.value || []
          return {
            total: list.length,
            onSale: list.filter((p) => String(p.status || "").toUpperCase() === "ON_SALE").length,
            offSale: list.filter((p) => String(p.status || "").toUpperCase() === "OFF_SALE").length,
            low: list.filter((p) => Number(p.stock || 0) <= LOW_STOCK).length
          }
        })
        const orderTouchesProject = (o, pid) => {
          if (!pid) return true
          const items = (o && o.items) || []
          const list = mallList.value || []
          for (let i = 0; i < items.length; i++) {
            const prod = items[i].product || {}
            if (String(prod.projectId || items[i].projectId || "") === pid) return true
            const id = prod.id || items[i].productId
            const hit = list.find((p) => p.id === id)
            if (hit && String(hit.projectId || "") === pid) return true
          }
          return false
        }
        const filteredMo = computed(() => {
          const list = moList.value || []
          if (!s.inProjWorkspace.value) return list
          return list.filter((o) => orderTouchesProject(o, s.scopePid.value))
        })
        const statusLabel = (s) => {
          const v = String(s || "").toUpperCase()
          if (v === "DISABLED") return "已停用"
          if (v === "ACTIVE") return "正常"
          return s || "—"
        }
        const productImg = (p) => {
          const url = p && (p.imageUrl || p.icon) ? String(p.imageUrl || p.icon) : ""
          if (!url) return ""
          if (url.indexOf("http") === 0) return url
          if (url.indexOf("public/mqlt/") === 0) return "http://127.0.0.1:8080/" + url.slice(12)
          if (url.charAt(0) === "/") return url
          return "http://127.0.0.1:8080/" + url
        }
        const productInitial = (p) => String((p && p.name) || "文").slice(0, 1)
        const productStatusLabel = (s) => {
          const v = String(s || "").toUpperCase()
          if (v === "ON_SALE") return "在售"
          if (v === "OFF_SALE") return "下架"
          return s || "—"
        }
        const productPrice = (v) => {
          const n = Number(v)
          if (!Number.isFinite(n)) return "—"
          return "¥" + n.toFixed(2)
        }
        const mallPreviewHero = ref(0)
        const mallPreview = computed(() => {
          const f = mallForm.value || {}
          const gallery = []
          const seen = {}
          const add = (raw) => {
            const src = productImg({ imageUrl: raw })
            if (!src || seen[src]) return
            seen[src] = true
            gallery.push(src)
          }
          ;(f.gallery || []).forEach(add)
          if (!gallery.length) add(f.imageUrl)
          const services = (f.services || []).map((s) => String(s || "").trim()).filter(Boolean)
          const specs = (f.specs || []).filter((row) => String(row.label || "").trim() || String(row.value || "").trim())
          const n = Number(f.price)
          return {
            gallery,
            cover: gallery[0] || "",
            name: String(f.name || "").trim() || "文创商品",
            intro: String(f.intro || "").trim(),
            description: String(f.description || "").trim(),
            category: String(f.category || "").trim() === "奖品" ? "" : String(f.category || "").trim(),
            price: Number.isFinite(n) ? String(n) : (String(f.price || "").trim() || "—"),
            services: services.length ? services : ["官方正品", "极速发货", "七天无理由"],
            specs: specs.length ? specs : [
              { label: "品类", value: "研学文创周边" },
              { label: "适用", value: "研学纪念 / 日常使用" },
              { label: "发货", value: "下单后安排发出" }
            ],
            offSale: String(f.status || "").toUpperCase() === "OFF_SALE",
            blocks: Array.isArray(f.detailBlocks) ? f.detailBlocks : [],
            specPreview: ((f.specs || []).filter((row) => String(row.label || "").trim() || String(row.value || "").trim())).slice(0, 3),
            specMore: ((f.specs || []).filter((row) => String(row.label || "").trim() || String(row.value || "").trim())).length > 3
          }
        })
        const normalizeStoryBlocks = (blocks, description) => {
          const out = []
          if (Array.isArray(blocks)) {
            for (let i = 0; i < blocks.length; i++) {
              const row = blocks[i] || {}
              out.push({
                id: row.id || ("blk_" + i),
                type: row.type || "text",
                html: row.html || "",
                url: row.url || "",
                width: Number(row.width) > 0 ? Number(row.width) : 100,
                urls: Array.isArray(row.urls) ? row.urls.slice() : []
              })
            }
          }
          if (out.length) return out
          const desc = String(description || "").trim()
          if (!desc) return []
          return [{ id: "blk_legacy_text", type: "text", html: "<p>" + desc.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</p>", url: "", width: 100, urls: [] }]
        }
        const fillMallForm = (p) => {
          const st = p && p.status ? String(p.status).toUpperCase() : "ON_SALE"
          mallForm.value = {
            name: (p && p.name) || "",
            sku: (p && p.sku) || "",
            intro: (p && p.intro) || "",
            description: (p && p.description) || "",
            category: (p && p.category) || "生活用品",
            price: p && p.price != null ? String(p.price) : "",
            stock: Number((p && p.stock) || 0),
            status: st === "OFF_SALE" ? "OFF_SALE" : "ON_SALE",
            imageUrl: (p && p.imageUrl) || "",
            icon: (p && p.icon) || "",
            projectId: (p && p.projectId) || "",
            gallery: Array.isArray(p && p.gallery) ? p.gallery.slice() : [],
            specs: Array.isArray(p && p.specs) && p.specs.length ? p.specs.map((row) => ({ label: row.label || "", value: row.value || "" })) : [{ label: "", value: "" }],
            services: Array.isArray(p && p.services) ? p.services.slice() : [],
            detailBlocks: normalizeStoryBlocks(p && p.detailBlocks, p && p.description)
          }
        }
        const loadMallProjects = async () => {
          try {
            const qs = new URLSearchParams()
            s.scopeQs(qs)
            const res = await fetch("/api/v1/admin/study-projects" + (qs.toString() ? ("?" + qs.toString()) : ""), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "项目列表加载失败")
            mallProjects.value = s.unwrap(json) || []
          } catch (err) {
            mallProjects.value = mallProjects.value || []
          }
        }
        const loadMall = async () => {
          mallLoading.value = true
          try {
            const qs = new URLSearchParams()
            const q = mallKeyword.value.trim()
            if (q) qs.set("keyword", q)
            s.scopeQs(qs)
            const url = "/api/v1/admin/products" + (qs.toString() ? ("?" + qs.toString()) : "")
            const res = await fetch(url, { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "商品列表加载失败")
            mallList.value = s.unwrap(json) || []
            if (!mallProjects.value.length) await loadMallProjects()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "商品列表加载失败")
            mallList.value = []
          } finally {
            mallLoading.value = false
          }
        }
        const closeMall = () => {
          mallOpen.value = false
          mallCreating.value = false
          mallEditing.value = false
          mallSelected.value = null
          mallStockDelta.value = 0
          mallStockReason.value = "后台盘点"
          mallComments.value = []
          mallCommentGroups.value = []
          mallCommentTargets.value = []
          mallCommentKeyword.value = ""
          mallCommentDate.value = ""
          mallCommentRating.value = ""
          mallRatingAvg.value = 0
          mallRatingCount.value = 0
          mallReplyFor.value = ""
          mallReplyText.value = ""
          mallLogs.value = []
          mallPreviewHero.value = 0
          mallEditPanel.value = ""
          mallCommentPage.value = 1
          mallCommentTotal.value = 0
          mallLogPage.value = 1
          mallLogTotal.value = 0
        }
        const toggleMallRow = (row) => {
          mallExpandId.value = mallExpandId.value === row.id ? "" : row.id
        }
        const closeMallComments = () => {
          mallCommentOpen.value = false
          mallReplyFor.value = ""
          mallReplyText.value = ""
        }
        const mallReplyTarget = computed(() => {
          const id = mallReplyFor.value
          if (!id) return null
          return (mallCommentTargets.value || []).find((t) => t.id === id) || null
        })
        const closeMallLogs = () => { mallLogOpen.value = false }
        const loadMallComments = async (productId) => {
          try {
            const qs = new URLSearchParams()
            const keyword = String(mallCommentKeyword.value || "").trim()
            const date = String(mallCommentDate.value || "").trim()
            const rating = String(mallCommentRating.value || "").trim()
            if (keyword) qs.set("keyword", keyword)
            if (date) qs.set("date", date.slice(0, 10))
            if (rating) qs.set("rating", rating)
            qs.set("page", String(mallCommentPage.value || 1))
            qs.set("pageSize", String(mallCommentPageSize.value || 20))
            const url = "/api/v1/admin/products/" + encodeURIComponent(productId) + "/comments?" + qs.toString()
            const res = await fetch(url, { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "评价加载失败")
            const data = s.unwrap(json)
            if (Array.isArray(data)) {
              mallComments.value = data
              mallCommentGroups.value = [{ date: "", items: data }]
              mallCommentTargets.value = data
              mallCommentTotal.value = data.length
              mallRatingAvg.value = 0
              mallRatingCount.value = 0
            } else {
              mallComments.value = (data && data.items) || []
              mallCommentGroups.value = (data && data.groups) || []
              mallCommentTargets.value = (data && data.targets) || []
              mallCommentTotal.value = Number((data && data.total) || 0)
              mallRatingAvg.value = (data && data.ratingAvg) || 0
              mallRatingCount.value = (data && data.ratingCount) || 0
            }
          } catch (_err) {
            mallComments.value = []
            mallCommentGroups.value = []
            mallCommentTargets.value = []
            mallCommentTotal.value = 0
          }
        }
        const loadMallLogs = async (productId) => {
          try {
            const qs = new URLSearchParams()
            qs.set("page", String(mallLogPage.value || 1))
            qs.set("pageSize", String(mallLogPageSize.value || 20))
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(productId) + "/operation-logs?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "操作日志加载失败")
            const paged = s.unwrapPaged(json)
            mallLogs.value = paged.items
            mallLogTotal.value = paged.total
          } catch (_err) {
            mallLogs.value = []
            mallLogTotal.value = 0
          }
        }
        const mallEditTitle = computed(() => {
          const map = { photos: "图片", basic: "信息", specs: "规格", story: "图文", stock: "库存", comments: "评价", logs: "日志" }
          return map[mallEditPanel.value] || "修改"
        })
        const mallEditOpen = computed({
          get: () => !!mallEditPanel.value,
          set: (v) => { if (!v) mallEditPanel.value = "" }
        })
        const closeMallEdit = () => { mallEditPanel.value = "" }
        const changeMallCommentPage = (page) => {
          mallCommentPage.value = page
          if (mallSelected.value) loadMallComments(mallSelected.value.id)
        }
        const changeMallLogPage = (page) => {
          mallLogPage.value = page
          if (mallSelected.value) loadMallLogs(mallSelected.value.id)
        }
        const addMallSpec = () => {
          mallForm.value.specs = (mallForm.value.specs || []).concat([{ label: "", value: "" }])
        }
        const removeMallSpec = (index) => {
          const list = (mallForm.value.specs || []).slice()
          list.splice(index, 1)
          mallForm.value.specs = list.length ? list : [{ label: "", value: "" }]
        }
        const addMallService = () => {
          mallForm.value.services = (mallForm.value.services || []).concat([""])
        }
        const removeMallService = (index) => {
          const list = (mallForm.value.services || []).slice()
          list.splice(index, 1)
          mallForm.value.services = list
        }
        const uploadMallGallery = async (option) => {
          const file = option && option.file
          if (!file) return
          mallUploading.value = true
          try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/v1/admin/products/images", {
              method: "POST",
              headers: { Authorization: "Bearer " + s.token() },
              body: fd
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "图片上传失败")
            const url = (s.unwrap(json) || {}).imageUrl || ""
            if (url) mallForm.value.gallery = (mallForm.value.gallery || []).concat([url])
            if (option.onSuccess) option.onSuccess(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "图片上传失败")
            if (option.onError) option.onError(err)
          } finally {
            mallUploading.value = false
          }
        }
        const removeMallGallery = async (index) => {
          const list = (mallForm.value.gallery || []).slice()
          const old = list[index]
          list.splice(index, 1)
          mallForm.value.gallery = list
          if (old) {
            try { await fetch("/api/v1/admin/storage/purge", { method: "POST", headers: s.authHeaders(), body: JSON.stringify({ urls: [old] }) }) } catch (_e) {}
          }
        }
        const storyDragFrom = ref(-1)
        const newStoryId = () => "blk_" + Date.now().toString(36) + Math.random().toString(16).slice(2, 8)
        const addStoryBlock = (type) => {
          const list = Array.isArray(mallForm.value.detailBlocks) ? mallForm.value.detailBlocks.slice() : []
          list.push({ id: newStoryId(), type, html: type === "text" ? "<p></p>" : "", url: "", width: 100, urls: [] })
          mallForm.value.detailBlocks = list
        }
        const removeStoryBlock = (index) => {
          const list = (mallForm.value.detailBlocks || []).slice()
          list.splice(index, 1)
          mallForm.value.detailBlocks = list
        }
        const moveStoryBlock = (index, dir) => {
          const list = (mallForm.value.detailBlocks || []).slice()
          const next = index + dir
          if (next < 0 || next >= list.length) return
          const tmp = list[index]
          list[index] = list[next]
          list[next] = tmp
          mallForm.value.detailBlocks = list
        }
        const storyDragStart = (index) => { storyDragFrom.value = index }
        const storyDrop = (index) => {
          const from = storyDragFrom.value
          if (from < 0 || from === index) return
          const list = (mallForm.value.detailBlocks || []).slice()
          const item = list.splice(from, 1)[0]
          list.splice(index, 0, item)
          mallForm.value.detailBlocks = list
          storyDragFrom.value = -1
        }
        const onStoryTextInput = (index, ev) => {
          const html = ev && ev.target ? ev.target.innerHTML : ""
          const list = (mallForm.value.detailBlocks || []).slice()
          list[index] = Object.assign({}, list[index], { html })
          mallForm.value.detailBlocks = list
        }
        const storyFormat = (cmd, val) => {
          document.execCommand(cmd, false, val == null ? null : val)
        }
        const uploadStory = (index, mode) => async (option) => {
          const file = option && option.file
          if (!file) return
          mallUploading.value = true
          try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/v1/admin/products/images", {
              method: "POST",
              headers: { Authorization: "Bearer " + s.token() },
              body: fd
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "图片上传失败")
            const url = (s.unwrap(json) || {}).imageUrl || ""
            if (!url) return
            const list = (mallForm.value.detailBlocks || []).slice()
            const cur = Object.assign({}, list[index])
            if (mode === "image") cur.url = url
            else cur.urls = (cur.urls || []).concat([url])
            list[index] = cur
            mallForm.value.detailBlocks = list
            if (option.onSuccess) option.onSuccess(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "图片上传失败")
            if (option.onError) option.onError(err)
          } finally {
            mallUploading.value = false
          }
        }
        const removeStoryUrl = (index, ui) => {
          const list = (mallForm.value.detailBlocks || []).slice()
          const urls = (list[index].urls || []).slice()
          urls.splice(ui, 1)
          list[index] = Object.assign({}, list[index], { urls })
          mallForm.value.detailBlocks = list
        }
        const setStoryWidth = (index, width) => {
          const list = (mallForm.value.detailBlocks || []).slice()
          list[index] = Object.assign({}, list[index], { width })
          mallForm.value.detailBlocks = list
        }
        const replyMallComment = async () => {
          const p = mallSelected.value
          const text = String(mallReplyText.value || "").trim()
          if (!p || !text) return
          mallSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(p.id) + "/comments", {
              method: "POST",
              headers: s.authHeaders(),
              body: JSON.stringify({ content: text, parentId: mallReplyFor.value || null })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "回复失败")
            mallReplyText.value = ""
            mallReplyFor.value = ""
            await loadMallComments(p.id)
            if (mallEditPanel.value === "logs") await loadMallLogs(p.id)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "回复失败")
          } finally {
            mallSaving.value = false
          }
        }
        const hideMallComment = async (comment) => {
          const p = mallSelected.value
          if (!p || !comment) return
          await fetch("/api/v1/admin/products/" + encodeURIComponent(p.id) + "/comments/" + encodeURIComponent(comment.id) + "/hide", {
            method: "POST",
            headers: s.authHeaders()
          })
          await loadMallComments(p.id)
          await loadMallLogs(p.id)
        }
        const deleteMallComment = async (comment) => {
          const p = mallSelected.value
          if (!p || !comment) return
          await fetch("/api/v1/admin/products/" + encodeURIComponent(p.id) + "/comments/" + encodeURIComponent(comment.id), {
            method: "DELETE",
            headers: s.authHeaders()
          })
          await loadMallComments(p.id)
          await loadMallLogs(p.id)
        }
        const startMallEdit = () => {
          if (!mallSelected.value && !mallCreating.value) return
          fillMallForm(mallSelected.value)
          mallEditing.value = true
        }
        const cancelMallEdit = () => {
          if (mallCreating.value) {
            closeMall()
            return
          }
          fillMallForm(mallSelected.value)
          mallEditing.value = false
        }
        const mallPayload = () => {
          const f = mallForm.value
          const imageUrl = String(f.imageUrl || "").trim()
          const body = {
            name: String(f.name || "").trim(),
            intro: String(f.intro || "").trim(),
            description: String(f.description || "").trim(),
            category: String(f.category || "").trim() || "生活用品",
            price: String(f.price || "0").trim(),
            status: f.status || "ON_SALE",
            imageUrl: imageUrl,
            icon: String(f.icon || "").trim() || imageUrl,
            projectId: String(f.projectId || "").trim(),
            gallery: Array.isArray(f.gallery) ? f.gallery : [],
            specs: Array.isArray(f.specs) ? f.specs.filter((row) => String(row.label || "").trim() || String(row.value || "").trim()) : [],
            services: Array.isArray(f.services) ? f.services.map((item) => String(item || "").trim()).filter((item) => item) : [],
            detailBlocks: Array.isArray(f.detailBlocks) ? f.detailBlocks : []
          }
          body.sku = String(f.sku || "").trim()
          if (mallCreating.value) body.stock = Number(f.stock || 0)
          return body
        }
        const uploadMallCover = async (option) => {
          const file = option && option.file
          if (!file) return
          mallUploading.value = true
          try {
            const fd = new FormData()
            fd.append("file", file)
            const old = String((mallForm.value && mallForm.value.imageUrl) || "")
            const res = await fetch("/api/v1/admin/products/images" + (old ? ("?oldUrl=" + encodeURIComponent(old)) : ""), {
              method: "POST",
              headers: { Authorization: "Bearer " + s.token() },
              body: fd
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "图片上传失败")
            const data = s.unwrap(json) || {}
            mallForm.value.imageUrl = data.imageUrl || ""
            mallForm.value.icon = data.imageUrl || mallForm.value.icon
            ElementPlus.ElMessage.success("图片已上传")
            if (option.onSuccess) option.onSuccess(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "图片上传失败")
            if (option.onError) option.onError(err)
          } finally {
            mallUploading.value = false
          }
        }
        const changeMallStock = async (delta, reason) => {
          const p = mallSelected.value
          if (!p) return
          mallStockDelta.value = delta
          mallStockReason.value = reason
          await adjustMallStock()
          mallStockInQty.value = 1
          mallStockOutQty.value = 1
        }
        const saveMall = async () => {
          const body = mallPayload()
          if (!body.name || body.name.length < 2) {
            ElementPlus.ElMessage.warning("请填写商品名称")
            return
          }
          mallSaving.value = true
          try {
            const isNew = mallCreating.value
            const url = isNew ? "/api/v1/admin/products" : ("/api/v1/admin/products/" + encodeURIComponent(mallSelected.value.id))
            const res = await fetch(url, {
              method: isNew ? "POST" : "PUT",
              headers: s.authHeaders(),
              body: JSON.stringify(body)
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success(isNew ? "商品已创建" : "商品已保存")
            const saved = s.unwrap(json)
            mallCreating.value = false
            mallEditing.value = false
            await loadMall()
            if (saved && saved.id) await s.openMall(saved)
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            mallSaving.value = false
          }
        }
        const adjustMallStock = async () => {
          const p = mallSelected.value
          if (!p) return
          const delta = Number(mallStockDelta.value)
          if (!delta || !Number.isFinite(delta)) {
            ElementPlus.ElMessage.warning("请填写不为 0 的调整数量")
            return
          }
          const reason = String(mallStockReason.value || "").trim()
          if (!reason) {
            ElementPlus.ElMessage.warning("请填写调整原因")
            return
          }
          mallSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(p.id) + "/stock-adjustments", {
              method: "POST",
              headers: s.authHeaders(),
              body: JSON.stringify({ delta: delta, reason: reason })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "库存调整失败")
            ElementPlus.ElMessage.success("库存已更新")
            mallStockDelta.value = 0
            await loadMall()
            await s.openMall(p)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "库存调整失败")
          } finally {
            mallSaving.value = false
          }
        }
        const toggleMallSale = async () => {
          const p = mallSelected.value
          if (!p) return
          const now = String(p.status || "").toUpperCase()
          const next = now === "OFF_SALE" ? "ON_SALE" : "OFF_SALE"
          const ok = await ElementPlus.ElMessageBox.confirm(
            next === "OFF_SALE" ? "下架后小程序店铺不再展示这件商品。" : "上架后将出现在绑定项目的文创店中。",
            next === "OFF_SALE" ? "下架商品" : "上架商品",
            { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
          ).catch(() => null)
          if (!ok) return
          mallSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(p.id), {
              method: "PUT",
              headers: s.authHeaders(),
              body: JSON.stringify({ status: next })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "操作失败")
            ElementPlus.ElMessage.success(next === "OFF_SALE" ? "已下架" : "已上架")
            await loadMall()
            await s.openMall(p)
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "操作失败")
          } finally {
            mallSaving.value = false
          }
        }
        const deleteMall = async () => {
          const p = mallSelected.value
          if (!p) return
          const ok = await ElementPlus.ElMessageBox.confirm(
            "若已有订单或奖品占用，将改为下架而不是删除。",
            "删除商品",
            { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }
          ).catch(() => null)
          if (!ok) return
          mallSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(p.id), {
              method: "DELETE",
              headers: s.authHeaders()
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            const data = s.unwrap(json)
            if (data && data.offSale) ElementPlus.ElMessage.success("已有往来记录，已改为下架")
            else ElementPlus.ElMessage.success("商品已删除")
            closeMall()
            await loadMall()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            mallSaving.value = false
          }
        }
  Object.assign(s, {
    mallKeyword,
    mallStatusFilter,
    mallProjectFilter,
    mallLowOnly,
    mallLoading,
    mallSaving,
    mallList,
    mallProjects,
    mallOpen,
    mallCreating,
    mallEditing,
    mallSelected,
    mallStockDelta,
    mallStockReason,
    mallStockInQty,
    mallStockOutQty,
    mallUploading,
    mallComments,
    mallCommentGroups,
    mallCommentTargets,
    mallCommentKeyword,
    mallCommentDate,
    mallCommentRating,
    mallRatingAvg,
    mallRatingCount,
    mallReplyFor,
    mallReplyText,
    mallLogs,
    mallEditPanel,
    mallCommentPage,
    mallCommentPageSize,
    mallCommentTotal,
    mallLogPage,
    mallLogPageSize,
    mallLogTotal,
    mallExpandId,
    mallCommentOpen,
    mallLogOpen,
    emptyMallForm,
    mallForm,
    moKeyword,
    moStatus,
    moLoading,
    moList,
    moOpen,
    moSelected,
    moSaving,
    moShip,
    moSel,
    LOW_STOCK,
    mallProjectTitle,
    mallCategories,
    filteredMall,
    moStats,
    loadMallOrders,
    closeMallOrder,
    mallOrderAct,
    mallStats,
    orderTouchesProject,
    filteredMo,
    statusLabel,
    productImg,
    productInitial,
    productStatusLabel,
    productPrice,
    mallPreviewHero,
    mallPreview,
    normalizeStoryBlocks,
    fillMallForm,
    loadMallProjects,
    loadMall,
    closeMall,
    toggleMallRow,
    closeMallComments,
    mallReplyTarget,
    closeMallLogs,
    loadMallComments,
    loadMallLogs,
    mallEditTitle,
    mallEditOpen,
    closeMallEdit,
    changeMallCommentPage,
    changeMallLogPage,
    addMallSpec,
    removeMallSpec,
    addMallService,
    removeMallService,
    uploadMallGallery,
    removeMallGallery,
    storyDragFrom,
    newStoryId,
    addStoryBlock,
    removeStoryBlock,
    moveStoryBlock,
    storyDragStart,
    storyDrop,
    onStoryTextInput,
    storyFormat,
    uploadStory,
    removeStoryUrl,
    setStoryWidth,
    replyMallComment,
    hideMallComment,
    deleteMallComment,
    startMallEdit,
    cancelMallEdit,
    mallPayload,
    uploadMallCover,
    changeMallStock,
    saveMall,
    adjustMallStock,
    toggleMallSale,
    deleteMall
  })
}
