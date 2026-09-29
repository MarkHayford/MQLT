import { ref, computed, watch, nextTick } from "vue"

export function useLive(s) {
        const liveDate = ref("")
        const liveLoading = ref(false)
        const liveSaving = ref(false)
        const liveData = ref(null)
        const liveTimer = ref(null)
        const livePaused = ref(false)
        const livePauseCheckin = ref(false)
        const liveCapacity = ref(null)
        const liveNote = ref("")
        const liveDutyId = ref("")
        const liveTourMallOpen = ref(null)
        const liveTab = ref("overview")
        const liveSelected = ref({})
        const liveBatchBusy = ref(false)
        const liveGate = ref(null)
        const liveGateLoading = ref(false)
        const liveGatePointId = ref("")
        const shanghaiToday = () => {
          try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" }) } catch (_e) {
            const ms = Date.now() + 8 * 3600000
            const x = new Date(ms)
            return x.getUTCFullYear() + "-" + String(x.getUTCMonth() + 1).padStart(2, "0") + "-" + String(x.getUTCDate()).padStart(2, "0")
          }
        }
        const ensureLiveDate = () => { if (!liveDate.value) liveDate.value = shanghaiToday() }
        const stopLivePoll = () => { if (liveTimer.value) { clearInterval(liveTimer.value); liveTimer.value = null } }
        const liveCounts = computed(() => (liveData.value && liveData.value.counts) || {})
        const liveAlerts = computed(() => (liveData.value && liveData.value.alerts) || [])
        const liveContacts = computed(() => (liveData.value && liveData.value.contacts) || [])
        const liveDutyOptions = computed(() => {
          const rows = liveContacts.value || []
          return rows.filter((c) => ["现场负责人","讲解带队","总负责人"].indexOf(String(c.role||"")) >= 0)
        })
        const liveAttendees = computed(() => (liveData.value && liveData.value.attendees) || [])
        const liveRoutePoints = computed(() => (liveData.value && liveData.value.routePoints) || [])
        const liveSelectedIds = computed(() => Object.keys(liveSelected.value || {}).filter((k) => liveSelected.value[k]))
        const syncLiveForm = (data) => {
          const ops = (data && data.dayOps) || {}
          livePaused.value = !!ops.paused
          livePauseCheckin.value = !!ops.pauseCheckin
          liveCapacity.value = ops.capacity != null ? Number(ops.capacity) : null
          liveNote.value = ops.note || ""
          liveDutyId.value = ops.duty || (data && data.dutyContact && data.dutyContact.id) || ""
          liveTourMallOpen.value = ops.tourMallOpen == null ? null : !!ops.tourMallOpen
          liveTourPaused.value = !!ops.tourPaused
          liveBroadcastText.value = (ops.broadcast && ops.broadcast.text) || ""
          liveClosedSpots.value = Array.isArray(ops.closedSpots) ? ops.closedSpots.slice() : []
          liveWaitlist.value = Array.isArray(data && data.waitlist) ? data.waitlist : (ops.waitlist || [])
        }
        const loadProjLive = async (silent) => {
          if (!s.inProjWorkspace.value || !s.opsProj.value || !s.opsProj.value.id) return
          ensureLiveDate()
          if (!silent) liveLoading.value = true
          try {
            const qs = new URLSearchParams(); qs.set("date", liveDate.value)
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(s.opsProj.value.id) + "/live?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "Live 加载失败")
            const data = s.unwrap(json) || {}
            const prevB = livePrevBookingCount.value
            const prevA = livePrevAnomalyCount.value
            liveData.value = data
            syncLiveForm(data)
            const seats = (data.counts && (data.counts.seats || data.counts.bookings)) || 0
            const an = (data.anomalies && data.anomalies.length) || 0
            if (silent && ((seats > prevB) || (an > prevA))) liveBeep()
            livePrevBookingCount.value = seats
            livePrevAnomalyCount.value = an
            if (!liveGatePointId.value && data.routePoints && data.routePoints.length) {
              liveGatePointId.value = data.routePoints[0].id
            }
            if (liveTab.value === "field-map") nextTick(() => ensureLiveFieldMap(false))
          } catch (err) {
            if (!silent) ElementPlus.ElMessage.error(err.message || "Live 加载失败")
          } finally {
            if (!silent) liveLoading.value = false
          }
        }
        const startLivePoll = () => {
          stopLivePoll()
          liveTimer.value = setInterval(() => { if (s.active.value === "proj-live") loadProjLive(true) }, 20000)
        }
        const saveLiveDayOps = async () => {
          if (!s.opsProj.value || !s.opsProj.value.id) return
          ensureLiveDate()
          liveSaving.value = true
          try {
            const body = {
              date: liveDate.value,
              paused: !!livePaused.value,
              pauseCheckin: !!livePauseCheckin.value,
              capacity: liveCapacity.value === "" || liveCapacity.value == null ? null : Number(liveCapacity.value),
              note: liveNote.value || "",
              duty: liveDutyId.value || "",
              tourMallOpen: liveTourMallOpen.value
            }
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(s.opsProj.value.id) + "/live/day-ops", { method: "PATCH", headers: s.authHeaders(), body: JSON.stringify(body) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            liveData.value = s.unwrap(json) || liveData.value
            syncLiveForm(liveData.value)
            ElementPlus.ElMessage.success("当日运营已更新")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            liveSaving.value = false
          }
        }
        const redeemLiveDay = async (row, undo) => {
          if (!row || !row.bookingId) return
          try {
            const res = await fetch("/api/v1/admin/bookings/" + encodeURIComponent(row.bookingId) + "/redeem", {
              method: "POST", headers: s.authHeaders(), body: JSON.stringify({ dayKey: liveDate.value, undo: !!undo })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "核销失败")
            ElementPlus.ElMessage.success(undo ? "已撤销核销" : "已核销")
            await loadProjLive(true)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "核销失败")
          }
        }
        const toggleLiveSelect = (id, on) => {
          const next = Object.assign({}, liveSelected.value)
          if (on) next[id] = true; else delete next[id]
          liveSelected.value = next
        }
        const liveSelectAllPending = () => {
          const next = {}
          ;(liveAttendees.value || []).forEach((a) => { if (!a.dayRedeemed) next[a.bookingId] = true })
          liveSelected.value = next
        }
        const liveClearSelect = () => { liveSelected.value = {} }
        const batchRedeemLive = async (undo) => {
          const ids = liveSelectedIds.value
          if (!ids.length) { ElementPlus.ElMessage.warning("请先勾选学员"); return }
          liveBatchBusy.value = true
          let ok = 0, fail = 0
          try {
            for (let i = 0; i < ids.length; i++) {
              try {
                const res = await fetch("/api/v1/admin/bookings/" + encodeURIComponent(ids[i]) + "/redeem", {
                  method: "POST", headers: s.authHeaders(), body: JSON.stringify({ dayKey: liveDate.value, undo: !!undo })
                })
                if (res.ok) ok++; else fail++
              } catch (_e) { fail++ }
            }
            ElementPlus.ElMessage.success((undo ? "批量撤销" : "批量核销") + " 成功 " + ok + (fail ? ("，失败 " + fail) : ""))
            liveSelected.value = {}
            await loadProjLive(true)
          } finally {
            liveBatchBusy.value = false
          }
        }
        const loadLiveGate = async (rotate) => {
          if (!s.opsProj.value || !s.opsProj.value.id || !liveGatePointId.value) { ElementPlus.ElMessage.warning("请选择点位"); return }
          liveGateLoading.value = true
          try {
            const base = "/api/v1/admin/study-projects/" + encodeURIComponent(s.opsProj.value.id) + "/route-points/" + encodeURIComponent(liveGatePointId.value) + "/check-in-code"
            const res = await fetch(base + (rotate ? "/rotate" : ""), { method: rotate ? "POST" : "GET", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "点位码加载失败")
            liveGate.value = s.unwrap(json) || null
            if (rotate) ElementPlus.ElMessage.success("已刷新点位码")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "点位码加载失败")
          } finally {
            liveGateLoading.value = false
          }
        }
        const exportLiveCsv = () => {
          const rows = liveAttendees.value || []
          const lines = ["学员,研学号,手机,状态,点位,核销,导览阶段,当前点位"]
          rows.forEach((a) => {
            const cells = [a.participantName, a.studyNo, a.phone, a.status, a.spotCount, a.dayRedeemed ? "已核销" : "未核销", a.exploreStage || "", a.exploreSpot || ""]
            lines.push(cells.map((x) => '"' + String(x == null ? "" : x).replace(/"/g, '""') + '"').join(","))
          })
          const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = "live-" + (liveDate.value || "attendees") + ".csv"
          a.click()
          URL.revokeObjectURL(url)
        }
        const openLiveCertPanel = () => { s.openPage("proj-edit"); s.openProjEdit("cert") }
        const openLiveMallPanel = () => { s.openPage("proj-edit"); s.openProjEdit("tourmall") }
        const liveActBusy = ref(false)
        const liveProgSpot = ref({})
        const liveProgStep = ref({})
        const liveGradBookingId = ref("")
        const setLiveProgSpot = (bookingId, v) => {
          liveProgSpot.value = Object.assign({}, liveProgSpot.value || {}, { [bookingId]: v || "" })
          liveProgStep.value = Object.assign({}, liveProgStep.value || {}, { [bookingId]: "" })
        }
        const setLiveProgStep = (bookingId, v) => {
          liveProgStep.value = Object.assign({}, liveProgStep.value || {}, { [bookingId]: v || "" })
        }
        const liveSpotOptionsFor = (row) => {
          const pts = liveRoutePoints.value || []
          if (!pts.length) return []
          return pts
        }
        const liveStepsForRow = (row) => {
          if (!row) return []
          const spotId = (liveProgSpot.value && liveProgSpot.value[row.bookingId]) || row.exploreSpotId || ""
          if (spotId && row.exploreSpotId && spotId === row.exploreSpotId && Array.isArray(row.currentSteps) && row.currentSteps.length)
            return row.currentSteps
          const rp = (liveRoutePoints.value || []).find((p) => p.id === spotId)
          return (rp && Array.isArray(rp.steps)) ? rp.steps : (row.currentSteps || [])
        }
        const ensureLiveProgDefaults = (row) => {
          if (!row || !row.bookingId) return
          const spots = liveProgSpot.value || {}
          const steps = liveProgStep.value || {}
          if (!spots[row.bookingId] && row.exploreSpotId) {
            liveProgSpot.value = Object.assign({}, spots, { [row.bookingId]: row.exploreSpotId })
          }
          if (!steps[row.bookingId] && row.pendingStepId) {
            liveProgStep.value = Object.assign({}, steps, { [row.bookingId]: row.pendingStepId })
          }
        }
        const livePost = async (path, body) => {
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(s.opsProj.value.id) + path, {
            method: "POST", headers: s.authHeaders(), body: JSON.stringify(body || {})
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error((json && (json.message || (json.error && json.error.message))) || "操作失败")
          return s.unwrap(json) || json
        }
        const liveSkipStep = async (row, mode) => {
          if (!row || !s.opsProj.value) return
          ensureLiveProgDefaults(row)
          const routePointId = (liveProgSpot.value && liveProgSpot.value[row.bookingId]) || row.exploreSpotId || ""
          let stepId = (liveProgStep.value && liveProgStep.value[row.bookingId]) || row.pendingStepId || ""
          const steps = liveStepsForRow(Object.assign({}, row, { exploreSpotId: routePointId }))
          if (!stepId && steps.length) {
            const pending = steps.find((s) => !s.finished)
            stepId = pending ? pending.id : steps[0].id
          }
          if (!routePointId || !stepId) {
            ElementPlus.ElMessage.warning("请选择点位与关卡")
            return
          }
          const label = mode === "complete" ? "强制完成本关" : "远程跳过本关"
          try {
            await ElementPlus.ElMessageBox.confirm("确认对「" + (row.participantName || "学员") + "」" + label + "？", "现场进度", { type: "warning" })
          } catch (_e) { return }
          liveActBusy.value = true
          try {
            const result = await livePost("/live/skip-step", {
              bookingId: row.bookingId,
              userId: row.userId || "",
              routePointId,
              stepId,
              mode: mode === "complete" ? "complete" : "skip",
              force: true
            })
            ElementPlus.ElMessage.success((result && result.message) || "已处理")
            await loadProjLive(true)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "操作失败")
          } finally {
            liveActBusy.value = false
          }
        }
        const liveEndStation = async (row) => {
          if (!row || !s.opsProj.value) return
          ensureLiveProgDefaults(row)
          const routePointId = (liveProgSpot.value && liveProgSpot.value[row.bookingId]) || row.exploreSpotId || ""
          if (!routePointId) { ElementPlus.ElMessage.warning("请选择要结束的点位"); return }
          const rp = (liveRoutePoints.value || []).find((p) => p.id === routePointId)
          const title = (rp && rp.title) || row.exploreSpot || routePointId
          try {
            await ElementPlus.ElMessageBox.confirm("确认远程结束站点「" + title + "」？将跳过未完成关卡并结算通关（等同学员完成本站）。", "结束站点", { type: "warning" })
          } catch (_e) { return }
          liveActBusy.value = true
          try {
            const result = await livePost("/live/end-station", {
              bookingId: row.bookingId,
              userId: row.userId || "",
              routePointId
            })
            ElementPlus.ElMessage.success((result && result.message) || "站点已结束")
            await loadProjLive(true)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "结束站点失败")
          } finally {
            liveActBusy.value = false
          }
        }
        const setLiveGraduation = async (unlocked) => {
          if (!s.opsProj.value) return
          const bookingId = liveGradBookingId.value || ""
          if (!bookingId) { ElementPlus.ElMessage.warning("请选择学员预约"); return }
          const row = (liveAttendees.value || []).find((a) => a.bookingId === bookingId)
          const name = row ? (row.participantName || row.studyNo || bookingId) : bookingId
          try {
            await ElementPlus.ElMessageBox.confirm(
              unlocked
                ? ("确认手动解锁「" + name + "」结业并开放积分商城兑换？")
                : ("确认锁定「" + name + "」结业兑换（商城不可兑）？"),
              "结业解锁",
              { type: "warning" }
            )
          } catch (_e) { return }
          liveActBusy.value = true
          try {
            const result = await livePost("/live/graduation", {
              bookingId,
              userId: row && row.userId || "",
              unlocked: !!unlocked
            })
            ElementPlus.ElMessage.success((result && result.message) || (unlocked ? "已解锁" : "已锁定"))
            await loadProjLive(true)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "操作失败")
          } finally {
            liveActBusy.value = false
          }
        }
        /* ===== live18 deep JS ===== */
        const liveKiosk = ref(false)
        const liveCompact = ref(!!(localStorage.getItem("mqlt_live_compact") === "1"))
        const liveSoundOn = ref(true)
        const livePrevBookingCount = ref(0)
        const livePrevAnomalyCount = ref(0)
        const liveTourPaused = ref(false)
        const liveBroadcastText = ref("")
        const liveClosedSpots = ref([])
        const liveOverrideSpot = ref("")
        const liveOverrideRequired = ref([])
        const liveOverrideStepOpts = ref([])
        const liveProxyUserId = ref("")
        const liveProxySeats = ref(1)
        const liveProxyName = ref("")
        const liveRescheduleId = ref("")
        const liveRescheduleDate = ref("")
        const liveSeatBookingId = ref("")
        const liveSeatAction = ref("set")
        const liveSeatDelta = ref(1)
        const liveWaitName = ref("")
        const liveWaitPhone = ref("")
        const liveWaitlist = ref([])
        const liveScanOpen = ref(false)
        const liveScanCode = ref("")
        const liveScanHit = ref(null)
        const liveForceNote = ref("")
        const livePtsBookingId = ref("")
        const livePtsDelta = ref(10)
        const livePtsNote = ref("现场调分")
        const livePtsLedgerText = ref("")
        const liveCouponsText = ref("")
        const liveCouponItems = ref([])
        const liveCouponEdit = ref(null)
        const liveCouponEditExpire = ref("")
        const liveCouponExtendDays = ref(30)
        const liveBatchExpireDays = ref(30)
        const liveCouponTitle = ref("站点卡券")
        const liveCouponSpot = ref("")
        const liveAnomalyMsg = ref("")

        // ===== 可约日程 =====
        const schedTab = ref("calendar")
        const schedCalMonth = ref("")
        const schedDays = ref([])
        const schedLoading = ref(false)
        const schedSaving = ref(false)
        const schedSelectedDate = ref("")
        const schedDayDetail = ref(null)
        const schedBatchWeekdays = ref([1,2,3,4,5])
        const schedBatchOpen = ref(true)
        const schedBatchCapacity = ref(null)
        const schedVersions = ref([])
        const schedVersionForm = ref({ id: "", name: "", routePointId: "", note: "", stepsJsonText: "[]" })
        const schedLogs = ref([])
        const schedCopySource = ref("")
        const schedCopyFromWeek = ref("")
        const schedCopyToWeek = ref("")
        const schedCopyTargetFrom = ref("")
        const schedCopyTargetTo = ref("")
        const shanghaiMonthNow = () => {
          const s = new Date().toLocaleString("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit" })
          // en-CA may be YYYY-MM-DD; take YYYY-MM
          return String(s).slice(0, 7)
        }
        if (!schedCalMonth.value) schedCalMonth.value = shanghaiMonthNow()
        const schedMonthCells = computed(() => {
          const ym = String(schedCalMonth.value || shanghaiMonthNow())
          const [y, m] = ym.split("-").map(Number)
          if (!y || !m) return []
          const first = new Date(Date.UTC(y, m - 1, 1))
          const startPad = (first.getUTCDay() + 6) % 7 // Mon-start
          const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
          const map = {}
          ;(schedDays.value || []).forEach((d) => { map[d.date] = d })
          const cells = []
          for (let i = 0; i < startPad; i++) cells.push({ day: 0, date: "", inMonth: false })
          for (let d = 1; d <= daysInMonth; d++) {
            const date = ym + "-" + String(d).padStart(2, "0")
            const row = map[date]
            cells.push({
              day: d, date, inMonth: true,
              exists: !!row,
              open: row ? !!row.open : null,
              capacity: row && row.capacity != null ? row.capacity : null,
              note: row && row.note ? row.note : "",
              spotOn: row && row.spots ? row.spots.filter((s) => s.enabled).length : null,
              spotAll: row && row.spots ? row.spots.length : null,
              selected: schedSelectedDate.value === date,
            })
          }
          return cells
        })
        const loadSchedMonth = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          if (!schedCalMonth.value) schedCalMonth.value = shanghaiMonthNow()
          const ym = schedCalMonth.value
          const from = ym + "-01"
          const last = new Date(Date.UTC(Number(ym.slice(0,4)), Number(ym.slice(5,7)), 0)).getUTCDate()
          const to = ym + "-" + String(last).padStart(2, "0")
          schedLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule?from=" + from + "&to=" + to, { headers: s.authHeaders() })
            const j = await res.json()
            if (!res.ok || (j && j.code && j.code !== 0 && j.code !== 200)) throw new Error((j && (j.message || j.msg)) || "加载失败")
            const data = j.data != null ? j.data : j
            schedDays.value = (data && data.days) || []
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "日程加载失败")
          } finally { schedLoading.value = false }
        }
        const shiftSchedMonth = (delta) => {
          const ym = schedCalMonth.value || shanghaiMonthNow()
          const [y, m] = ym.split("-").map(Number)
          const dt = new Date(Date.UTC(y, m - 1 + delta, 1))
          schedCalMonth.value = dt.getUTCFullYear() + "-" + String(dt.getUTCMonth() + 1).padStart(2, "0")
          loadSchedMonth()
        }
        const openSchedDay = async (date) => {
          if (!date) return
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          schedSelectedDate.value = date
          schedTab.value = "day"
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule/day?date=" + encodeURIComponent(date), { headers: s.authHeaders() })
            const j = await res.json()
            const data = j.data != null ? j.data : j
            schedDayDetail.value = data
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "日详情失败")
          }
        }
        const saveSchedDay = async () => {
          const p = s.opsProj.value || s.projSelected.value
          const d = schedDayDetail.value && schedDayDetail.value.day
          if (!p || !p.id || !d) return
          if (!s.projectCan("project.edit") && !liveCanWrite.value) { ElementPlus.ElMessage.warning("无编辑权限"); return }
          schedSaving.value = true
          try {
            const body = {
              date: d.date,
              open: !!d.open,
              capacity: d.capacity,
              note: d.note || "",
              spots: (d.spots || []).map((s) => ({
                routePointId: s.routePointId,
                enabled: s.enabled !== false,
                contentVersionId: s.contentVersionId || null,
              })),
            }
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule/day", {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify(body),
            })
            const j = await res.json()
            if (!res.ok || (j && j.code && j.code !== 0 && j.code !== 200)) throw new Error((j && (j.message || j.msg)) || "保存失败")
            schedDayDetail.value = j.data != null ? j.data : j
            ElementPlus.ElMessage.success("场次已保存")
            await loadSchedMonth()
            await loadSchedLogs()
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "保存失败")
          } finally { schedSaving.value = false }
        }
        const batchSchedWeekdays = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          const ym = schedCalMonth.value || shanghaiMonthNow()
          const from = ym + "-01"
          const last = new Date(Date.UTC(Number(ym.slice(0,4)), Number(ym.slice(5,7)), 0)).getUTCDate()
          const to = ym + "-" + String(last).padStart(2, "0")
          schedSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule/batch", {
              method: "POST", headers: s.authHeaders(),
              body: JSON.stringify({
                from, to,
                weekdays: schedBatchWeekdays.value || [],
                open: !!schedBatchOpen.value,
                capacity: schedBatchCapacity.value,
              }),
            })
            const j = await res.json()
            if (!res.ok || (j && j.code && j.code !== 0 && j.code !== 200)) throw new Error((j && (j.message || j.msg)) || "批量失败")
            ElementPlus.ElMessage.success("已批量设置 " + ((j.data && j.data.count) || "") + " 天")
            await loadSchedMonth(); await loadSchedLogs()
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "批量失败")
          } finally { schedSaving.value = false }
        }
        const seedSchedHorizon = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          schedSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule/seed", {
              method: "POST", headers: s.authHeaders(), body: JSON.stringify({}),
            })
            const j = await res.json()
            if (!res.ok || (j && j.code && j.code !== 0 && j.code !== 200)) throw new Error((j && (j.message || j.msg)) || "种子失败")
            ElementPlus.ElMessage.success("已生成可约窗口场次")
            await loadSchedMonth(); await loadSchedVersions(); await loadSchedLogs()
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "种子失败")
          } finally { schedSaving.value = false }
        }
        const loadSchedVersions = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/content-versions", { headers: s.authHeaders() })
            const j = await res.json()
            const data = j.data != null ? j.data : j
            schedVersions.value = (data && data.items) || []
          } catch (_e) { schedVersions.value = [] }
        }
        const editSchedVersion = (row) => {
          schedVersionForm.value = {
            id: row.id,
            name: row.name || "",
            routePointId: row.routePointId || "",
            note: row.note || "",
            stepsJsonText: JSON.stringify(row.stepsJson || [], null, 2),
          }
          schedTab.value = "versions"
        }
        const resetSchedVersionForm = () => {
          schedVersionForm.value = { id: "", name: "", routePointId: "", note: "", stepsJsonText: "[]" }
        }
        const saveSchedVersion = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          let steps
          try { steps = JSON.parse(schedVersionForm.value.stepsJsonText || "[]") } catch (_e) {
            ElementPlus.ElMessage.error("stepsJson 不是合法 JSON"); return
          }
          const body = {
            name: schedVersionForm.value.name,
            routePointId: schedVersionForm.value.routePointId || null,
            note: schedVersionForm.value.note || "",
            stepsJson: steps,
          }
          schedSaving.value = true
          try {
            const isUp = !!schedVersionForm.value.id
            const url = isUp
              ? ("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/content-versions/" + encodeURIComponent(schedVersionForm.value.id))
              : ("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/content-versions")
            const res = await fetch(url, { method: isUp ? "PUT" : "POST", headers: s.authHeaders(), body: JSON.stringify(body) })
            const j = await res.json()
            if (!res.ok || (j && j.code && j.code !== 0 && j.code !== 200)) throw new Error((j && (j.message || j.msg)) || "保存失败")
            ElementPlus.ElMessage.success("内容版本已保存")
            resetSchedVersionForm(); await loadSchedVersions(); await loadSchedLogs()
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "保存失败")
          } finally { schedSaving.value = false }
        }
        const deleteSchedVersion = async (row) => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id || !row || !row.id) return
          try {
            await ElementPlus.ElMessageBox.confirm("删除内容版本「" + row.name + "」？", "确认")
          } catch (_e) { return }
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/content-versions/" + encodeURIComponent(row.id), { method: "DELETE", headers: s.authHeaders() })
          if (!res.ok) { ElementPlus.ElMessage.error("删除失败"); return }
          ElementPlus.ElMessage.success("已删除"); await loadSchedVersions(); await loadSchedLogs()
        }
        const snapshotSchedVersions = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/content-versions/snapshot-defaults", { method: "POST", headers: s.authHeaders(), body: "{}" })
          const j = await res.json()
          if (!res.ok) { ElementPlus.ElMessage.error((j && j.message) || "快照失败"); return }
          ElementPlus.ElMessage.success("已从点位默认关卡生成内容版本"); await loadSchedVersions()
        }
        const loadSchedLogs = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule/logs?limit=80", { headers: s.authHeaders() })
            const j = await res.json()
            const data = j.data != null ? j.data : j
            schedLogs.value = (data && data.items) || []
          } catch (_e) { schedLogs.value = [] }
        }
        const copySchedDayRange = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          schedSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule/copy", {
              method: "POST", headers: s.authHeaders(),
              body: JSON.stringify({
                mode: "day",
                sourceDate: schedCopySource.value || schedSelectedDate.value,
                targetFrom: schedCopyTargetFrom.value,
                targetTo: schedCopyTargetTo.value,
              }),
            })
            const j = await res.json()
            if (!res.ok || (j && j.code && j.code !== 0 && j.code !== 200)) throw new Error((j && (j.message || j.msg)) || "复制失败")
            ElementPlus.ElMessage.success("已复制到 " + (((j.data && j.data.copied) || []).length) + " 天")
            await loadSchedMonth(); await loadSchedLogs()
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "复制失败")
          } finally { schedSaving.value = false }
        }
        const copySchedWeek = async () => {
          const p = s.opsProj.value || s.projSelected.value
          if (!p || !p.id) return
          schedSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(p.id) + "/schedule/copy", {
              method: "POST", headers: s.authHeaders(),
              body: JSON.stringify({ mode: "week", fromWeekStart: schedCopyFromWeek.value, toWeekStart: schedCopyToWeek.value }),
            })
            const j = await res.json()
            if (!res.ok || (j && j.code && j.code !== 0 && j.code !== 200)) throw new Error((j && (j.message || j.msg)) || "复制失败")
            ElementPlus.ElMessage.success("周复制完成")
            await loadSchedMonth(); await loadSchedLogs()
          } catch (e) {
            ElementPlus.ElMessage.error((e && e.message) || "复制失败")
          } finally { schedSaving.value = false }
        }


        const liveCanWrite = computed(() => {
          try {
            const a = s.account.value || {}
            if (a.liveReadOnly === true) return false
            const lc = (liveData.value && liveData.value.liveCaps) || null
            if (lc && lc.write === false) return false
            // Match live-18 caps: write if live.write OR legacy live OR orders.manage
            // Read-only when only project.live.read (no live / live.write)
            if (s.projectCan("project.live.write") || s.projectCan("project.live") || s.projectCan("orders.manage")) return true
            if (s.projectCan("project.live.read")) return false
          } catch (_e) {}
          return true
        })
        const liveHeatmap = computed(() => (liveData.value && liveData.value.heatmap) || [])
        const liveNoshowQueue = computed(() => (liveData.value && liveData.value.noshowQueue) || [])
        const liveAnomalies = computed(() => (liveData.value && liveData.value.anomalies) || [])
        const liveTimeline = computed(() => (liveData.value && liveData.value.timeline) || [])
        const liveBroadcastBanner = computed(() => {
          const ops = (liveData.value && liveData.value.dayOps) || {}
          return (ops.broadcast && ops.broadcast.text) || ""
        })
        const liveBeep = () => {
          if (!liveSoundOn.value) return
          try {
            const Ctx = window.AudioContext || window.webkitAudioContext
            if (!Ctx) return
            const ctx = new Ctx()
            const o = ctx.createOscillator(); const g = ctx.createGain()
            o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.05
            o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(() => { o.stop(); ctx.close() }, 180)
          } catch (_e) {}
        }
        const toggleLiveKiosk = () => { liveKiosk.value = !liveKiosk.value }
        const toggleLiveCompact = () => {
          liveCompact.value = !liveCompact.value
          localStorage.setItem("mqlt_live_compact", liveCompact.value ? "1" : "0")
        }
        const liveApi = async (path, opts) => {
          if (!s.opsProj.value || !s.opsProj.value.id) throw new Error("无项目")
          const res = await fetch("/api/v1/admin/study-projects/" + encodeURIComponent(s.opsProj.value.id) + path, Object.assign({ headers: s.authHeaders() }, opts || {}))
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "请求失败")
          return s.unwrap(json)
        }
        const openLiveScan = () => {
          liveScanOpen.value = true; liveScanCode.value = ""; liveScanHit.value = null
          setTimeout(() => { try { const el = document.querySelector(".live-scan-fs input"); if (el) el.focus() } catch (_e) {} }, 80)
        }
        const liveScanSubmit = async () => {
          try {
            const hit = await liveApi("/live/scan-lookup", { method: "POST", body: JSON.stringify({ code: liveScanCode.value }) })
            liveScanHit.value = hit
            ElementPlus.ElMessage.success("已命中 " + (hit.participantName || hit.bookingId))
          } catch (err) { ElementPlus.ElMessage.error(err.message || "未找到") }
        }
        const liveRedeemFromScan = async () => {
          if (!liveScanHit.value) return
          await redeemLiveDay({ bookingId: liveScanHit.value.bookingId }, false)
          liveScanCode.value = ""; liveScanHit.value = null
        }
        const liveForceFromScan = async () => {
          if (!liveScanHit.value) return
          if (!liveForceNote.value) { ElementPlus.ElMessage.warning("强制核销须填备注"); return }
          try {
            await liveApi("/live/force-checkin", { method: "POST", body: JSON.stringify({ bookingId: liveScanHit.value.bookingId, date: liveDate.value, note: liveForceNote.value }) })
            ElementPlus.ElMessage.success("已强制核销")
            liveForceNote.value = ""; liveScanHit.value = null; await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveForceCheckinPrompt = async (row) => {
          try {
            const { value } = await ElementPlus.ElMessageBox.prompt("强制核销审计备注", "强制核销", { inputPlaceholder: "必填" })
            if (!value) return
            await liveApi("/live/force-checkin", { method: "POST", body: JSON.stringify({ bookingId: row.bookingId, date: liveDate.value, note: value }) })
            ElementPlus.ElMessage.success("已强制核销"); await loadProjLive(true)
          } catch (err) { if (err !== "cancel") ElementPlus.ElMessage.error(err.message || "取消/失败") }
        }
        const liveProxyBook = async () => {
          try {
            await liveApi("/live/proxy-booking", { method: "POST", body: JSON.stringify({ userId: liveProxyUserId.value, date: liveDate.value, seats: liveProxySeats.value, participantName: liveProxyName.value }) })
            ElementPlus.ElMessage.success("代客预约成功"); await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveDoReschedule = async () => {
          try {
            await liveApi("/live/reschedule", { method: "POST", body: JSON.stringify({ bookingId: liveRescheduleId.value, date: liveRescheduleDate.value || liveDate.value }) })
            ElementPlus.ElMessage.success("已改期"); await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveDoSeats = async () => {
          try {
            await liveApi("/live/seats", { method: "POST", body: JSON.stringify({ bookingId: liveSeatBookingId.value, action: liveSeatAction.value, delta: liveSeatDelta.value, date: liveDate.value }) })
            ElementPlus.ElMessage.success("席位已更新")
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveWaitlistLoad = async () => {
          try {
            const data = await liveApi("/live/waitlist", { method: "POST", body: JSON.stringify({ action: "list", date: liveDate.value }) })
            liveWaitlist.value = (data && data.items) || []
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveWaitlistAdd = async () => {
          try {
            const data = await liveApi("/live/waitlist", { method: "POST", body: JSON.stringify({ action: "add", date: liveDate.value, name: liveWaitName.value, phone: liveWaitPhone.value }) })
            liveWaitlist.value = (data && data.items) || []; liveWaitName.value = ""; liveWaitPhone.value = ""
            ElementPlus.ElMessage.success("已加入候补")
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveWaitlistRemove = async (id) => {
          try {
            const data = await liveApi("/live/waitlist", { method: "POST", body: JSON.stringify({ action: "remove", date: liveDate.value, id }) })
            liveWaitlist.value = (data && data.items) || []
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveRemindNoshow = async (channel) => {
          const ids = liveSelectedIds.value
          if (!ids.length) { ElementPlus.ElMessage.warning("请勾选缺勤学员"); return }
          try {
            await liveApi("/live/noshow-remind", { method: "POST", body: JSON.stringify({ date: liveDate.value, bookingIds: ids, channel }) })
            ElementPlus.ElMessage.success("已标记提醒（无短信实发）"); await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const exportNoshowCsv = () => {
          const rows = liveNoshowQueue.value || []
          const lines = ["学员,研学号,手机,已提醒,渠道"]
          rows.forEach((a) => { lines.push([a.participantName, a.studyNo, a.phone, a.reminded ? "是" : "否", a.remindChannel || ""].map((x) => '"' + String(x||"").replace(/"/g,'""') + '"').join(",")) })
          const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" })
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "noshow-" + liveDate.value + ".csv"; a.click()
        }
        const liveSaveTourFlags = async () => {
          try {
            const body = {
              date: liveDate.value,
              tourPaused: !!liveTourPaused.value,
              broadcast: liveBroadcastText.value ? { text: liveBroadcastText.value, level: "warn" } : null,
              closedSpots: liveClosedSpots.value || []
            }
            const data = await liveApi("/live/tour-flags", { method: "POST", body: JSON.stringify(body) })
            liveData.value = data || liveData.value
            ElementPlus.ElMessage.success("旗标已保存")
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveLoadOverrideSteps = () => {
          const rp = (liveRoutePoints.value || []).find((x) => x.id === liveOverrideSpot.value)
          liveOverrideStepOpts.value = (rp && rp.steps) || []
          const ov = ((liveData.value && liveData.value.dayOps && liveData.value.dayOps.spotStepOverrides) || {})[liveOverrideSpot.value]
          liveOverrideRequired.value = (ov && ov.requiredStepIds) || []
        }
        const liveSaveStepOverride = async () => {
          if (!liveOverrideSpot.value) { ElementPlus.ElMessage.warning("选点位"); return }
          try {
            await liveApi("/live/tour-flags", { method: "POST", body: JSON.stringify({ date: liveDate.value, spotId: liveOverrideSpot.value, requiredStepIds: liveOverrideRequired.value }) })
            ElementPlus.ElMessage.success("关卡覆盖已保存"); await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveClearStepOverride = async () => {
          if (!liveOverrideSpot.value) return
          try {
            await liveApi("/live/tour-flags", { method: "POST", body: JSON.stringify({ date: liveDate.value, spotId: liveOverrideSpot.value, clearOverride: true }) })
            liveOverrideRequired.value = []; ElementPlus.ElMessage.success("已清除"); await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveLoadPointsAndCoupons = async () => {
          if (!livePtsBookingId.value) return
          try {
            const led = await liveApi("/live/points-ledger?bookingId=" + encodeURIComponent(livePtsBookingId.value), { method: "GET" })
            livePtsLedgerText.value = JSON.stringify(led, null, 2)
            const cps = await liveApi("/live/coupons?bookingId=" + encodeURIComponent(livePtsBookingId.value), { method: "GET" })
            liveCouponItems.value = Array.isArray(cps && cps.items) ? cps.items : []
            liveCouponsText.value = JSON.stringify(cps, null, 2)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const openLiveCouponEdit = (c) => {
          liveCouponEdit.value = c
          liveCouponEditExpire.value = c && c.expireAt ? String(c.expireAt).slice(0, 10) : ""
          liveCouponExtendDays.value = 30
        }
        const closeLiveCouponEdit = () => { liveCouponEdit.value = null }
        const saveLiveCouponExpire = async (mode) => {
          const c = liveCouponEdit.value
          if (!c || !c.id) return
          if (!liveCanWrite.value) { ElementPlus.ElMessage.warning("只读权限"); return }
          const body = { date: liveDate.value }
          if (mode === "extend") {
            const n = Number(liveCouponExtendDays.value)
            if (!Number.isFinite(n) || n === 0) { ElementPlus.ElMessage.warning("请填写延长天数"); return }
            body.extendDays = Math.round(n)
          } else if (mode === "clear") {
            body.expireAt = ""
          } else {
            body.expireAt = liveCouponEditExpire.value || ""
          }
          try {
            await liveApi("/live/coupons/" + encodeURIComponent(c.id), { method: "PATCH", body: JSON.stringify(body) })
            ElementPlus.ElMessage.success("已更新过期时间")
            liveCouponEdit.value = null
            await liveLoadPointsAndCoupons()
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const quickExtendLiveCoupon = async (c, days) => {
          if (!c || !c.id) return
          if (!liveCanWrite.value) { ElementPlus.ElMessage.warning("只读权限"); return }
          try {
            await liveApi("/live/coupons/" + encodeURIComponent(c.id), { method: "PATCH", body: JSON.stringify({ extendDays: days, date: liveDate.value }) })
            ElementPlus.ElMessage.success("已延长 " + days + " 天")
            await liveLoadPointsAndCoupons()
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveAdjustPoints = async () => {
          try {
            await liveApi("/live/points-adjust", { method: "POST", body: JSON.stringify({ bookingId: livePtsBookingId.value, delta: livePtsDelta.value, note: livePtsNote.value, date: liveDate.value }) })
            ElementPlus.ElMessage.success("已调分"); await liveLoadPointsAndCoupons()
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveBatchCoupons = async () => {
          const ids = liveSelectedIds.value
          if (!ids.length) { ElementPlus.ElMessage.warning("勾选学员"); return }
          try {
            await liveApi("/live/coupons/batch", { method: "POST", body: JSON.stringify({ bookingIds: ids, title: liveCouponTitle.value || "站点卡券", routePointId: liveCouponSpot.value, date: liveDate.value, expireDays: liveBatchExpireDays.value }) })
            ElementPlus.ElMessage.success("已批量发卡")
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const livePuzzleGrant = async (grant) => {
          const ids = liveSelectedIds.value
          const spot = liveCouponSpot.value || liveOverrideSpot.value
          if (!ids.length || !spot) { ElementPlus.ElMessage.warning("勾选学员并选择点位"); return }
          for (let i = 0; i < ids.length; i++) {
            try { await liveApi("/live/puzzle", { method: "POST", body: JSON.stringify({ bookingId: ids[i], routePointId: spot, action: grant ? "grant" : "revoke", date: liveDate.value }) }) } catch (_e) {}
          }
          ElementPlus.ElMessage.success(grant ? "已发放拼图" : "已收回拼图")
        }
        const liveCertAction = async (action) => {
          if (!livePtsBookingId.value) { ElementPlus.ElMessage.warning("选择学员"); return }
          try {
            await liveApi("/live/cert", { method: "POST", body: JSON.stringify({ action, bookingId: livePtsBookingId.value, date: liveDate.value }) })
            ElementPlus.ElMessage.success(action === "void" ? "已作废" : "已补发")
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveReportAnomaly = async () => {
          try {
            await liveApi("/live/anomaly", { method: "POST", body: JSON.stringify({ action: "add", date: liveDate.value, message: liveAnomalyMsg.value, type: "manual" }) })
            liveAnomalyMsg.value = ""; ElementPlus.ElMessage.success("已写入"); await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }
        const liveAckAnomaly = async (id) => {
          try {
            await liveApi("/live/anomaly", { method: "POST", body: JSON.stringify({ action: "ack", date: liveDate.value, id }) })
            await loadProjLive(true)
          } catch (err) { ElementPlus.ElMessage.error(err.message || "失败") }
        }

        /* ===== live field map ===== */
        const liveFieldMapEl = ref(null)
        let liveFieldMap = null
        let liveFieldMapLayer = null
        const liveMapSelectedId = ref("")
        const liveMapDlgOpen = ref(false)
        const liveMapDlgSpot = ref(null)
        const liveMapOverrideRequired = ref([])
        const liveMapOverrideStepOpts = ref([])
        const liveMapHeatOf = (id) => {
          const rows = liveHeatmap.value || []
          for (let i = 0; i < rows.length; i++) {
            if (String(rows[i].routePointId || rows[i].id || "") === String(id)) return rows[i]
          }
          return null
        }
        const liveMapIsClosed = (id) => (liveClosedSpots.value || []).indexOf(String(id)) >= 0
        const liveMapSpotRows = computed(() => {
          const pts = liveRoutePoints.value || []
          return pts.map((rp) => {
            const hm = liveMapHeatOf(rp.id) || {}
            const lat = rp.latitude != null ? Number(rp.latitude) : (rp.lat != null ? Number(rp.lat) : null)
            const lng = rp.longitude != null ? Number(rp.longitude) : (rp.lng != null ? Number(rp.lng) : null)
            return {
              id: rp.id,
              title: rp.title || rp.id,
              sortOrder: Number(rp.sortOrder || 0),
              enabled: rp.enabled !== false,
              closed: liveMapIsClosed(rp.id) || !!hm.closed,
              latitude: Number.isFinite(lat) ? lat : null,
              longitude: Number.isFinite(lng) ? lng : null,
              atSpot: Number(hm.atSpot || 0),
              stuck: Number(hm.stuck || 0),
              cleared: Number(hm.cleared || 0),
              completionRate: Number(hm.completionRate != null ? hm.completionRate : (hm.completionRate || 0)),
              steps: Array.isArray(rp.steps) ? rp.steps : []
            }
          })
        })
        const liveMapDlgAttendees = computed(() => {
          const spot = liveMapDlgSpot.value
          if (!spot) return []
          const sid = String(spot.id)
          const title = String(spot.title || "")
          return (liveAttendees.value || []).filter((a) => {
            if (String(a.exploreSpotId || "") === sid) return true
            if (title && String(a.exploreSpot || "") === title) return true
            return false
          })
        })
        const liveMapEsc = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")
        const destroyLiveFieldMap = () => {
          try {
            if (liveFieldMapLayer) { liveFieldMapLayer.clearLayers(); liveFieldMapLayer = null }
            if (liveFieldMap) { liveFieldMap.remove(); liveFieldMap = null }
          } catch (_e) {}
        }
        const renderLiveFieldMapMarkers = () => {
          if (!liveFieldMap || !window.L) return
          if (!liveFieldMapLayer) liveFieldMapLayer = L.layerGroup().addTo(liveFieldMap)
          liveFieldMapLayer.clearLayers()
          const rows = liveMapSpotRows.value || []
          const latLngs = []
          const paused = !!liveTourPaused.value
          for (let i = 0; i < rows.length; i++) {
            const rp = rows[i]
            if (rp.latitude == null || rp.longitude == null) continue
            const ll = [rp.latitude, rp.longitude]
            latLngs.push(ll)
            let cls = "live-map-marker"
            if (rp.closed) cls += " is-closed"
            else if (rp.enabled === false) cls += " is-off"
            if (paused) cls += " is-paused"
            const icon = L.divIcon({
              className: cls,
              html: '<div class="pin"></div><div class="lbl">' + liveMapEsc(rp.title) + '</div>',
              iconSize: [120, 44],
              iconAnchor: [16, 40]
            })
            const marker = L.marker(ll, { icon, keyboard: true, title: rp.title })
            marker.on("click", () => focusLiveMapSpot(rp.id, true))
            liveFieldMapLayer.addLayer(marker)
          }
          if (latLngs.length === 1) liveFieldMap.setView(latLngs[0], 16)
          else if (latLngs.length > 1) {
            try { liveFieldMap.fitBounds(latLngs, { padding: [40, 40] }) } catch (_e) {}
          }
        }
        const ensureLiveFieldMap = async (force) => {
          await nextTick()
          const el = liveFieldMapEl.value
          if (!el || !window.L) return
          if (liveTab.value !== "field-map" && !force) return
          if (!liveFieldMap) {
            const center = [s.DEFAULT_LOC.lat, s.DEFAULT_LOC.lng]
            liveFieldMap = L.map(el, { zoomControl: true }).setView(center, 14)
            L.tileLayer("https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}", {
              subdomains: "1234",
              maxZoom: 18
            }).addTo(liveFieldMap)
            liveFieldMapLayer = L.layerGroup().addTo(liveFieldMap)
          }
          renderLiveFieldMapMarkers()
          setTimeout(() => { try { if (liveFieldMap) liveFieldMap.invalidateSize() } catch (_e) {} }, 180)
        }
        const openLiveFieldMapTab = () => {
          liveTab.value = "field-map"
          nextTick(() => ensureLiveFieldMap(true))
        }
        const focusLiveMapSpot = (id, openDlg) => {
          const rows = liveMapSpotRows.value || []
          const rp = rows.find((x) => String(x.id) === String(id))
          if (!rp) return
          liveMapSelectedId.value = rp.id
          if (liveFieldMap && rp.latitude != null && rp.longitude != null) {
            liveFieldMap.setView([rp.latitude, rp.longitude], Math.max(liveFieldMap.getZoom(), 16))
          }
          if (openDlg) openLiveMapDlg(rp.id)
        }
        const openLiveMapDlg = (id) => {
          const rows = liveMapSpotRows.value || []
          const rp = rows.find((x) => String(x.id) === String(id))
          if (!rp) return
          liveMapDlgSpot.value = Object.assign({}, rp)
          liveMapSelectedId.value = rp.id
          liveOverrideSpot.value = rp.id
          liveMapOverrideStepOpts.value = (rp.steps || []).slice()
          const ov = ((liveData.value && liveData.value.dayOps && liveData.value.dayOps.spotStepOverrides) || {})[rp.id]
          liveMapOverrideRequired.value = (ov && ov.requiredStepIds) ? ov.requiredStepIds.slice() : []
          liveOverrideRequired.value = liveMapOverrideRequired.value.slice()
          // preselect gate + progress spot for attendees
          liveGatePointId.value = rp.id
          ;(liveMapDlgAttendees.value || []).forEach((a) => {
            setLiveProgSpot(a.bookingId, rp.id)
          })
          liveMapDlgOpen.value = true
        }
        const onLiveMapDlgClosed = () => {
          liveMapDlgSpot.value = null
        }
        const liveMapSetClosed = async (on) => {
          if (!liveMapDlgSpot.value) return
          const id = String(liveMapDlgSpot.value.id)
          const cur = new Set((liveClosedSpots.value || []).map(String))
          if (on) cur.add(id); else cur.delete(id)
          liveClosedSpots.value = Array.from(cur)
          try {
            await liveSaveTourFlags()
            liveMapDlgSpot.value = Object.assign({}, liveMapDlgSpot.value, { closed: !!on })
            renderLiveFieldMapMarkers()
          } catch (_e) {}
        }
        const liveMapSaveStepOverride = async () => {
          if (!liveMapDlgSpot.value) return
          liveOverrideSpot.value = liveMapDlgSpot.value.id
          liveOverrideRequired.value = (liveMapOverrideRequired.value || []).slice()
          await liveSaveStepOverride()
        }
        const liveMapClearStepOverride = async () => {
          if (!liveMapDlgSpot.value) return
          liveOverrideSpot.value = liveMapDlgSpot.value.id
          await liveClearStepOverride()
          liveMapOverrideRequired.value = []
        }
        const liveMapOpenGate = async (rotate) => {
          if (!liveMapDlgSpot.value) return
          liveGatePointId.value = liveMapDlgSpot.value.id
          await loadLiveGate(!!rotate)
        }
        const liveMapSkipStep = async (row, mode) => {
          if (!liveMapDlgSpot.value || !row) return
          setLiveProgSpot(row.bookingId, liveMapDlgSpot.value.id)
          await liveSkipStep(row, mode)
        }
        const liveMapEndStation = async (row) => {
          if (!liveMapDlgSpot.value || !row) return
          setLiveProgSpot(row.bookingId, liveMapDlgSpot.value.id)
          await liveEndStation(row)
        }
        watch(liveTab, (v) => {
          if (v === "field-map") nextTick(() => ensureLiveFieldMap(true))
        })
        watch([liveRoutePoints, liveClosedSpots, liveHeatmap, liveTourPaused], () => {
          if (liveTab.value === "field-map") renderLiveFieldMapMarkers()
        })
  Object.assign(s, {
    liveDate,
    liveLoading,
    liveSaving,
    liveData,
    liveTimer,
    livePaused,
    livePauseCheckin,
    liveCapacity,
    liveNote,
    liveDutyId,
    liveTourMallOpen,
    liveTab,
    liveSelected,
    liveBatchBusy,
    liveGate,
    liveGateLoading,
    liveGatePointId,
    shanghaiToday,
    ensureLiveDate,
    stopLivePoll,
    liveCounts,
    liveAlerts,
    liveContacts,
    liveDutyOptions,
    liveAttendees,
    liveRoutePoints,
    liveSelectedIds,
    syncLiveForm,
    loadProjLive,
    startLivePoll,
    saveLiveDayOps,
    redeemLiveDay,
    toggleLiveSelect,
    liveSelectAllPending,
    liveClearSelect,
    batchRedeemLive,
    loadLiveGate,
    exportLiveCsv,
    openLiveCertPanel,
    openLiveMallPanel,
    liveActBusy,
    liveProgSpot,
    liveProgStep,
    liveGradBookingId,
    setLiveProgSpot,
    setLiveProgStep,
    liveSpotOptionsFor,
    liveStepsForRow,
    ensureLiveProgDefaults,
    livePost,
    liveSkipStep,
    liveEndStation,
    setLiveGraduation,
    liveKiosk,
    liveCompact,
    liveSoundOn,
    livePrevBookingCount,
    livePrevAnomalyCount,
    liveTourPaused,
    liveBroadcastText,
    liveClosedSpots,
    liveOverrideSpot,
    liveOverrideRequired,
    liveOverrideStepOpts,
    liveProxyUserId,
    liveProxySeats,
    liveProxyName,
    liveRescheduleId,
    liveRescheduleDate,
    liveSeatBookingId,
    liveSeatAction,
    liveSeatDelta,
    liveWaitName,
    liveWaitPhone,
    liveWaitlist,
    liveScanOpen,
    liveScanCode,
    liveScanHit,
    liveForceNote,
    livePtsBookingId,
    livePtsDelta,
    livePtsNote,
    livePtsLedgerText,
    liveCouponsText,
    liveCouponItems,
    liveCouponEdit,
    liveCouponEditExpire,
    liveCouponExtendDays,
    liveBatchExpireDays,
    liveCouponTitle,
    liveCouponSpot,
    liveAnomalyMsg,
    schedTab,
    schedCalMonth,
    schedDays,
    schedLoading,
    schedSaving,
    schedSelectedDate,
    schedDayDetail,
    schedBatchWeekdays,
    schedBatchOpen,
    schedBatchCapacity,
    schedVersions,
    schedVersionForm,
    schedLogs,
    schedCopySource,
    schedCopyFromWeek,
    schedCopyToWeek,
    schedCopyTargetFrom,
    schedCopyTargetTo,
    shanghaiMonthNow,
    schedMonthCells,
    loadSchedMonth,
    shiftSchedMonth,
    openSchedDay,
    saveSchedDay,
    batchSchedWeekdays,
    seedSchedHorizon,
    loadSchedVersions,
    editSchedVersion,
    resetSchedVersionForm,
    saveSchedVersion,
    deleteSchedVersion,
    snapshotSchedVersions,
    loadSchedLogs,
    copySchedDayRange,
    copySchedWeek,
    liveCanWrite,
    liveHeatmap,
    liveNoshowQueue,
    liveAnomalies,
    liveTimeline,
    liveBroadcastBanner,
    liveBeep,
    toggleLiveKiosk,
    toggleLiveCompact,
    liveApi,
    openLiveScan,
    liveScanSubmit,
    liveRedeemFromScan,
    liveForceFromScan,
    liveForceCheckinPrompt,
    liveProxyBook,
    liveDoReschedule,
    liveDoSeats,
    liveWaitlistLoad,
    liveWaitlistAdd,
    liveWaitlistRemove,
    liveRemindNoshow,
    exportNoshowCsv,
    liveSaveTourFlags,
    liveLoadOverrideSteps,
    liveSaveStepOverride,
    liveClearStepOverride,
    liveLoadPointsAndCoupons,
    openLiveCouponEdit,
    closeLiveCouponEdit,
    saveLiveCouponExpire,
    quickExtendLiveCoupon,
    liveAdjustPoints,
    liveBatchCoupons,
    livePuzzleGrant,
    liveCertAction,
    liveReportAnomaly,
    liveAckAnomaly,
    liveFieldMapEl,
    liveMapSelectedId,
    liveMapDlgOpen,
    liveMapDlgSpot,
    liveMapOverrideRequired,
    liveMapOverrideStepOpts,
    liveMapHeatOf,
    liveMapIsClosed,
    liveMapSpotRows,
    liveMapDlgAttendees,
    liveMapEsc,
    destroyLiveFieldMap,
    renderLiveFieldMapMarkers,
    ensureLiveFieldMap,
    openLiveFieldMapTab,
    focusLiveMapSpot,
    openLiveMapDlg,
    onLiveMapDlgClosed,
    liveMapSetClosed,
    liveMapSaveStepOverride,
    liveMapClearStepOverride,
    liveMapOpenGate,
    liveMapSkipStep,
    liveMapEndStation
  })
}
