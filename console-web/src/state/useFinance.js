import { ref, computed } from "vue"

export function useFinance(s) {
        const wdSel = ref([])
        const FIN_RIGHT_W_KEY = "mqlt-fin-right-width"
        const finRightWidth = ref(s.readStoredPx(FIN_RIGHT_W_KEY, 360, 260, 520))
        const wdList = ref([])
        const wdLoading = ref(false)
        const wdStatus = ref("PENDING")
        const wdTotal = ref(0)
        const wdStats = ref({ pending: 0 })
        const moneyYuan = (v) => {
          const n = Number(v)
          if (!Number.isFinite(n)) return "¥0"
          return "¥" + n.toFixed(n % 1 ? 2 : 0)
        }
        const platformDicts = ref(null)
        const currentMonth = () => {
          try {
            const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" }).formatToParts(new Date())
            const y = (parts.find((p) => p.type === "year") || {}).value
            const m = (parts.find((p) => p.type === "month") || {}).value
            return y + "-" + m
          } catch (_e) {
            const ms = Date.now() + 8 * 3600000
            const x = new Date(ms)
            return x.getUTCFullYear() + "-" + String(x.getUTCMonth() + 1).padStart(2, "0")
          }
        }
        const finMonth = ref(currentMonth())
        const finKind = ref("all")
        const finLoading = ref(false)
        const finSummary = ref({ studyGross: 0, mallGross: 0, studyCount: 0, mallCount: 0, studyCommission: 0, mallCommission: 0, platformTake: 0, enterpriseNet: 0 })
        const finRates = ref({ studyCommission: 0, mallCommission: 0 })
        const finItems = ref([])
        const platFin = ref({ summary: {}, enterprises: [], rentalItems: [] })
        const platFinLoading = ref(false)
        const platFinTab = ref("enterprises")
        const wdReviewTab = ref("enterprise")
        const finGroups = computed(() => {
          const list = finItems.value || []
          const map = {}
          const order = []
          for (let i = 0; i < list.length; i++) {
            const row = list[i]
            const id = String(row.projectId || "") || "_none"
            if (!map[id]) {
              map[id] = { id, title: row.projectTitle || "未分项目", coverUrl: "", items: [], study: 0, mall: 0, net: 0 }
              order.push(map[id])
            }
            map[id].items.push(row)
            if (!map[id].coverUrl) map[id].coverUrl = String(row.projectCoverUrl || row.coverUrl || "")
            const amt = Number(row.amount || 0)
            const net = Number(row.enterpriseNet != null ? row.enterpriseNet : amt)
            if (row.kind === "mall") map[id].mall += amt
            else map[id].study += amt
            map[id].net += net
          }
          return order
        })
        const loadEntFinance = async () => {
          const id = s.scopeEid.value
          if (!id) { finItems.value = []; return }
          finLoading.value = true
          try {
            const qs = new URLSearchParams()
            qs.set("month", finMonth.value || currentMonth())
            if (finKind.value && finKind.value !== "all") qs.set("kind", finKind.value)
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/finance?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "财务加载失败")
            const data = s.unwrap(json) || {}
            finSummary.value = data.summary || finSummary.value
            finRates.value = data.rates || { studyCommission: 0, mallCommission: 0 }
            finItems.value = data.items || []
            if (data.month) finMonth.value = data.month
            if (data.wallet) finWallet.value = data.wallet
            await loadPayAccounts()
            await loadEntWds()
          } catch (err) {
            finItems.value = []
            ElementPlus.ElMessage.error(err.message || "财务加载失败")
          } finally {
            finLoading.value = false
          }
        }
        const finWallet = ref({ earned: 0, pending: 0, withdrawn: 0, available: 0 })
        const finDetailOpen = ref(false)
        const finDetailLoading = ref(false)
        const finDetail = ref(null)
        const finCoverSrc = (url) => {
          const u = String(url || "")
          if (!u) return ""
          if (u.indexOf("http") === 0 || u.charAt(0) === "/") return u
          if (u.indexOf("public/mqlt/") === 0) return "http://127.0.0.1:8080/" + u.slice(12)
          return "http://127.0.0.1:8080/" + u
        }
        const closeFinDetail = () => {
          finDetailOpen.value = false
          finDetail.value = null
          finDetailLoading.value = false
        }
        const payAccounts = ref([])
        const ewdList = ref([])
        const ewdForm = ref({ amount: "", accountId: "", note: "" })
        const accForm = ref({ label: "", bankName: "", accountName: "", accountNo: "", isDefault: true })
        const finSub = ref("ledger")
        const ewdPlat = ref([])
        const ewdPlatStatus = ref("PENDING")
        const ewdPlatPending = ref(0)
        const loadPayAccounts = async () => {
          const id = s.scopeEid.value
          if (!id) { payAccounts.value = []; return }
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/payout-accounts", { headers: s.authHeaders() })
            const json = await res.json()
            payAccounts.value = s.unwrap(json) || []
            if (!ewdForm.value.accountId && payAccounts.value.length) {
              const def = payAccounts.value.find((a) => a.isDefault) || payAccounts.value[0]
              ewdForm.value.accountId = def.id
            }
          } catch (_err) { payAccounts.value = [] }
        }
        const loadEntWds = async () => {
          const id = s.scopeEid.value
          if (!id) { ewdList.value = []; return }
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/withdrawals", { headers: s.authHeaders() })
            const json = await res.json()
            const data = s.unwrap(json) || {}
            ewdList.value = data.items || []
            if (data.wallet) finWallet.value = data.wallet
          } catch (_err) { ewdList.value = [] }
        }
        const savePayAccount = async () => {
          const id = s.scopeEid.value
          if (!id) return
          if (!accForm.value.bankName || !accForm.value.accountName || !accForm.value.accountNo) {
            ElementPlus.ElMessage.warning("请填写银行、户名和账号")
            return
          }
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/payout-accounts", {
              method: "POST", headers: s.authHeaders(), body: JSON.stringify(accForm.value)
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success("打款信息已保存")
            accForm.value = { label: "", bankName: "", accountName: "", accountNo: "", isDefault: true }
            await loadPayAccounts()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          }
        }
        const deletePayAccount = async (row) => {
          const id = s.scopeEid.value
          if (!id || !row) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除该打款账户？", "删除", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/payout-accounts/" + encodeURIComponent(row.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            await loadPayAccounts()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const applyEntWithdraw = async () => {
          const id = s.scopeEid.value
          if (!id) return
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id) + "/withdrawals", {
              method: "POST", headers: s.authHeaders(),
              body: JSON.stringify({ amount: Number(ewdForm.value.amount || 0), accountId: ewdForm.value.accountId, note: ewdForm.value.note })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "申请失败")
            ElementPlus.ElMessage.success("提现已提交，等待平台打款")
            ewdForm.value.amount = ""
            ewdForm.value.note = ""
            await loadEntWds()
            await loadEntFinance()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "申请失败")
          }
        }
        const loadPlatEwd = async () => {
          try {
            const qs = new URLSearchParams()
            if (ewdPlatStatus.value && ewdPlatStatus.value !== "all") qs.set("status", ewdPlatStatus.value)
            const res = await fetch("/api/v1/admin/enterprise-withdrawals?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            const data = s.unwrap(json) || {}
            ewdPlat.value = data.items || []
            ewdPlatPending.value = Number(data.pending || 0)
          } catch (err) {
            ewdPlat.value = []
            ElementPlus.ElMessage.error(err.message || "加载失败")
          }
        }
        const reviewEntWithdraw = async (row, action) => {
          const label = action === "approve" ? "通过并打款" : "拒绝"
          const ok = await ElementPlus.ElMessageBox.confirm("确认" + label + " ¥" + Number(row.amount || 0).toFixed(2) + "？", "企业提现", { confirmButtonText: label, cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const res = await fetch("/api/v1/admin/enterprise-withdrawals/" + encodeURIComponent(row.id) + "/review", {
              method: "POST", headers: s.authHeaders(), body: JSON.stringify({ action })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "处理失败")
            ElementPlus.ElMessage.success("已处理")
            await loadPlatEwd()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "处理失败")
          }
        }
        const platShare = computed(() => {
          const s = (platFin.value && platFin.value.summary) || {}
          const study = Number(s.studyCommission || 0)
          const mall = Number(s.mallCommission || 0)
          // P0-4: 平台收入构成用租车抽成，不用 GMV
          const rental = Number(s.rentalCommission != null ? s.rentalCommission : (s.rentalIncome || 0))
          const rentalGmv = Number(s.rentalGmv || 0)
          const total = study + mall + rental
          const pct = (n) => total > 0 ? Math.round(n * 1000 / total) / 10 : 0
          const studyPct = pct(study)
          const mallPct = pct(mall)
          const rentalPct = total > 0 ? Math.round((1000 - studyPct * 10 - mallPct * 10)) / 10 : 0
          const donut = total > 0
            ? ("conic-gradient(#1A73E8 0 " + studyPct + "%, #6B7280 " + studyPct + "% " + (studyPct + mallPct) + "%, #DC2626 " + (studyPct + mallPct) + "% 100%)")
            : "conic-gradient(#E5E7EB 0 100%)"
          return { study, mall, rental, rentalGmv, total, studyPct, mallPct, rentalPct, donut }
        })
        const platBarMax = computed(() => {
          const rows = (platFin.value && platFin.value.enterprises) || []
          let m = 0
          for (let i = 0; i < rows.length; i++) {
            const n = Number(rows[i].studyGross || 0) + Number(rows[i].mallGross || 0)
            if (n > m) m = n
          }
          return m || 1
        })
        const cutDefaults = ref({ studyCommission: 0, mallCommission: 0, driverCommission: 0 })
        const cutEnterprises = ref([])
        const cutDrivers = ref([])
        const cutLoading = ref(false)
        const cutSaving = ref(false)
        const cutTab = ref("enterprise")
        const loadCommission = async () => {
          cutLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/commission", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "抽成加载失败")
            const data = s.unwrap(json) || {}
            cutDefaults.value = Object.assign({ studyCommission: 0, mallCommission: 0, driverCommission: 0 }, data.defaults || {})
            cutEnterprises.value = (data.enterprises || []).map((e) => Object.assign({}, e, {
              studyCommission: Number(e.studyCommission || 0),
              mallCommission: Number(e.mallCommission || 0)
            }))
            cutDrivers.value = (data.drivers || []).map((d) => Object.assign({}, d, {
              commissionRate: d.commissionRate == null ? "" : String(d.commissionRate)
            }))
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "抽成加载失败")
          } finally {
            cutLoading.value = false
          }
        }
        const saveCutDefaults = async () => {
          cutSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/commission/defaults", {
              method: "PUT", headers: s.authHeaders(),
              body: JSON.stringify({
                studyCommission: Number(cutDefaults.value.studyCommission || 0),
                mallCommission: Number(cutDefaults.value.mallCommission || 0),
                driverCommission: Number(cutDefaults.value.driverCommission || 0)
              })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success("默认抽成已保存，新建企业会套用")
            await loadCommission()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            cutSaving.value = false
          }
        }
        const saveCutEnterprise = async (row) => {
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(row.id), {
              method: "PUT", headers: s.authHeaders(),
              body: JSON.stringify({ studyCommission: Number(row.studyCommission || 0), mallCommission: Number(row.mallCommission || 0) })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success((row.shortName || row.name) + " 抽成已更新")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          }
        }
        const saveCutDriver = async (row) => {
          try {
            const raw = String(row.commissionRate || "").trim()
            const res = await fetch("/api/v1/admin/drivers/" + encodeURIComponent(row.id), {
              method: "PUT", headers: s.authHeaders(),
              body: JSON.stringify({ commissionRate: raw === "" ? null : Number(raw) })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success((row.realName || "司机") + " 抽成已更新")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          }
        }
        const ov = ref({ metrics: { users: 0, products: 0, studyProjects: 0, orders: 0, bookings: 0, revenue: "0" }, recentOrders: [] })
        const loadOverview = async () => {
          try {
            const res = await fetch("/api/v1/admin/overview", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) return
            ov.value = s.unwrap(json) || ov.value
          } catch (_err) {}
        }
        const loadPlatFinance = async () => {
          platFinLoading.value = true
          try {
            const qs = new URLSearchParams()
            qs.set("month", finMonth.value || currentMonth())
            const res = await fetch("/api/v1/admin/finance/platform?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "财务加载失败")
            platFin.value = s.unwrap(json) || { summary: {}, enterprises: [], rentalItems: [] }
            if (platFin.value.month) finMonth.value = platFin.value.month
          } catch (err) {
            platFin.value = { summary: {}, enterprises: [], rentalItems: [] }
            ElementPlus.ElMessage.error(err.message || "财务加载失败")
          } finally {
            platFinLoading.value = false
          }
        }
  Object.assign(s, {
    wdSel,
    FIN_RIGHT_W_KEY,
    finRightWidth,
    wdList,
    wdLoading,
    wdStatus,
    wdTotal,
    wdStats,
    moneyYuan,
    platformDicts,
    currentMonth,
    finMonth,
    finKind,
    finLoading,
    finSummary,
    finRates,
    finItems,
    platFin,
    platFinLoading,
    platFinTab,
    wdReviewTab,
    finGroups,
    loadEntFinance,
    finWallet,
    finDetailOpen,
    finDetailLoading,
    finDetail,
    finCoverSrc,
    closeFinDetail,
    payAccounts,
    ewdList,
    ewdForm,
    accForm,
    finSub,
    ewdPlat,
    ewdPlatStatus,
    ewdPlatPending,
    loadPayAccounts,
    loadEntWds,
    savePayAccount,
    deletePayAccount,
    applyEntWithdraw,
    loadPlatEwd,
    reviewEntWithdraw,
    platShare,
    platBarMax,
    cutDefaults,
    cutEnterprises,
    cutDrivers,
    cutLoading,
    cutSaving,
    cutTab,
    loadCommission,
    saveCutDefaults,
    saveCutEnterprise,
    saveCutDriver,
    ov,
    loadOverview,
    loadPlatFinance
  })
}
