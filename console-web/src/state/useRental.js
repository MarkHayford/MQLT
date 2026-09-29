import { ref } from "vue"

export function useRental(s) {
        const routeSpotCatalog = ref([])
        const driverLabel = (b) => {
          const r = b && b.rental
          if (!r || r.optionId === "none") return "—"
          if (r.driverName) return r.driverName + (r.driverPhone ? " · " + r.driverPhone : "")
          return "未预约司机"
        }
        const routeRailWidth = ref(s.readStoredPx(s.ROUTE_RAIL_W_KEY, 248, 180, 360))
        const routePreviewWidth = ref(s.readStoredPx(s.ROUTE_PREVIEW_W_KEY, 280, 220, 380))
        const routeSplitHover = ref(false)
        const emptyDrvForm = () => ({
          id: "", phone: "", realName: "", wechat: "", city: "",
          vehicleType: "van7", vehicleName: "", plateNo: "",
          seatCount: 7, status: "OFFLINE", acceptOrders: true, commissionRate: "",
          baseLatitude: null, baseLongitude: null
        })
        const drvKeyword = ref("")
        const drvStatus = ref("all")
        const drvPage = ref(1)
        const drvTotal = ref(0)
        const drvStats = ref({ total: 0, online: 0, busy: 0, leave: 0, offline: 0 })
        const drvList = ref([])
        const drvLoading = ref(false)
        const drvOpen = ref(false)
        const drvCreating = ref(false)
        const drvSaving = ref(false)
        const drvForm = ref(emptyDrvForm())
        const drvSelected = ref(null)
        const roList = ref([])
        const roTotal = ref(0)
        const roPage = ref(1)
        const roLoading = ref(false)
        const roKeyword = ref("")
        const roStatus = ref("OPEN")
        const roStats = ref({ open: 0, negotiating: 0, priceConfirmed: 0, paid: 0 })
        const roChatOpen = ref(false)
        const roChatLoading = ref(false)
        const roChatOrder = ref(null)
        const roChatItems = ref([])
        const loadDrivers = async () => {
          drvLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (drvKeyword.value.trim()) qs.set("keyword", drvKeyword.value.trim())
            if (drvStatus.value && drvStatus.value !== "all") qs.set("status", drvStatus.value)
            qs.set("page", String(drvPage.value || 1))
            qs.set("pageSize", "20")
            const res = await fetch("/api/v1/admin/drivers?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "司机加载失败")
            const paged = s.unwrapPaged(json)
            drvList.value = paged.items
            drvTotal.value = paged.total
            const stats = (s.unwrap(json) && s.unwrap(json).stats) || {}
            drvStats.value = {
              total: Number(stats.total || paged.total || 0),
              online: Number(stats.online || 0),
              busy: Number(stats.busy || 0),
              leave: Number(stats.leave || 0),
              offline: Number(stats.offline || 0)
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "司机加载失败")
            drvList.value = []
          } finally {
            drvLoading.value = false
          }
        }
        const vehicleTypeFromSeats = (seats) => {
          const n = Number(seats) || 7
          if (n <= 7) return "van7"
          if (n <= 9) return "mpv9"
          if (n <= 14) return "bus14"
          return "bus20"
        }
        const normalizeCityName = (name) => String(name || "").trim().replace(/市$/u, "")
        const extractCityFromAddress = (addr) => {
          if (!addr || typeof addr !== "object") return ""
          const raw = addr.city || addr.town || addr.county || addr.municipality || addr.state || addr.province || ""
          return normalizeCityName(raw)
        }
        const drvMapQuery = ref("")
        const destroyDrvMap = () => {
          if (drvMap) {
            drvMap.remove()
            drvMap = null
            drvMapMarker = null
          }
        }
        const gcj02ToWgs84 = (lat, lng) => {
          if (s.outOfChina(lat, lng)) return [lat, lng]
          let wgsLat = lat
          let wgsLng = lng
          for (let i = 0; i < 4; i++) {
            const d = s.deltaCoord(wgsLat, wgsLng)
            wgsLat = lat - d[0]
            wgsLng = lng - d[1]
          }
          return [wgsLat, wgsLng]
        }
        const applyDrvCityLatLng = (lat, lng, cityName) => {
          const la = Number(lat)
          const lo = Number(lng)
          if (!Number.isFinite(la) || !Number.isFinite(lo)) return
          drvForm.value.baseLatitude = Number(la.toFixed(6))
          drvForm.value.baseLongitude = Number(lo.toFixed(6))
          if (cityName) drvForm.value.city = normalizeCityName(cityName)
          if (drvMapMarker) drvMapMarker.setLatLng([la, lo])
          if (drvMap) drvMap.panTo([la, lo])
        }
        const reverseDrvCity = async (lat, lng) => {
          try {
            const wgs = gcj02ToWgs84(Number(lat), Number(lng))
            const url = "https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=10&lat=" + encodeURIComponent(wgs[0]) + "&lon=" + encodeURIComponent(wgs[1])
            const res = await fetch(url, {
              headers: { "Accept-Language": "zh-CN", "User-Agent": "mqlt-console/1.0 (driver-city)" }
            })
            const data = await res.json()
            const city = extractCityFromAddress(data && data.address)
            if (city) drvForm.value.city = city
            return city
          } catch (_err) {
            return ""
          }
        }
        const initDrvMap = () => {
          if (!window.L) return
          const el = document.getElementById("drv-city-map")
          if (!el) return
          destroyDrvMap()
          const lat = Number(drvForm.value.baseLatitude)
          const lng = Number(drvForm.value.baseLongitude)
          const has = Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
          const center = has ? [lat, lng] : [s.DEFAULT_LOC.lat, s.DEFAULT_LOC.lng]
          drvMap = L.map(el, { zoomControl: true }).setView(center, has ? 11 : 10)
          L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
            subdomains: "1234",
            maxZoom: 18
          }).addTo(drvMap)
          drvMapMarker = L.marker(center, { draggable: true }).addTo(drvMap)
          drvMap.on("click", async (e) => {
            applyDrvCityLatLng(e.latlng.lat, e.latlng.lng)
            await reverseDrvCity(e.latlng.lat, e.latlng.lng)
          })
          drvMapMarker.on("dragend", async () => {
            const p = drvMapMarker.getLatLng()
            applyDrvCityLatLng(p.lat, p.lng)
            await reverseDrvCity(p.lat, p.lng)
          })
          setTimeout(() => { if (drvMap) drvMap.invalidateSize() }, 180)
        }
        const searchDrvCity = async () => {
          const q = String(drvMapQuery.value || "").trim()
          if (!q) {
            ElementPlus.ElMessage.warning("请输入城市名称")
            return
          }
          try {
            const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=" + encodeURIComponent(q), {
              headers: { "Accept-Language": "zh-CN", "User-Agent": "mqlt-console/1.0 (driver-city)" }
            })
            const list = await res.json()
            if (!list || !list.length) {
              ElementPlus.ElMessage.warning("没有找到该城市，可在地图上点选")
              return
            }
            const hit = list[0]
            const wgsLat = Number(hit.lat)
            const wgsLng = Number(hit.lon)
            const gcj = s.wgs84ToGcj02(wgsLat, wgsLng)
            const city = extractCityFromAddress(hit.address) || normalizeCityName(q)
            applyDrvCityLatLng(gcj[0], gcj[1], city)
            if (drvMap) drvMap.setZoom(11)
            if (!city) await reverseDrvCity(gcj[0], gcj[1])
          } catch (_err) {
            ElementPlus.ElMessage.warning("搜索暂不可用，请在地图上点选")
          }
        }
        const closeDriver = () => {
          destroyDrvMap()
          drvOpen.value = false
          drvSelected.value = null
        }
        const saveDriver = async () => {
          const name = String(drvForm.value.vehicleName || "").trim()
          if (!name) {
            ElementPlus.ElMessage.warning("请填写车型（如：别克GL8）")
            return
          }
          const city = normalizeCityName(drvForm.value.city)
          if (!city) {
            ElementPlus.ElMessage.warning("请通过地图选择常驻城市")
            return
          }
          drvSaving.value = true
          try {
            const seatCount = Math.max(2, Number(drvForm.value.seatCount) || 7)
            const payload = {
              id: drvForm.value.id,
              phone: drvForm.value.phone,
              realName: drvForm.value.realName,
              wechat: drvForm.value.wechat,
              city,
              vehicleName: name,
              vehicleType: vehicleTypeFromSeats(seatCount),
              plateNo: drvForm.value.plateNo,
              seatCount,
              basePrice: 0,
              status: drvForm.value.status,
              acceptOrders: drvForm.value.acceptOrders,
              commissionRate: String(drvForm.value.commissionRate || "").trim() === "" ? null : Number(drvForm.value.commissionRate),
              baseLatitude: drvForm.value.baseLatitude != null ? Number(drvForm.value.baseLatitude) : null,
              baseLongitude: drvForm.value.baseLongitude != null ? Number(drvForm.value.baseLongitude) : null
            }
            const isNew = drvCreating.value || !drvForm.value.id
            const url = isNew ? "/api/v1/admin/drivers" : ("/api/v1/admin/drivers/" + encodeURIComponent(drvForm.value.id))
            const res = await fetch(url, { method: isNew ? "POST" : "PUT", headers: s.authHeaders(), body: JSON.stringify(payload) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success(isNew ? "司机已录入" : "已保存")
            destroyDrvMap()
            drvOpen.value = false
            await loadDrivers()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            drvSaving.value = false
          }
        }
        const deleteDriver = async (row) => {
          const target = row || drvSelected.value
          if (!target) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后该账号不再出现在可约司机列表。", "删除司机", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const res = await fetch("/api/v1/admin/drivers/" + encodeURIComponent(target.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            drvOpen.value = false
            await loadDrivers()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const loadRentalOrders = async () => {
          roLoading.value = true
          try {
            const qs = new URLSearchParams({
              status: roStatus.value || "all",
              keyword: roKeyword.value || "",
              page: String(roPage.value || 1),
              pageSize: "20",
            })
            const res = await fetch("/api/v1/admin/rental-orders?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载租车单失败")
            const data = s.unwrap(json) || {}
            roList.value = data.items || []
            roTotal.value = data.total || 0
            roStats.value = data.stats || { open: 0, negotiating: 0, priceConfirmed: 0, paid: 0, fulfilling: 0, completed: 0 }
          } catch (e) {
            roList.value = []
            roTotal.value = 0
            ElementPlus.ElMessage.error((e && e.message) || "加载租车单失败")
          } finally {
            roLoading.value = false
          }
        }
        const loadDriverWithdrawals = async () => {
          s.wdLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (s.wdStatus.value && s.wdStatus.value !== "all") qs.set("status", s.wdStatus.value)
            qs.set("page", "1")
            qs.set("pageSize", "30")
            const res = await fetch("/api/v1/admin/driver-withdrawals?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "提现加载失败")
            const paged = s.unwrapPaged(json)
            s.wdList.value = paged.items
            s.wdTotal.value = paged.total
            s.wdStats.value = { pending: Number(((s.unwrap(json) || {}).stats || {}).pending || 0) }
          } catch (err) {
            s.wdList.value = []
          } finally {
            s.wdLoading.value = false
          }
        }
        const reviewWithdraw = async (row, action) => {
          const res = await fetch("/api/v1/admin/driver-withdrawals/" + encodeURIComponent(row.id) + "/review", {
            method: "POST", headers: s.authHeaders(), body: JSON.stringify({ action })
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "处理失败")
          ElementPlus.ElMessage.success(action === "approve" ? "已通过" : "已拒绝")
          await loadDriverWithdrawals()
          await loadDrivers()
        }
        const batchReviewWithdraws = async (action) => {
          const ids = (s.wdSel.value || []).slice()
          if (!ids.length) return
          const label = action === "approve" ? "通过" : "拒绝"
          const ok = await ElementPlus.ElMessageBox.confirm("将对选中的 " + ids.length + " 条提现执行「" + label + "」。", "批量审核", { confirmButtonText: label, cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const data = await s.postBatch("/api/v1/admin/driver-withdrawals/batch-review", { ids, action })
            ElementPlus.ElMessage.success("已处理 " + ((data && data.updated) || ids.length) + " 条")
            s.wdSel.value = []
            await loadDriverWithdrawals()
            await loadDrivers()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "处理失败")
          }
        }
        const roleHasPerm = (role, value) => ((role && role.permissions) || []).indexOf(value) >= 0
        const roleAllProjects = (role) => !role || role.locked || !((role.projectIds || []).length)
        const roleHasProject = (role, id) => ((role && role.projectIds) || []).indexOf(id) >= 0
        const rolePermCount = (role) => ((role && role.permissions) || []).length
        const roleProjectLabel = (role) => {
          if (roleAllProjects(role)) return "全部项目"
          const ids = (role && role.projectIds) || []
          if (!ids.length) return "全部项目"
          const names = ids.map((id) => {
            const hit = (s.projList.value || []).find((p) => p.id === id)
            return hit ? hit.title : id
          }).filter(Boolean)
          return names.length ? names.join("、") : ids.length + " 个项目"
        }
  Object.assign(s, {
    routeSpotCatalog,
    driverLabel,
    routeRailWidth,
    routePreviewWidth,
    routeSplitHover,
    emptyDrvForm,
    drvKeyword,
    drvStatus,
    drvPage,
    drvTotal,
    drvStats,
    drvList,
    drvLoading,
    drvOpen,
    drvCreating,
    drvSaving,
    drvForm,
    drvSelected,
    roList,
    roTotal,
    roPage,
    roLoading,
    roKeyword,
    roStatus,
    roStats,
    roChatOpen,
    roChatLoading,
    roChatOrder,
    roChatItems,
    loadDrivers,
    vehicleTypeFromSeats,
    normalizeCityName,
    extractCityFromAddress,
    drvMapQuery,
    destroyDrvMap,
    gcj02ToWgs84,
    applyDrvCityLatLng,
    reverseDrvCity,
    initDrvMap,
    searchDrvCity,
    closeDriver,
    saveDriver,
    deleteDriver,
    loadRentalOrders,
    loadDriverWithdrawals,
    reviewWithdraw,
    batchReviewWithdraws,
    roleHasPerm,
    roleAllProjects,
    roleHasProject,
    rolePermCount,
    roleProjectLabel
  })
}
