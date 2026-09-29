import { ref, computed, nextTick } from "vue"

export function useUsers(s) {
        const userKeyword = ref("")
        const userFilter = ref("all")
        const userPage = ref(1)
        const userPageSize = ref(20)
        const userTotal = ref(0)
        const userStats = ref({ total: 0, verified: 0, disabled: 0 })
        const userRecords = ref([])
        const userRecordsTotal = ref(0)
        const userRecordsPage = ref(1)
        const userRecordsKind = ref("bookings")
        const userLoading = ref(false)
        const userSaving = ref(false)
        const userList = ref([])
        const userDetail = ref(null)
        const userOpen = ref(false)
        const userEditing = ref(false)
        const userPanel = ref("home")
        const userForm = ref({
          realName: "",
          phone: "",
          realNameIdCard: "",
          realNameVerified: false
        })
        const userLogPage = ref(1)
        const userLogTotal = ref(0)
        const userLogs = ref([])
        const userSel = ref([])
        const roleSel = ref([])
        const staffSel = ref([])
        const dual = computed(() => {
          const a = s.account.value
          return !!(a && a.mpAccess && a.merchantAccess)
        })
        const filteredUsers = computed(() => userList.value || [])
        const openMallOrder = (row) => {
          s.moSelected.value = row
          s.moShip.value = { shippingCompany: row.shippingCompany || "", trackingNo: row.trackingNo || "" }
          s.moOpen.value = true
        }
        const userSummary = (u) => {
          if (u && u.summary) return u.summary
          return { bookings: 0, orders: 0, coupons: 0, unusedCoupons: 0, certificates: 0, posts: 0, publishedPosts: 0, pendingFeedbacks: 0 }
        }
        const loadUsers = async () => {
          userLoading.value = true
          try {
            const qs = new URLSearchParams()
            const q = userKeyword.value.trim()
            if (q) qs.set("keyword", q)
            if (userFilter.value && userFilter.value !== "all") qs.set("filter", userFilter.value)
            qs.set("page", String(userPage.value || 1))
            qs.set("pageSize", String(userPageSize.value || 20))
            const res = await fetch("/api/v1/admin/users?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "用户列表加载失败")
            const paged = s.unwrapPaged(json)
            userList.value = paged.items
            userTotal.value = paged.total
            const stats = (s.unwrap(json) && s.unwrap(json).stats) || {}
            userStats.value = {
              total: Number(stats.total != null ? stats.total : paged.total),
              verified: Number(stats.verified || 0),
              disabled: Number(stats.disabled || 0)
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "用户列表加载失败")
            userList.value = []
            userTotal.value = 0
          } finally {
            userLoading.value = false
          }
        }
        const openUser = async (row) => {
          userOpen.value = true
          userEditing.value = false
          userPanel.value = "home"
          userDetail.value = row
          try {
            const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "用户详情加载失败")
            userDetail.value = s.unwrap(json)
            userLogPage.value = 1
            userRecordsPage.value = 1
            await loadUserRecords("bookings", 1)
            await loadUserLogs(row.id)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "用户详情加载失败")
          }
        }
        const closeUser = () => {
          userOpen.value = false
          userEditing.value = false
          userPanel.value = "home"
          userLogs.value = []
        }
        const loadUserLogs = async (userId) => {
          try {
            const qs = new URLSearchParams()
            qs.set("page", String(userLogPage.value || 1))
            qs.set("pageSize", "20")
            const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(userId) + "/operation-logs?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "操作日志加载失败")
            const paged = s.unwrapPaged(json)
            userLogs.value = paged.items
            userLogTotal.value = paged.total
          } catch (_err) {
            userLogs.value = []
            userLogTotal.value = 0
          }
        }
        const openPanel = (key) => {
          userEditing.value = false
          userPanel.value = key
          if (key === "logs") {
            userLogPage.value = 1
            if (userDetail.value) loadUserLogs(userDetail.value.id)
            return
          }
          const kind = key === "achievements" ? "certificates" : (key === "home" ? "bookings" : key)
          if (kind === "bookings" || kind === "orders" || kind === "coupons" || kind === "certificates" || kind === "posts" || kind === "feedbacks") {
            userRecordsPage.value = 1
            loadUserRecords(kind, 1)
          }
        }
        const loadUserRecords = async (kind, page) => {
          const u = userDetail.value
          if (!u) return
          const nextPage = page || 1
          userRecordsKind.value = kind
          userRecordsPage.value = nextPage
          try {
            const size = kind === "bookings" ? 8 : 20
            const qs = new URLSearchParams()
            qs.set("kind", kind)
            qs.set("page", String(nextPage))
            qs.set("pageSize", String(size))
            const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(u.id) + "/records?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "记录加载失败")
            const paged = s.unwrapPaged(json)
            userRecords.value = paged.items
            userRecordsTotal.value = paged.total
          } catch (_err) {
            userRecords.value = []
            userRecordsTotal.value = 0
          }
        }
        const deleteLog = async (id, reload) => {
          if (!id) return
          try {
            const ok = await ElementPlus.ElMessageBox.confirm("删除这条日志？", "清理日志", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
            if (!ok) return
            const res = await fetch("/api/v1/admin/operation-logs/" + encodeURIComponent(id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            if (reload) await reload()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const userRecordEdit = ref(null)
        const userRecordForm = ref({})
        const currentRecordKind = () => {
          if (userPanel.value === "home") return "bookings"
          if (userPanel.value === "achievements") return "certificates"
          return userPanel.value
        }
        const refreshUserSummary = async () => {
          const u = userDetail.value
          if (!u) return
          const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(u.id), { headers: s.authHeaders() })
          const json = await res.json()
          if (res.ok) {
            const data = s.unwrap(json)
            userDetail.value = Object.assign({}, u, data, { bookings: userDetail.value.bookings })
          }
        }
        const mutateRecord = async (kind, id, action, body) => {
          const u = userDetail.value
          if (!u || !id) return
          let method = "PUT"
          let url = "/api/v1/admin/users/" + encodeURIComponent(u.id) + "/records/" + encodeURIComponent(kind) + "/" + encodeURIComponent(id)
          if (action === "cancel") {
            method = "POST"
            url += "/cancel"
          } else if (action === "delete") {
            method = "DELETE"
          }
          const res = await fetch(url, {
            method,
            headers: Object.assign({}, s.authHeaders(), { "Content-Type": "application/json" }),
            body: action === "update" ? JSON.stringify(body || {}) : undefined
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "操作失败")
          await loadUserRecords(kind === "bookings" ? "bookings" : kind, userRecordsPage.value)
          await refreshUserSummary()
        }
        const canCancelRecord = (kind, item) => {
          const s = String((item && item.status) || "").toLowerCase()
          if (kind === "bookings") return s !== "cancelled" && s !== "canceled" && s !== "completed"
          if (kind === "orders") return s === "unpaid" || s === "paid"
          if (kind === "coupons") return s === "unused"
          if (kind === "posts") return s === "published"
          return false
        }
        const canDeleteRecord = (_kind, _item) => true
        const cancelRecord = async (kind, item) => {
          const ok = await ElementPlus.ElMessageBox.confirm("确认取消该记录？", "取消", { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            await mutateRecord(kind, item.id, "cancel")
            ElementPlus.ElMessage.success("已取消")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "取消失败")
          }
        }
        const deleteRecord = async (kind, item) => {
          const ok = await ElementPlus.ElMessageBox.confirm("删除后无法恢复。", "删除", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            await mutateRecord(kind, item.id, "delete")
            ElementPlus.ElMessage.success("已删除")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const openRecordEdit = (kind, item) => {
          userRecordEdit.value = { kind, item }
          if (kind === "bookings") userRecordForm.value = { status: item.status || "BOOKED" }
          else if (kind === "orders") userRecordForm.value = { status: item.status || "UNPAID", adminRemark: item.adminRemark || "", shippingCompany: item.shippingCompany || "", trackingNo: item.trackingNo || "" }
          else if (kind === "coupons") userRecordForm.value = { title: item.title || "", status: item.status || "unused", expireAt: item.expireAt ? String(item.expireAt).slice(0, 10) : "", extendDays: null }
          else if (kind === "certificates") userRecordForm.value = { holderName: item.holderName || "", projectTitle: item.projectTitle || "", summary: item.summary || "" }
          else if (kind === "posts") userRecordForm.value = { title: item.title || "", status: item.status || "PUBLISHED" }
          else userRecordForm.value = {}
        }
        const saveRecordEdit = async () => {
          const edit = userRecordEdit.value
          if (!edit) return
          try {
            const payload = Object.assign({}, userRecordForm.value)
            if (edit.kind === "coupons") {
              const ed = payload.extendDays
              if (ed == null || ed === "" || !Number.isFinite(Number(ed)) || Number(ed) === 0) delete payload.extendDays
              else payload.extendDays = Math.round(Number(ed))
              if (payload.extendDays != null) delete payload.expireAt
            }
            await mutateRecord(edit.kind, edit.item.id, "update", payload)
            userRecordEdit.value = null
            ElementPlus.ElMessage.success("已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          }
        }
        const closeRecordEdit = () => { userRecordEdit.value = null }
        const clearLogs = async (query, reload) => {
          try {
            const ok = await ElementPlus.ElMessageBox.confirm("将删除当前筛选下的全部日志。", "清理日志", { confirmButtonText: "清理", cancelButtonText: "取消", type: "warning" }).catch(() => null)
            if (!ok) return
            const res = await fetch("/api/v1/admin/operation-logs/clear", {
              method: "POST",
              headers: { ...authHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify(query || {})
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "清理失败")
            const n = (s.unwrap(json) && s.unwrap(json).deleted) || 0
            ElementPlus.ElMessage.success("已清理 " + n + " 条")
            if (reload) await reload()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "清理失败")
          }
        }
        const startEdit = () => {
          const u = userDetail.value
          if (!u) return
          userForm.value = {
            realName: u.realName || "",
            phone: u.phone || "",
            realNameIdCard: u.realNameIdCard || "",
            realNameVerified: !!u.realNameVerified
          }
          userPanel.value = "home"
          userEditing.value = true
        }
        const cancelEdit = () => {
          userEditing.value = false
        }
        const saveUser = async () => {
          const u = userDetail.value
          if (!u) return
          const form = userForm.value
          const phone = String(form.phone || "").replace(/[^0-9]/g, "")
          if (phone && !/^1[0-9]{10}$/.test(phone)) {
            ElementPlus.ElMessage.warning("手机号须为11位")
            return
          }
          const name = String(form.realName || "").trim()
          if (!name || name.length < 2) {
            ElementPlus.ElMessage.warning("请填写真实姓名")
            return
          }
          const idCard = String(form.realNameIdCard || "").trim().toUpperCase()
          if (form.realNameVerified) {
            if (String(form.realName || "").trim().length < 2 || !/^\d{17}[\dX]$/.test(idCard)) {
              ElementPlus.ElMessage.warning("实名需同时填写姓名和18位身份证号")
              return
            }
          } else if (idCard && !/^\d{17}[\dX]$/.test(idCard)) {
            ElementPlus.ElMessage.warning("请输入正确的18位身份证号")
            return
          }
          if (phone && phone !== String(u.phone || "")) {
            const ok = await ElementPlus.ElMessageBox.confirm(
              "修改手机号将影响该学员在小程序中的联系方式。",
              "确认修改手机号",
              { confirmButtonText: "保存", cancelButtonText: "取消", type: "warning" }
            ).catch(() => null)
            if (!ok) return
          }
          userSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(u.id), {
              method: "PUT",
              headers: s.authHeaders(),
              body: JSON.stringify({
                realName: name,
                phone: phone,
                realNameIdCard: idCard,
                realNameVerified: !!form.realNameVerified
              })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success("资料已保存")
            userEditing.value = false
            await openUser(u)
            await loadUsers()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            userSaving.value = false
          }
        }
        const deleteUserAccount = async () => {
          const u = userDetail.value
          if (!u) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后该学员账号不可恢复，相关预约和订单会一并清理。", "删除用户", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          userSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(u.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            closeUser()
            await loadUsers()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            userSaving.value = false
          }
        }
        const toggleStatus = async () => {
          const u = userDetail.value
          if (!u) return
          const now = String(u.status || "").toUpperCase()
          const next = now === "DISABLED" ? "ACTIVE" : "DISABLED"
          const ok = await ElementPlus.ElMessageBox.confirm(
            next === "DISABLED" ? "停用后该学员将无法登录小程序。" : "恢复后该学员可正常使用小程序。",
            next === "DISABLED" ? "停用账号" : "恢复账号",
            { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
          ).catch(() => null)
          if (!ok) return
          userSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(u.id), {
              method: "PUT",
              headers: s.authHeaders(),
              body: JSON.stringify({ status: next })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "操作失败")
            ElementPlus.ElMessage.success(next === "DISABLED" ? "已停用" : "已恢复")
            await openUser(u)
            await loadUsers()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "操作失败")
          } finally {
            userSaving.value = false
          }
        }
        const openMallCreate = () => {
          s.mallCreating.value = true
          s.mallEditing.value = true
          s.mallSelected.value = null
          s.fillMallForm(null)
          if (s.scopePid.value) s.mallForm.value.projectId = s.scopePid.value
          s.mallOpen.value = true
          if (!s.mallProjects.value.length) s.loadMallProjects()
        }
        const openMall = async (row) => {
          s.mallCommentOpen.value = false
          s.mallLogOpen.value = false
          s.mallCreating.value = false
          s.mallEditing.value = true
          s.mallOpen.value = true
          s.mallSelected.value = row
          s.fillMallForm(row)
          s.mallStockDelta.value = 0
          s.mallStockReason.value = "后台盘点"
          try {
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "商品详情加载失败")
            const p = s.unwrap(json)
            s.mallSelected.value = p
            s.fillMallForm(p)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "商品详情加载失败")
          }
        }
        const openMallComments = async (row) => {
          s.mallOpen.value = false
          s.mallLogOpen.value = false
          s.mallCreating.value = false
          s.mallSelected.value = row
          s.mallReplyFor.value = ""
          s.mallReplyText.value = ""
          s.mallCommentKeyword.value = ""
          s.mallCommentDate.value = ""
          s.mallCommentRating.value = ""
          s.mallCommentPage.value = 1
          s.mallCommentOpen.value = true
          try {
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
            const json = await res.json()
            if (res.ok) s.mallSelected.value = s.unwrap(json) || row
          } catch (_err) {}
          await s.loadMallComments(row.id)
        }
        const openMallLogs = async (row) => {
          s.mallOpen.value = false
          s.mallCommentOpen.value = false
          s.mallCreating.value = false
          s.mallSelected.value = row
          s.mallLogPage.value = 1
          s.mallLogOpen.value = true
          try {
            const res = await fetch("/api/v1/admin/products/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
            const json = await res.json()
            if (res.ok) s.mallSelected.value = s.unwrap(json) || row
          } catch (_err) {}
          await s.loadMallLogs(row.id)
        }
        const openMallEdit = (panel) => {
          if (panel === "comments" || panel === "logs") return
          s.mallEditPanel.value = panel
        }
        const loadEnterprises = async () => {
          try {
            const res = await fetch("/api/v1/admin/enterprises", { headers: s.authHeaders() })
            const json = await res.json()
            s.projEnterprises.value = s.unwrap(json) || []
          } catch (_err) {
            s.projEnterprises.value = []
          }
        }
        const openProjCreate = () => {
          s.projNoticeOpen.value = false
          s.projShopOpen.value = false
          s.projCreating.value = true
          s.projSelected.value = null
          s.projForm.value = s.emptyProjForm()
          if (s.scopeEid.value) s.projForm.value.enterpriseId = s.scopeEid.value
          s.projRoutePoints.value = []
          s.projSpotForm.value = null
          s.projEditPanel.value = "basic"
          s.projOpen.value = false
          s.openPage("proj-edit")
        }
        const openSpotGateQr = () => {
          const f = s.projSpotForm.value
          const url = f && f.gateQrUrl ? f.gateQrUrl : ""
          if (!url) {
            ElementPlus.ElMessage.warning("研学码还没生成")
            return
          }
          const w = window.open("", "_blank")
          if (!w) return
          w.document.write('<title>本站研学码</title><body style="margin:40px;background:#fff;text-align:center;font-family:sans-serif"><img src="' + url + '" style="width:420px;height:420px"/><p>打印后交给现场员工出示 · 供现场任务扫码确认</p></body>')
          w.document.close()
        }
        const openH5Template = () => {
          window.open("/api/v1/study/h5/template.html", "_blank")
        }
        const openResourceUrl = (row) => {
          const url = (row && (row.gameUrl || row.videoUrl)) || ""
          if (url) window.open(url, "_blank")
        }
        const openProj = async (row) => {
          if (!row || !row.id) return
          s.projNoticeOpen.value = false
          s.projShopOpen.value = false
          s.projCreating.value = false
          s.projOpen.value = false
          if (!s.projEditPanel.value) s.projEditPanel.value = "basic"
          const same = s.inProjWorkspace.value && String((s.opsProj.value && s.opsProj.value.id) || "") === String(row.id)
          if (!same) s.enterProjWorkspace(row, "proj-edit")
          else s.openPage("proj-edit")
          await s.hydrateProj(row)
          try {
            await s.loadProjShop(row.id)
            await s.loadProjNotices(row.id)
            await s.loadProjRoutes(row.id)
            await s.loadProjectResources()
          } catch (_err) {}
        }
        const openProjNotices = async (row) => {
          s.projOpen.value = false
          s.projShopOpen.value = false
          await s.hydrateProj(row)
          await s.loadProjNotices(row.id)
          s.projNoticeOpen.value = true
        }
        const openProjShop = async (row) => {
          s.projOpen.value = false
          s.projNoticeOpen.value = false
          await s.hydrateProj(row)
          await s.loadProjShop(row.id)
          s.projShopKeyword.value = ""
          s.projShopOpen.value = true
        }
        const openProjReview = (row) => {
          s.projSelected.value = row
          const isRev = !!(row && row.hasPendingRevision && row.reviewKind === "update")
          const draft = (row && row.pendingRevision) || {}
          s.projReview.value = {
            id: row.id,
            category: row.category || ((s.settingsDicts.value.studyCategories || [])[0] || ""),
            tags: Array.isArray(row.tags) ? row.tags.slice() : [],
            status: isRev ? (draft.status || row.status || "暂未开放") : "暂未开放",
            note: row.reviewNote || ""
          }
          s.projReviewOpen.value = true
        }
        const openBooking = (row) => {
          s.bkSelected.value = row
          s.fillBkTrip(row)
          s.fillBkRide(row)
          s.bkOpen.value = true
          const pid = row && row.project && row.project.id
          if (pid) s.loadRouteCatalog(pid)
        }
        const openBookingUser = () => {
          const b = s.bkSelected.value
          const u = b && b.user
          if (!u || !u.id) {
            ElementPlus.ElMessage.warning("没有关联学员")
            return
          }
          s.closeBooking()
          openUser({ id: u.id, nickname: u.nickname, phone: u.phone, studyNo: u.studyNo, realName: u.realName })
        }
        const openBkCreate = () => {
          if (!s.projList.value.length) s.loadProjects()
          s.bkCreate.value = { userId: "", projectId: s.scopePid.value || "", status: "BOOKED", userKeyword: "", hits: [], dayKeys: [], spotIds: [], ride: s.emptyBkRide() }
          s.bkCreateOpen.value = true
        }
        const openDriverCreate = () => {
          s.drvCreating.value = true
          s.drvSelected.value = null
          s.drvForm.value = s.emptyDrvForm()
          s.drvMapQuery.value = ""
          s.drvOpen.value = true
          nextTick(() => setTimeout(s.initDrvMap, 280))
        }
        const openDriver = (row) => {
          s.drvCreating.value = false
          s.drvSelected.value = row
          s.drvForm.value = {
            id: row.id,
            phone: row.phone || "",
            realName: row.realName || "",
            wechat: row.wechat || "",
            city: s.normalizeCityName(row.city || ""),
            vehicleType: row.vehicleType || "van7",
            vehicleName: row.vehicleName || "",
            plateNo: row.plateNo || "",
            seatCount: row.seatCount || 7,
            status: row.status === "LEAVE" ? "OFFLINE" : (row.status || "OFFLINE"),
            acceptOrders: row.acceptOrders !== false,
            commissionRate: row.commissionRate != null && row.commissionRate !== "" ? String(row.commissionRate) : "",
            baseLatitude: row.baseLatitude != null ? Number(row.baseLatitude) : null,
            baseLongitude: row.baseLongitude != null ? Number(row.baseLongitude) : null
          }
          s.drvMapQuery.value = s.drvForm.value.city || ""
          s.drvOpen.value = true
          nextTick(() => setTimeout(s.initDrvMap, 280))
        }
        const openRentalChat = async (r) => {
          s.roChatOpen.value = true
          s.roChatLoading.value = true
          s.roChatOrder.value = r
          s.roChatItems.value = []
          try {
            const res = await fetch("/api/v1/admin/rental-orders/" + encodeURIComponent(r.id) + "/messages", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载聊天失败")
            const data = s.unwrap(json) || {}
            s.roChatOrder.value = data.order || r
            s.roChatItems.value = data.items || []
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "加载聊天失败")
          } finally {
            s.roChatLoading.value = false
          }
        }
        const entDicts = ref(s.emptyEntDicts())
        const entDictDraft = ref({ noticeTypes: "", mallCategories: "", zoneKey: "", zoneLabel: "" })
        const openNoticeCreate = (projectId) => {
          s.noticeCreating.value = true
          s.noticeSelected.value = null
          if (!s.platformDicts.value) s.loadSettings()
          const kind = s.currentNoticeKind()
          let pid = projectId != null && String(projectId) !== "" ? String(projectId) : ""
          if (kind === "dynamics") {
            if (!pid) pid = String(s.noticeProjectId.value || s.scopePid.value || "")
          } else if (!pid && s.inProjWorkspace.value) {
            pid = String(s.scopePid.value || "")
          }
          s.fillNoticeForm({ projectId: pid, publisher: "", type: "", category: "", kind })
          s.noticeForm.value.projectId = pid
          s.noticeForm.value.kind = kind
          if (s.active.value === "posts-dynamics") s.noticeForm.value.kind = "dynamics"
          s.noticeOpen.value = true
        }
        const openNotice = (row) => {
          s.noticeCreating.value = false
          s.noticeSelected.value = row
          if (!s.platformDicts.value) s.loadSettings()
          s.fillNoticeForm(row)
          s.noticeOpen.value = true
        }
        const openReviewItem = async (row) => {
          if (!row) return
          if (s.isStudyNoticeRow(row)) {
            openNotice(row)
            return
          }
          await openPost(row)
        }
        const openPostCreate = () => {
          s.postCreating.value = true
          s.postSelected.value = null
          s.fillPostForm(null)
          if (!s.projEnterprises.value.length) loadEnterprises()
          if (!s.projList.value.length) s.loadProjects()
          s.postOpen.value = true
        }
        const openPost = async (row) => {
          s.postCreating.value = false
          s.postSelected.value = row
          s.fillPostForm(row)
          s.postOpen.value = true
          if (row && row.id) {
            try {
              const res = await fetch("/api/v1/admin/community-posts/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
              const json = await res.json()
              if (res.ok) {
                const detail = s.unwrap(json)
                s.postSelected.value = detail
                s.fillPostForm(detail)
              }
            } catch (_err) {}
          }
        }
        const opList = ref([])
        const opRoles = ref([])
        const opLoading = ref(false)
        const opOpen = ref(false)
        const opSaving = ref(false)
        const opForm = ref({ id: "", phone: "", name: "", password: "", mpRole: "OBSERVER", mpAccess: true, merchantAccess: false, status: "ACTIVE", enterpriseId: "" })
        const roleLabel = (role) => {
          const hit = (opRoles.value || []).find((r) => r.value === role)
          return hit ? hit.label : (role || "—")
        }
        const loadOperators = async () => {
          opLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/operators", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            const data = s.unwrap(json) || {}
            opList.value = data.items || []
            opRoles.value = data.roles || []
          } catch (err) {
            opList.value = []
            ElementPlus.ElMessage.error(err.message || "职位加载失败")
          } finally {
            opLoading.value = false
          }
        }
        const openOpCreate = (preset) => {
          opForm.value = { id: "", phone: "", name: "", password: "", mpRole: "OBSERVER", mpAccess: true, merchantAccess: false, status: "ACTIVE", enterpriseId: "" }
          if (preset && preset.enterpriseId) {
            opForm.value.mpAccess = false
            opForm.value.merchantAccess = true
            opForm.value.enterpriseId = preset.enterpriseId
          }
          opOpen.value = true
          if (!s.projEnterprises.value.length) loadEnterprises()
        }
        const openOp = (row) => {
          opForm.value = {
            id: row.id, phone: row.phone, name: row.name, password: "",
            mpRole: row.mpRole || "OBSERVER", mpAccess: !!row.mpAccess, merchantAccess: !!row.merchantAccess,
            status: row.status || "ACTIVE", enterpriseId: row.enterpriseId || ""
          }
          opOpen.value = true
          if (!s.projEnterprises.value.length) loadEnterprises()
        }
        const mpRoles = ref([])
        const mpPermOptions = ref([])
        const mpStaffList = ref([])
        const mpLoading = ref(false)
        const mpSaving = ref(false)
        const mpRoleEdit = ref(null)
        const mpStaffOpen = ref(false)
        const mpStaffForm = ref({ id: "", phone: "", name: "", password: "", roleId: "", status: "ACTIVE" })
        const mpRoleSel = ref([])
        const mpUserSel = ref([])
        const buildPermTreeGroups = (opts) => {
          const rows = opts || []
          const groups = []
          const map = {}
          const ensure = (g) => {
            if (!map[g]) { map[g] = { name: g, modules: [] }; groups.push(map[g]) }
            return map[g]
          }
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || {}
            const g = row.group || "其他"
            const kids = Array.isArray(row.children) ? row.children : null
            if (kids && kids.length) {
              ensure(g).modules.push({
                value: row.value || row.label || ("mod" + i),
                label: row.label || row.value || g,
                children: kids.map((c) => ({ value: c.value, label: c.label || c.value }))
              })
            } else if (row.value) {
              // flat legacy item → fake module with single child
              ensure(g).modules.push({
                value: row.value,
                label: row.label || row.value,
                children: [{ value: row.value, label: row.label || row.value }]
              })
            }
          }
          return groups
        }
        const mpPermGroups = computed(() => buildPermTreeGroups(mpPermOptions.value))
        const roleChildValues = (mod) => ((mod && mod.children) || []).map((c) => c.value).filter(Boolean)
        const roleHasAllChildren = (role, mod, hasFn) => {
          const kids = roleChildValues(mod)
          if (!kids.length) return false
          return kids.every((v) => hasFn(role, v))
        }
        const roleHasSomeChildren = (role, mod, hasFn) => {
          const kids = roleChildValues(mod)
          return kids.some((v) => hasFn(role, v))
        }
        const mpRoleModuleChecked = (role, mod) => roleHasAllChildren(role, mod, mpRoleHasPerm)
        const mpRoleModuleIndeterminate = (role, mod) => {
          const some = roleHasSomeChildren(role, mod, mpRoleHasPerm)
          const all = roleHasAllChildren(role, mod, mpRoleHasPerm)
          return some && !all
        }
        const toggleMpRoleModule = (role, mod, on) => {
          if (!role || role.locked) return
          const kids = roleChildValues(mod)
          let list = (role.permissions || []).filter((p) => kids.indexOf(p) < 0)
          if (on) list = list.concat(kids)
          if (list.indexOf("overview.read") < 0) list.unshift("overview.read")
          role.permissions = list
          mpRoles.value = mpRoles.value.slice()
        }
        const unlockedMpRoles = computed(() => (mpRoles.value || []).filter((r) => !r.locked))
        const loadMpStaff = async () => {
          mpLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/mp-staff", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            const data = s.unwrap(json) || {}
            mpRoles.value = data.roles || []
            mpPermOptions.value = data.permissionOptions || []
            mpStaffList.value = data.items || []
          } catch (err) {
            mpStaffList.value = []
            ElementPlus.ElMessage.error(err.message || "职位加载失败")
          } finally {
            mpLoading.value = false
          }
        }
        const mpRoleHasPerm = (role, value) => ((role && role.permissions) || []).indexOf(value) >= 0
        const toggleMpRolePerm = (role, value, on) => {
          if (!role || role.locked) return
          let list = (role.permissions || []).filter((p) => p !== value)
          if (on) list.push(value)
          if (list.indexOf("overview.read") < 0) list.unshift("overview.read")
          role.permissions = list
          mpRoles.value = mpRoles.value.slice()
        }
        const addMpRole = () => {
          const role = { id: "mpr" + Date.now().toString(36), name: "新职位", locked: false, permissions: ["overview.read"], enterpriseIds: [], projectIds: [] }
          mpRoles.value = mpRoles.value.concat([role])
          mpRoleEdit.value = role
        }
        const removeMpRole = (role) => {
          if (!role || role.locked) return
          mpRoles.value = mpRoles.value.filter((r) => r.id !== role.id)
          if (mpRoleEdit.value && mpRoleEdit.value.id === role.id) mpRoleEdit.value = null
        }
        const mpRolePermCount = (role) => ((role && role.permissions) || []).length
        const mpRoleAllEnterprises = (role) => !role || role.locked || !((role.enterpriseIds || []).length)
        const mpRoleHasEnterprise = (role, id) => ((role && role.enterpriseIds) || []).indexOf(id) >= 0
        const setMpRoleAllEnterprises = (role, on) => {
          if (!role || role.locked) return
          role.enterpriseIds = on ? [] : ((s.projEnterprises.value || []).slice(0, 1).map((e) => e.id))
          if (!on) {
            const allow = new Set(role.enterpriseIds)
            const pool = mpRoleProjectPool()
            role.projectIds = (role.projectIds || []).filter((pid) => {
              const hit = pool.find((p) => p.id === pid)
              return hit && allow.has(hit.enterpriseId)
            })
          }
          mpRoles.value = mpRoles.value.slice()
        }
        const toggleMpRoleEnterprise = (role, id, on) => {
          if (!role || role.locked) return
          let list = (role.enterpriseIds || []).filter((x) => x !== id)
          if (on) list.push(id)
          role.enterpriseIds = list
          if (list.length) {
            const allow = new Set(list)
            const pool = mpRoleProjectPool()
            role.projectIds = (role.projectIds || []).filter((pid) => {
              const hit = pool.find((p) => p.id === pid)
              return hit && allow.has(hit.enterpriseId)
            })
          }
          mpRoles.value = mpRoles.value.slice()
        }
        const mpRoleAllProjects = (role) => !role || role.locked || !((role.projectIds || []).length)
        const mpRoleHasProject = (role, id) => ((role && role.projectIds) || []).indexOf(id) >= 0
        const setMpRoleAllProjects = (role, on) => {
          if (!role || role.locked) return
          const pool = mpRoleProjectOptions(role)
          role.projectIds = on ? [] : (pool.slice(0, 1).map((p) => p.id))
          mpRoles.value = mpRoles.value.slice()
        }
        const toggleMpRoleProject = (role, id, on) => {
          if (!role || role.locked) return
          let list = (role.projectIds || []).filter((x) => x !== id)
          if (on) list.push(id)
          role.projectIds = list
          mpRoles.value = mpRoles.value.slice()
        }
        const mpScopeProjects = ref([])
        const loadMpScopeProjects = async () => {
          try {
            const qs = new URLSearchParams()
            qs.set("page", "1")
            qs.set("pageSize", "200")
            const res = await fetch("/api/v1/admin/study-projects?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "项目加载失败")
            const paged = s.unwrapPaged(json)
            mpScopeProjects.value = paged.items || []
          } catch (_err) {
            mpScopeProjects.value = []
          }
        }
        const mpRoleProjectPool = () => (mpScopeProjects.value && mpScopeProjects.value.length) ? mpScopeProjects.value : (s.projList.value || [])
        const mpRoleProjectOptions = (role) => {
          const rows = mpRoleProjectPool()
          if (mpRoleAllEnterprises(role)) return rows
          const allow = new Set((role && role.enterpriseIds) || [])
          return rows.filter((p) => allow.has(p.enterpriseId))
        }
        const mpRoleScopeLabel = (role) => {
          if (!role || role.locked) return "全部企业 / 全部项目"
          const pool = mpRoleProjectPool()
          const entLabel = mpRoleAllEnterprises(role) ? "全部企业" : (() => {
            const ids = role.enterpriseIds || []
            const names = ids.map((id) => {
              const hit = (s.projEnterprises.value || []).find((e) => e.id === id)
              return hit ? (hit.shortName || hit.name) : id
            }).filter(Boolean)
            return names.length ? names.join("、") : (ids.length + " 个企业")
          })()
          const projLabel = mpRoleAllProjects(role) ? "全部项目" : (() => {
            const ids = role.projectIds || []
            const names = ids.map((id) => {
              const hit = pool.find((p) => p.id === id)
              return hit ? hit.title : id
            }).filter(Boolean)
            return names.length ? names.join("、") : (ids.length + " 个项目")
          })()
          return entLabel + " / " + projLabel
        }
        const mpRoleNeedsScopeHint = (role) => {
          if (!role || role.locked) return false
          const perms = role.permissions || []
          const keys = ["study.", "mall.", "orders.", "finance.", "fleet."]
          return perms.some((p) => keys.some((k) => String(p).indexOf(k) === 0))
        }
        const staffRoleNeedsScopeHint = (role) => {
          if (!role || role.locked) return false
          const perms = role.permissions || []
          const keys = ["study.", "mall.", "orders.", "finance."]
          return perms.some((p) => keys.some((k) => String(p).indexOf(k) === 0))
        }
        const saveMpRoles = async () => {
          mpSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/mp-roles", { method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ roles: mpRoles.value }) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const data = s.unwrap(json) || {}
            if (data.roles) mpRoles.value = data.roles
            ElementPlus.ElMessage.success("职位已保存")
            await loadMpStaff()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            mpSaving.value = false
          }
        }
        const openMpStaffCreate = () => {
          const first = (mpRoles.value || []).find((r) => !r.locked) || (mpRoles.value || [])[0]
          mpStaffForm.value = { id: "", phone: "", name: "", password: "", roleId: first ? first.id : "OBSERVER", status: "ACTIVE" }
          mpStaffOpen.value = true
        }
        const openMpStaff = (row) => {
          mpStaffForm.value = { id: row.id, phone: row.phone, name: row.name, password: "", roleId: row.mpRole || "OBSERVER", status: row.status || "ACTIVE" }
          mpStaffOpen.value = true
        }
        const saveMpStaff = async () => {
          const f = mpStaffForm.value
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
          mpSaving.value = true
          try {
            const url = f.id ? ("/api/v1/admin/mp-staff/" + encodeURIComponent(f.id)) : "/api/v1/admin/mp-staff"
            const res = await fetch(url, { method: f.id ? "PUT" : "POST", headers: s.authHeaders(), body: JSON.stringify(f) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success("已保存")
            mpStaffOpen.value = false
            await loadMpStaff()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            mpSaving.value = false
          }
        }
        const deleteMpStaff = async (row) => {
          const target = row || mpStaffForm.value
          if (!target || !target.id) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后该手机号不能再登录平台控制台。", "删除管理账号", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          mpSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/mp-staff/" + encodeURIComponent(target.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            mpStaffOpen.value = false
            await loadMpStaff()
          } catch (err) {
            if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "删除失败")
          } finally {
            mpSaving.value = false
          }
        }
        const saveOperator = async () => {
          const f = opForm.value
          if (!f.id && !/^1[0-9]{10}$/.test(String(f.phone || ""))) {
            ElementPlus.ElMessage.warning("请输入11位手机号")
            return
          }
          if (!f.id && String(f.password || "").length < 6) {
            ElementPlus.ElMessage.warning("请设置至少 6 位密码")
            return
          }
          if (!f.mpAccess && !f.merchantAccess) {
            ElementPlus.ElMessage.warning("至少开通运维或入驻企业入口")
            return
          }
          if (f.merchantAccess && !String(f.enterpriseId || "").trim()) {
            ElementPlus.ElMessage.warning("入驻企业账号必须绑定企业")
            return
          }
          opSaving.value = true
          try {
            const url = f.id ? ("/api/v1/admin/operators/" + encodeURIComponent(f.id)) : "/api/v1/admin/operators"
            const res = await fetch(url, { method: f.id ? "PUT" : "POST", headers: s.authHeaders(), body: JSON.stringify(f) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success("已保存")
            opOpen.value = false
            await loadOperators()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            opSaving.value = false
          }
        }
        const emptyEntForm = () => ({ id: "", name: "", shortName: "", licenseNo: "", contactName: "", contactPhone: "", address: "", intro: "", status: "ACTIVE", studyCommission: 0, mallCommission: 0 })
        const entKeyword = ref("")
        const entList = ref([])
        const entLoading = ref(false)
        const entOpen = ref(false)
        const entSaving = ref(false)
        const entSelected = ref(null)
        const entForm = ref(emptyEntForm())
        const entStatusLabel = (s) => {
          const v = String(s || "").toUpperCase()
          if (v === "ACTIVE") return "合作中"
          if (v === "SUSPENDED") return "停用"
          if (v === "PENDING") return "待审"
          return v || "—"
        }
        const loadEntList = async () => {
          entLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (entKeyword.value.trim()) qs.set("keyword", entKeyword.value.trim())
            const res = await fetch("/api/v1/admin/enterprises?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            entList.value = s.unwrap(json) || []
            s.projEnterprises.value = entList.value
          } catch (err) {
            entList.value = []
            ElementPlus.ElMessage.error(err.message || "企业加载失败")
          } finally {
            entLoading.value = false
          }
        }
        const openEntCreate = () => {
          entSelected.value = null
          entForm.value = emptyEntForm()
          entOpen.value = true
        }
        const openEnt = async (row) => {
          entSelected.value = row
          entForm.value = {
            id: row.id, name: row.name || "", shortName: row.shortName || "", licenseNo: row.licenseNo || "",
            contactName: row.contactName || "", contactPhone: row.contactPhone || "", address: row.address || "",
            intro: row.intro || "", status: row.status || "ACTIVE",
            studyCommission: Number(row.studyCommission || 0), mallCommission: Number(row.mallCommission || 0)
          }
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
            const json = await res.json()
            if (res.ok) {
              const d = s.unwrap(json) || {}
              entSelected.value = d
              entForm.value = Object.assign({}, entForm.value, {
                name: d.name || "", shortName: d.shortName || "", licenseNo: d.licenseNo || "",
                contactName: d.contactName || "", contactPhone: d.contactPhone || "", address: d.address || "",
                intro: d.intro || "", status: d.status || "ACTIVE",
                studyCommission: Number(d.studyCommission || 0), mallCommission: Number(d.mallCommission || 0)
              })
              if (d.dicts) entDicts.value = Object.assign({}, s.emptyEntDicts(), d.dicts)
            }
          } catch (_err) {}
        }
        const saveEnt = async () => {
          const f = entForm.value
          if (String(f.name || "").trim().length < 2) {
            ElementPlus.ElMessage.warning("请填写企业名称")
            return
          }
          entSaving.value = true
          try {
            const url = f.id ? ("/api/v1/admin/enterprises/" + encodeURIComponent(f.id)) : "/api/v1/admin/enterprises"
            const res = await fetch(url, { method: f.id ? "PUT" : "POST", headers: s.authHeaders(), body: JSON.stringify(f) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const saved = s.unwrap(json) || {}
            ElementPlus.ElMessage.success("已保存")
            entOpen.value = false
            await loadEntList()
            if (saved.id && !f.id) s.enterEntWorkspace(saved)
            else if (s.opsEnt.value && s.opsEnt.value.id === (f.id || saved.id)) {
              s.opsEnt.value = { id: saved.id || f.id, name: saved.name || f.name, shortName: saved.shortName || f.shortName || f.name }
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            entSaving.value = false
          }
        }
        const deleteEnt = async () => {
          const f = entForm.value
          if (!f.id) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后该企业控制台账号将失去企业绑定。", "删除企业", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(f.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            entOpen.value = false
            await loadEntList()
            if (s.inEntWorkspace.value) s.leaveEntWorkspace()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const openEntOperator = () => {
          s.openPage("staff-users")
        }
        const staffRoles = ref([])
        const staffPermOptions = ref([])
        const staffList = ref([])
        const staffLoading = ref(false)
        const staffSaving = ref(false)
        const staffOpen = ref(false)
        const staffForm = ref({ id: "", phone: "", name: "", password: "", roleId: "", status: "ACTIVE" })
        const staffPermGroups = computed(() => buildPermTreeGroups(staffPermOptions.value))
        const staffRoleModuleChecked = (role, mod) => roleHasAllChildren(role, mod, s.roleHasPerm)
        const staffRoleModuleIndeterminate = (role, mod) => {
          const some = roleHasSomeChildren(role, mod, s.roleHasPerm)
          const all = roleHasAllChildren(role, mod, s.roleHasPerm)
          return some && !all
        }
        const staffRoleEdit = ref(null)
        const openStaffRole = (role) => { staffRoleEdit.value = role || null }
        const openStaffCreate = () => {
          const first = (staffRoles.value || []).find((r) => !r.locked) || (staffRoles.value || [])[0]
          staffForm.value = { id: "", phone: "", name: "", password: "", roleId: first ? first.id : "owner", status: "ACTIVE" }
          staffOpen.value = true
        }
        const openStaff = (row) => {
          staffForm.value = {
            id: row.id, phone: row.phone, name: row.name, password: "",
            roleId: row.merchantRoleId || "owner", status: row.status || "ACTIVE"
          }
          staffOpen.value = true
        }
        const openFinDetail = async (row) => {
          const eid = s.scopeEid.value
          if (!eid || !row || !row.id) return
          s.finDetailOpen.value = true
          s.finDetailLoading.value = true
          s.finDetail.value = { item: row, entity: null }
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(eid) + "/finance/" + encodeURIComponent(row.kind || "study") + "/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "流水详情加载失败")
            s.finDetail.value = s.unwrap(json) || json
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "流水详情加载失败")
          } finally {
            s.finDetailLoading.value = false
          }
        }
        const personalForm = ref({ name: "", phone: "", email: "", avatarUrl: "" })
        const personalSaving = ref(false)
        const personalAvatarUploading = ref(false)
        const personalPwd = ref({ currentPassword: "", newPassword: "", confirmPassword: "" })
        const personalPwdSaving = ref(false)
        const personalRoleChips = computed(() => {
          const a = s.account.value || {}
          const chips = []
          if (a.mpAccess) {
            chips.push({
              scope: "mp",
              name: a.mpRoleName || a.mpRole || "平台管理",
              title: "平台职位能力",
              perms: a.adminPermissions || []
            })
          }
          if (a.merchantAccess) {
            chips.push({
              scope: "merchant",
              name: a.merchantRoleName || "企业管理",
              title: "企业职位能力",
              perms: a.merchantPermissions || []
            })
          }
          return chips
        })
        const personalRoleText = computed(() => {
          const chips = personalRoleChips.value || []
          if (chips.length) return chips.map((c) => c.name).join(" · ")
          return "-"
        })
        const personalCapCount = computed(() => {
          const a = s.account.value || {}
          if (Array.isArray(a.capabilities) && a.capabilities.length) return a.capabilities.length
          let n = 0
          if (a.mpAccess) n += ((a.adminPermissions || []).length)
          if (a.merchantAccess) n += ((a.merchantPermissions || []).length)
          return n
        })
        const personalCapDialog = ref({ open: false, scope: "", title: "", name: "" })
        const personalCapTree = computed(() => {
          const a = s.account.value || {}
          const scope = personalCapDialog.value.scope || "mp"
          const caps = (Array.isArray(a.capabilities) ? a.capabilities : []).filter((c) => (c.scope === "merchant" ? "merchant" : "mp") === scope)
          const owned = {}
          const labelOf = {}
          const parentOf = {}
          const parentLabelOf = {}
          const groupOf = {}
          for (let i = 0; i < caps.length; i++) {
            const c = caps[i] || {}
            const v = String(c.value || "")
            if (!v) continue
            owned[v] = true
            labelOf[v] = c.label || v
            parentOf[v] = c.parent || c.group || "其他"
            parentLabelOf[v] = c.parentLabel || c.group || "其他"
            groupOf[v] = c.group || "其他"
          }
          const fallback = scope === "merchant" ? (a.merchantPermissions || []) : (a.adminPermissions || [])
          for (let i = 0; i < fallback.length; i++) {
            const v = String(fallback[i] || "")
            if (!v || owned[v]) continue
            owned[v] = true
            labelOf[v] = v
            parentOf[v] = "其他"
            parentLabelOf[v] = "其他"
            groupOf[v] = "其他"
          }
          const modules = {}
          const order = []
          Object.keys(owned).forEach((v) => {
            const pid = parentOf[v] || groupOf[v] || "其他"
            if (!modules[pid]) {
              modules[pid] = { value: pid, label: parentLabelOf[v] || pid, group: groupOf[v] || "其他", children: [] }
              order.push(pid)
            }
            modules[pid].children.push({ value: v, label: labelOf[v] || v, owned: true })
          })
          const byGroup = []
          const gmap = {}
          for (let i = 0; i < order.length; i++) {
            const mod = modules[order[i]]
            const g = mod.group || "其他"
            if (!gmap[g]) { gmap[g] = { name: g, modules: [] }; byGroup.push(gmap[g]) }
            gmap[g].modules.push(mod)
          }
          return byGroup
        })
        const personalCapScope = computed(() => {
          const a = s.account.value || {}
          const scope = personalCapDialog.value.scope || "mp"
          const resolveEnt = (id) => {
            const sid = String(id)
            const hit = (s.projEnterprises.value || []).find((e) => String(e.id) === sid)
              || (entList.value || []).find((e) => String(e.id) === sid)
            return hit ? (hit.shortName || hit.name || sid) : sid
          }
          const resolveProj = (id) => {
            const sid = String(id)
            const pools = [].concat(mpScopeProjects.value || [], s.projList.value || [])
            const hit = pools.find((p) => String(p.id) === sid)
            return hit ? (hit.title || sid) : sid
          }
          if (scope === "merchant") {
            const ids = a.merchantProjectIds || []
            const all = !ids.length
            return {
              showEnterprises: false,
              allEnterprises: true,
              enterprises: [],
              allProjects: all,
              projects: all ? [] : ids.map((id) => ({ id: String(id), name: resolveProj(id) }))
            }
          }
          const eids = a.mpEnterpriseIds || []
          const pids = a.mpProjectIds || []
          return {
            showEnterprises: true,
            allEnterprises: !eids.length,
            enterprises: eids.length ? eids.map((id) => ({ id: String(id), name: resolveEnt(id) })) : [],
            allProjects: !pids.length,
            projects: pids.length ? pids.map((id) => ({ id: String(id), name: resolveProj(id) })) : []
          }
        })
        const ensurePersonalScopeNames = async () => {
          const a = s.account.value || {}
          const scope = personalCapDialog.value.scope || "mp"
          try {
            if (scope === "mp") {
              if (!(s.projEnterprises.value || []).length && !(entList.value || []).length) {
                await loadEnterprises()
              }
              if ((a.mpProjectIds || []).length && !(mpScopeProjects.value || []).length) {
                await loadMpScopeProjects()
              }
            } else if ((a.merchantProjectIds || []).length) {
              if (!(mpScopeProjects.value || []).length && !(s.projList.value || []).length) {
                await loadMpScopeProjects()
              }
            }
          } catch (_err) {}
        }
        const openPersonalCapDialog = async (chip) => {
          if (!chip) return
          personalCapDialog.value = {
            open: true,
            scope: chip.scope,
            title: chip.title || "职位能力",
            name: chip.name || ""
          }
          await ensurePersonalScopeNames()
        }
        const closePersonalCapDialog = () => {
          personalCapDialog.value = { open: false, scope: "", title: "", name: "" }
        }
        const personalCapGroups = computed(() => [])
        const applyPersonalAccount = (a) => {
          const row = a || s.account.value || {}
          personalForm.value = {
            name: row.name || "",
            phone: row.phone || "",
            email: row.email || "",
            avatarUrl: row.avatarUrl || ""
          }
        }
        const persistAccount = (a) => {
          s.account.value = a
          try { localStorage.setItem(s.USER_KEY, JSON.stringify(a)) } catch (_err) {}
          applyPersonalAccount(a)
        }
        const refreshPersonal = async () => {
          applyPersonalAccount(s.account.value)
          try {
            const res = await fetch("/api/v1/console/auth/me", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载个人资料失败")
            const data = s.unwrap(json) || json
            persistAccount(data)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "加载个人资料失败")
          }
        }
        const savePersonal = async () => {
          const f = personalForm.value || {}
          if (!String(f.name || "").trim()) {
            ElementPlus.ElMessage.warning("请填写姓名")
            return
          }
          personalSaving.value = true
          try {
            const res = await fetch("/api/v1/console/auth/profile", {
              method: "PATCH",
              headers: Object.assign({}, s.authHeaders(), { "Content-Type": "application/json" }),
              body: JSON.stringify({
                name: String(f.name || "").trim(),
                email: String(f.email || "").trim(),
                avatarUrl: String(f.avatarUrl || "").trim()
              })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const data = s.unwrap(json) || json
            persistAccount(data)
            ElementPlus.ElMessage.success("资料已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            personalSaving.value = false
          }
        }
        const uploadPersonalAvatar = async (option) => {
          const file = option && option.file
          if (!file) return
          personalAvatarUploading.value = true
          try {
            const fd = new FormData()
            fd.append("file", file)
            const res = await fetch("/api/v1/console/auth/avatar", {
              method: "POST",
              headers: { Authorization: "Bearer " + s.token() },
              body: fd
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "上传失败")
            const data = s.unwrap(json) || json
            if (data.account) persistAccount(data.account)
            else if (data.avatarUrl) {
              personalForm.value.avatarUrl = data.avatarUrl
              const next = Object.assign({}, s.account.value || {}, { avatarUrl: data.avatarUrl })
              persistAccount(next)
            }
            ElementPlus.ElMessage.success("头像已更新")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          } finally {
            personalAvatarUploading.value = false
          }
        }
        const clearPersonalAvatar = async () => {
          personalForm.value.avatarUrl = ""
          await savePersonal()
        }
        const savePersonalPassword = async () => {
          const f = personalPwd.value || {}
          if (String(f.currentPassword || "").length < 6) {
            ElementPlus.ElMessage.warning("请输入当前密码")
            return
          }
          if (String(f.newPassword || "").length < 6) {
            ElementPlus.ElMessage.warning("新密码至少 6 位")
            return
          }
          if (String(f.newPassword || "") !== String(f.confirmPassword || "")) {
            ElementPlus.ElMessage.warning("两次输入的新密码不一致")
            return
          }
          personalPwdSaving.value = true
          try {
            const res = await fetch("/api/v1/console/auth/password", {
              method: "POST",
              headers: Object.assign({}, s.authHeaders(), { "Content-Type": "application/json" }),
              body: JSON.stringify({
                currentPassword: String(f.currentPassword || ""),
                newPassword: String(f.newPassword || "")
              })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "修改失败")
            personalPwd.value = { currentPassword: "", newPassword: "", confirmPassword: "" }
            ElementPlus.ElMessage.success("密码已修改")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "修改失败")
          } finally {
            personalPwdSaving.value = false
          }
        }
  Object.assign(s, {
    userKeyword,
    userFilter,
    userPage,
    userPageSize,
    userTotal,
    userStats,
    userRecords,
    userRecordsTotal,
    userRecordsPage,
    userRecordsKind,
    userLoading,
    userSaving,
    userList,
    userDetail,
    userOpen,
    userEditing,
    userPanel,
    userForm,
    userLogPage,
    userLogTotal,
    userLogs,
    userSel,
    roleSel,
    staffSel,
    dual,
    filteredUsers,
    openMallOrder,
    userSummary,
    loadUsers,
    openUser,
    closeUser,
    loadUserLogs,
    openPanel,
    loadUserRecords,
    deleteLog,
    userRecordEdit,
    userRecordForm,
    currentRecordKind,
    refreshUserSummary,
    mutateRecord,
    canCancelRecord,
    canDeleteRecord,
    cancelRecord,
    deleteRecord,
    openRecordEdit,
    saveRecordEdit,
    closeRecordEdit,
    clearLogs,
    startEdit,
    cancelEdit,
    saveUser,
    deleteUserAccount,
    toggleStatus,
    openMallCreate,
    openMall,
    openMallComments,
    openMallLogs,
    openMallEdit,
    loadEnterprises,
    openProjCreate,
    openSpotGateQr,
    openH5Template,
    openResourceUrl,
    openProj,
    openProjNotices,
    openProjShop,
    openProjReview,
    openBooking,
    openBookingUser,
    openBkCreate,
    openDriverCreate,
    openDriver,
    openRentalChat,
    entDicts,
    entDictDraft,
    openNoticeCreate,
    openNotice,
    openReviewItem,
    openPostCreate,
    openPost,
    opList,
    opRoles,
    opLoading,
    opOpen,
    opSaving,
    opForm,
    roleLabel,
    loadOperators,
    openOpCreate,
    openOp,
    mpRoles,
    mpPermOptions,
    mpStaffList,
    mpLoading,
    mpSaving,
    mpRoleEdit,
    mpStaffOpen,
    mpStaffForm,
    mpRoleSel,
    mpUserSel,
    buildPermTreeGroups,
    mpPermGroups,
    roleChildValues,
    roleHasAllChildren,
    roleHasSomeChildren,
    mpRoleModuleChecked,
    mpRoleModuleIndeterminate,
    toggleMpRoleModule,
    unlockedMpRoles,
    loadMpStaff,
    mpRoleHasPerm,
    toggleMpRolePerm,
    addMpRole,
    removeMpRole,
    mpRolePermCount,
    mpRoleAllEnterprises,
    mpRoleHasEnterprise,
    setMpRoleAllEnterprises,
    toggleMpRoleEnterprise,
    mpRoleAllProjects,
    mpRoleHasProject,
    setMpRoleAllProjects,
    toggleMpRoleProject,
    mpScopeProjects,
    loadMpScopeProjects,
    mpRoleProjectPool,
    mpRoleProjectOptions,
    mpRoleScopeLabel,
    mpRoleNeedsScopeHint,
    staffRoleNeedsScopeHint,
    saveMpRoles,
    openMpStaffCreate,
    openMpStaff,
    saveMpStaff,
    deleteMpStaff,
    saveOperator,
    emptyEntForm,
    entKeyword,
    entList,
    entLoading,
    entOpen,
    entSaving,
    entSelected,
    entForm,
    entStatusLabel,
    loadEntList,
    openEntCreate,
    openEnt,
    saveEnt,
    deleteEnt,
    openEntOperator,
    staffRoles,
    staffPermOptions,
    staffList,
    staffLoading,
    staffSaving,
    staffOpen,
    staffForm,
    staffPermGroups,
    staffRoleModuleChecked,
    staffRoleModuleIndeterminate,
    staffRoleEdit,
    openStaffRole,
    openStaffCreate,
    openStaff,
    openFinDetail,
    personalForm,
    personalSaving,
    personalAvatarUploading,
    personalPwd,
    personalPwdSaving,
    personalRoleChips,
    personalRoleText,
    personalCapCount,
    personalCapDialog,
    personalCapTree,
    personalCapScope,
    ensurePersonalScopeNames,
    openPersonalCapDialog,
    closePersonalCapDialog,
    personalCapGroups,
    applyPersonalAccount,
    persistAccount,
    refreshPersonal,
    savePersonal,
    uploadPersonalAvatar,
    clearPersonalAvatar,
    savePersonalPassword
  })
}
