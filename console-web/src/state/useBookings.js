import { ref, computed } from "vue"

export function useBookings(s) {
        const bkSel = ref([])
        const bookingLabel = (s) => {
          const v = String(s || "").toLowerCase()
          if (v === "booked") return "待出行"
          if (v === "completed") return "已完成"
          if (v === "cancelled" || v === "canceled") return "已取消"
          if (v === "unpaid" || v === "pending") return "待支付"
          return s || "—"
        }
        const tripDates = (plan) => {
          if (!plan) return ""
          const keys = []
          const raw = plan.dayKeys || []
          for (let i = 0; i < raw.length; i++) {
            const k = String(raw[i] || "").trim()
            if (k) keys.push(k)
          }
          if (!keys.length && plan.days) {
            for (let i = 0; i < plan.days.length; i++) {
              const k = plan.days[i] && plan.days[i].dayKey ? String(plan.days[i].dayKey) : ""
              if (k) keys.push(k)
            }
          }
          keys.sort()
          if (!keys.length) return ""
          if (keys.length === 1) return s.prettyDay(keys[0])
          if (keys.length === 2) return s.prettyDay(keys[0]) + "、" + s.prettyDay(keys[1])
          return s.prettyDay(keys[0]) + " 等" + keys.length + "天"
        }
        const tripLabel = (b) => {
          const days = (b && b.days) || []
          const dates = tripDates(b && b.tripPlan)
          let stops = 0
          for (let i = 0; i < days.length; i++) stops += ((days[i].spots || []).length)
          if (dates && stops) return dates + " · " + stops + "站"
          if (dates) return dates
          if (stops) return stops + "站"
          return "—"
        }
        const RIDE_OPTIONS = [
          { id: "none", label: "自行前往" },
          { id: "range_s", label: "1–7人 · 小车" },
          { id: "range_m", label: "8–14人 · 中巴" },
          { id: "range_l", label: "15人以上 · 大巴" }
        ]
        const VEHICLE_OPTIONS = [
          { id: "van7", label: "7座商务", seats: 7 },
          { id: "mpv9", label: "9座轻客", seats: 9 },
          { id: "bus14", label: "14座中巴", seats: 14 },
          { id: "bus20", label: "20座大巴", seats: 20 }
        ]
        const emptyBkRide = () => ({
          optionId: "none", driverName: "", driverPhone: "", driverWechat: "",
          vehicleName: "", plateNo: "", pickupAddress: "", fee: ""
        })
        const rideLabel = (b) => {
          if (b && b.rental && b.rental.optionLabel) return b.rental.optionLabel
          return "自行前往"
        }
        const orderLabel = (s) => {
          const v = String(s || "").toUpperCase()
          if (v === "UNPAID") return "待支付"
          if (v === "PAID" || v === "UNSHIPPED") return "待发货"
          if (v === "UNRECEIVED" || v === "SHIPPED") return "待收货"
          if (v === "UNUSED") return "待使用"
          if (v === "COMPLETED") return "已完成"
          if (v === "CANCELLED" || v === "CANCELED") return "已取消"
          if (v === "REFUNDED") return "已退款"
          return s || "—"
        }
        const bkKeyword = ref("")
        const bkFilter = ref("all")
        const bkProjectId = ref("")
        const bkPage = ref(1)
        const bkTotal = ref(0)
        const bkStats = ref({ unpaid: 0, booked: 0, completed: 0, cancelled: 0 })
        const bkList = ref([])
        const bkLoading = ref(false)
        const bkOpen = ref(false)
        const bkSelected = ref(null)
        const bkCreateOpen = ref(false)
        const bkCreate = ref({ userId: "", projectId: "", status: "BOOKED", userKeyword: "", hits: [], dayKeys: [], spotIds: [], ride: emptyBkRide() })
        const bkTrip = ref([])
        const bkTripAddDate = ref("")
        const bkRide = ref(emptyBkRide())
        const bkGroupMode = ref("byDate")
        const bkDateFilter = ref("")
        const shanghaiTomorrow = () => {
          const today = s.shanghaiToday()
          const p = today.split("-").map((x) => parseInt(x, 10))
          const dt = new Date(Date.UTC(p[0], p[1]-1, p[2])); dt.setUTCDate(dt.getUTCDate()+1)
          return dt.getUTCFullYear() + "-" + String(dt.getUTCMonth()+1).padStart(2,"0") + "-" + String(dt.getUTCDate()).padStart(2,"0")
        }
        const bookingDayKeys = (b) => {
          const keys = []
          const seen = {}
          const push = (k) => {
            const s = String(k || "").trim()
            if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || seen[s]) return
            seen[s] = true
            keys.push(s)
          }
          const days = (b && b.days) || []
          for (let i = 0; i < days.length; i++) push(days[i] && days[i].dayKey)
          if (b && b.tripPlan && Array.isArray(b.tripPlan.dayKeys)) {
            for (let i = 0; i < b.tripPlan.dayKeys.length; i++) push(b.tripPlan.dayKeys[i])
          }
          if (b && b.appointmentDayKey) push(b.appointmentDayKey)
          keys.sort()
          return keys
        }
        const appointmentDayOf = (b) => {
          const keys = bookingDayKeys(b)
          return keys.length ? keys[0] : ""
        }
        const bookingHasDay = (b, dayKey) => {
          if (!dayKey) return true
          return bookingDayKeys(b).indexOf(dayKey) >= 0
        }
        const bkDayTitle = (k) => {
          if (k === "unknown" || !k) return "未排期"
          const today = s.shanghaiToday()
          const tomorrow = shanghaiTomorrow()
          const base = s.prettyDay(k)
          if (k === today) return "今天 · " + base
          if (k === tomorrow) return "明天 · " + base
          return base
        }
        const setBkDateFilter = (k) => {
          const next = (k && k === bkDateFilter.value) ? "" : (k || "")
          bkDateFilter.value = next
          bkPage.value = 1
          loadBookings()
        }
        const clearBkDateFilter = () => { bkDateFilter.value = ""; bkPage.value = 1; loadBookings() }
        const bkDateChips = computed(() => {
          const today = s.shanghaiToday()
          const tomorrow = shanghaiTomorrow()
          const seen = {}
          const chips = []
          const add = (k, label) => {
            if (!k || seen[k]) return
            seen[k] = true
            chips.push({ key: k, label: label || s.prettyDay(k) })
          }
          add(today, "今天")
          add(tomorrow, "明天")
          const extras = []
          const list = bkList.value || []
          for (let i = 0; i < list.length; i++) {
            const keys = bookingDayKeys(list[i])
            for (let j = 0; j < keys.length; j++) extras.push(keys[j])
          }
          extras.sort()
          for (let i = 0; i < extras.length; i++) add(extras[i], s.prettyDay(extras[i]))
          return chips
        })
        const bkGroupedSections = computed(() => {
          const list = bkList.value || []
          if (bkGroupMode.value !== "byDate") return [{ key: "flat", title: "按下单时间", items: list, count: list.length }]
          const dayFilter = String(bkDateFilter.value || "").trim()
          const map = {}
          const order = []
          for (let i = 0; i < list.length; i++) {
            const b = list[i]
            if (dayFilter) {
              if (!bookingHasDay(b, dayFilter)) continue
              if (!map[dayFilter]) { map[dayFilter] = []; order.push(dayFilter) }
              map[dayFilter].push(b)
              continue
            }
            const k = appointmentDayOf(b) || "unknown"
            if (!map[k]) { map[k] = []; order.push(k) }
            map[k].push(b)
          }
          order.sort()
          const sections = order.map((k) => ({ key: k, title: bkDayTitle(k), items: map[k], count: map[k].length }))
          if (dayFilter && !sections.length) return [{ key: dayFilter, title: bkDayTitle(dayFilter), items: [], count: 0 }]
          return sections
        })
        const multiDayBadge = (b) => {
          const days = (b && b.days) || []
          const n = days.length || ((b && b.tripPlan && b.tripPlan.dayKeys && b.tripPlan.dayKeys.length) || 0)
          return n > 1 ? ("+" + (n - 1) + "天") : ""
        }
        const loadBookings = async () => {
          bkLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (bkKeyword.value.trim()) qs.set("keyword", bkKeyword.value.trim())
            if (bkProjectId.value) qs.set("projectId", bkProjectId.value)
            if (bkFilter.value && bkFilter.value !== "all") qs.set("filter", bkFilter.value)
            if (bkGroupMode.value === "byDate" && bkDateFilter.value) qs.set("appointmentDate", bkDateFilter.value)
            qs.set("page", String(bkPage.value || 1))
            qs.set("pageSize", "20")
            s.scopeQs(qs)
            const res = await fetch("/api/v1/admin/bookings?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "预约加载失败")
            const paged = s.unwrapPaged(json)
            bkList.value = paged.items
            bkTotal.value = paged.total
            const stats = (s.unwrap(json) && s.unwrap(json).stats) || {}
            bkStats.value = {
              unpaid: Number(stats.unpaid || 0),
              booked: Number(stats.booked || 0),
              completed: Number(stats.completed || 0),
              cancelled: Number(stats.cancelled || 0)
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "预约加载失败")
            bkList.value = []
          } finally {
            bkLoading.value = false
          }
        }
        const fillBkTrip = (row) => {
          const days = (row && row.days) || []
          bkTrip.value = days.map((d) => ({
            dayKey: d.dayKey,
            spotIds: ((d.spots || []).map((s) => s.id)).filter(Boolean)
          }))
          bkTripAddDate.value = ""
        }
        const fillBkRide = (row) => {
          const r = (row && row.rental) || {}
          bkRide.value = {
            optionId: r.optionId || "none",
            driverName: r.driverName || "",
            driverPhone: r.driverPhone || "",
            driverWechat: r.driverWechat || "",
            vehicleName: r.vehicleName || "",
            plateNo: r.plateNo || "",
            pickupAddress: r.pickupAddress || "",
            fee: r.fee || ""
          }
        }
        const addBkTripDay = (key) => {
          const k = String(key || bkTripAddDate.value || "").trim()
          if (!k) return
          if ((bkTrip.value || []).some((d) => d.dayKey === k)) {
            ElementPlus.ElMessage.warning("该日期已在行程中")
            return
          }
          bkTrip.value = (bkTrip.value || []).concat([{ dayKey: k, spotIds: [] }])
          bkTripAddDate.value = ""
        }
        const removeBkTripDay = (key) => {
          bkTrip.value = (bkTrip.value || []).filter((d) => d.dayKey !== key)
        }
        const saveBkTrip = async () => {
          const days = (bkTrip.value || []).filter((d) => d.dayKey)
          const tripPlan = {
            dayKeys: days.map((d) => d.dayKey),
            days: days.map((d) => ({ dayKey: d.dayKey, spotIds: d.spotIds || [] }))
          }
          try {
            await mutateBooking("update", { status: (bkSelected.value && bkSelected.value.status) || "BOOKED", tripPlan })
            ElementPlus.ElMessage.success("行程已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          }
        }
        const saveBkRide = async () => {
          try {
            await mutateBooking("update", {
              status: (bkSelected.value && bkSelected.value.status) || "BOOKED",
              rental: Object.assign({}, bkRide.value, { rentalOptionId: bkRide.value.optionId })
            })
            ElementPlus.ElMessage.success("交通信息已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          }
        }
        const closeBooking = () => { bkOpen.value = false; bkSelected.value = null }
        const bkDayRedeemed = (key) => {
          const days = (bkSelected.value && bkSelected.value.days) || []
          const hit = days.find((d) => d.dayKey === key)
          return !!(hit && hit.redeemed)
        }
        const redeemBkDay = async (dayKey, undo) => {
          const b = bkSelected.value
          if (!b) return
          try {
            const res = await fetch("/api/v1/admin/bookings/" + encodeURIComponent(b.id) + "/redeem", {
              method: "POST",
              headers: s.authHeaders(),
              body: JSON.stringify({ dayKey, undo: !!undo })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "核销失败")
            ElementPlus.ElMessage.success(undo ? "已撤销核销" : "已核销")
            await loadBookings()
            const hit = (bkList.value || []).find((x) => x.id === b.id)
            if (hit) {
              bkSelected.value = hit
              fillBkTrip(hit)
              fillBkRide(hit)
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "核销失败")
          }
        }
        const mutateBooking = async (action, body) => {
          const b = bkSelected.value
          if (!b) return
          const uid = b.user && b.user.id
          if (!uid) return
          let method = "PUT"
          let url = "/api/v1/admin/users/" + encodeURIComponent(uid) + "/records/bookings/" + encodeURIComponent(b.id)
          if (action === "cancel") { method = "POST"; url += "/cancel" }
          else if (action === "delete") method = "DELETE"
          const res = await fetch(url, {
            method,
            headers: Object.assign({}, s.authHeaders(), { "Content-Type": "application/json" }),
            body: action === "update" ? JSON.stringify(body || {}) : undefined
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "操作失败")
          await loadBookings()
          const hit = (bkList.value || []).find((x) => x.id === b.id)
          if (hit) {
            bkSelected.value = hit
            fillBkTrip(hit)
            fillBkRide(hit)
          }
          else if (action === "delete") closeBooking()
        }
        const searchBkUser = async () => {
          const q = bkCreate.value.userKeyword.trim()
          if (!q) { bkCreate.value.hits = []; return }
          const res = await fetch("/api/v1/admin/users?keyword=" + encodeURIComponent(q) + "&page=1&pageSize=10", { headers: s.authHeaders() })
          const json = await res.json()
          bkCreate.value.hits = s.unwrapPaged(json).items
        }
        const createBooking = async () => {
          const c = bkCreate.value
          if (!c.userId || !c.projectId) {
            ElementPlus.ElMessage.warning("请选择学员和项目")
            return
          }
          const dayKeys = Array.isArray(c.dayKeys) ? c.dayKeys.filter(Boolean) : []
          const spotIds = Array.isArray(c.spotIds) ? c.spotIds.filter(Boolean) : []
          const tripPlan = {
            dayKeys,
            days: dayKeys.map((dayKey) => ({ dayKey, spotIds }))
          }
          const ride = c.ride || emptyBkRide()
          try {
            const res = await fetch("/api/v1/admin/users/" + encodeURIComponent(c.userId) + "/bookings", {
              method: "POST", headers: s.authHeaders(), body: JSON.stringify({
                projectId: c.projectId,
                status: c.status || "BOOKED",
                tripPlan,
                rental: Object.assign({}, ride, { rentalOptionId: ride.optionId })
              })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "创建失败")
            ElementPlus.ElMessage.success("预约已创建")
            bkCreateOpen.value = false
            bkCreate.value = { userId: "", projectId: "", status: "BOOKED", userKeyword: "", hits: [], dayKeys: [], spotIds: [], ride: emptyBkRide() }
            await loadBookings()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "创建失败")
          }
        }
  Object.assign(s, {
    bkSel,
    bookingLabel,
    tripDates,
    tripLabel,
    RIDE_OPTIONS,
    VEHICLE_OPTIONS,
    emptyBkRide,
    rideLabel,
    orderLabel,
    bkKeyword,
    bkFilter,
    bkProjectId,
    bkPage,
    bkTotal,
    bkStats,
    bkList,
    bkLoading,
    bkOpen,
    bkSelected,
    bkCreateOpen,
    bkCreate,
    bkTrip,
    bkTripAddDate,
    bkRide,
    bkGroupMode,
    bkDateFilter,
    shanghaiTomorrow,
    bookingDayKeys,
    appointmentDayOf,
    bookingHasDay,
    bkDayTitle,
    setBkDateFilter,
    clearBkDateFilter,
    bkDateChips,
    bkGroupedSections,
    multiDayBadge,
    loadBookings,
    fillBkTrip,
    fillBkRide,
    addBkTripDay,
    removeBkTripDay,
    saveBkTrip,
    saveBkRide,
    closeBooking,
    bkDayRedeemed,
    redeemBkDay,
    mutateBooking,
    searchBkUser,
    createBooking
  })
}
