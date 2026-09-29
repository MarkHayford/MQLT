import { watch, onMounted, nextTick } from "vue"

export function useBootstrap(s) {
        watch(s.active, (k) => {
          const trees = !s.inEntWorkspace.value ? s.MP_MENUS : (s.inProjWorkspace.value ? s.PROJ_MENUS : s.ENT_MENUS)
          const next = Object.assign({}, s.sideOpen.value)
          for (let i = 0; i < trees.length; i++) {
            const kids = trees[i].children || []
            if (kids.some((c) => c.key === k)) next[trees[i].key] = true
          }
          s.sideOpen.value = next
        })
        watch(s.mallPreview, (p) => {
          if (s.mallPreviewHero.value >= (p.gallery || []).length) s.mallPreviewHero.value = 0
        })
        watch(s.spotEditorKey, () => nextTick(s.hydrateSpotEditors))
        watch(() => s.bkCreate.value && s.bkCreate.value.projectId, (id) => {
          if (id) s.loadRouteCatalog(id)
        })
        watch(s.projEditPanel, (v) => {
          if (v === "resources") s.loadProjectResources()
          if (v === "audience") {
            const p = s.projSelected.value
            if (p && p.id) s.loadProjRoutes(p.id)
            s.loadAudienceTemplates()
          }
          if (v === "schedule") { s.loadSchedMonth(); s.loadSchedVersions(); s.loadSchedLogs() }
          if (v === "place") nextTick(() => setTimeout(s.initProjMap, 280))
          else s.destroyProjMap()
          if (v === "route") {
            const p = s.projSelected.value
            if (p && p.id) s.loadProjRoutes(p.id)
            if (!s.entDicts.value.routeZones || !s.entDicts.value.routeZones.length) s.loadEntDicts()
            nextTick(() => setTimeout(() => {
              if (!s.projSpotForm.value && s.projRoutePoints.value.length) s.selectProjSpot(s.projRoutePoints.value[0])
              else if (s.projSpotForm.value) s.afterSpotFormReady()
            }, 280))
          } else {
            s.destroyProjSpotMap()
          }
        })
        watch([s.view, s.area, s.active], () => {
          if (s.view.value !== "app") return
          if (s.area.value === "mp" && s.active.value === "overview") { s.loadOverview(); s.loadEntList(); s.loadPlatFinance() }
          if (s.area.value === "mp" && s.active.value === "users") s.loadUsers()
          if (((s.area.value === "mp" && !s.inEntWorkspace.value) || s.inEntWorkspace.value) && s.active.value === "logs") s.loadLogs()
          if (s.area.value === "mp" && s.active.value === "drivers") s.loadDrivers()
          if (s.area.value === "mp" && s.active.value === "rental-orders") s.loadRentalOrders()
          if (s.area.value === "mp" && s.active.value === "posts-overview") { s.postStatus.value = "all"; s.loadPosts() }
          if (s.area.value === "mp" && s.active.value === "posts-review") { s.postStatus.value = "pending"; s.loadSettings(); s.loadReviewQueue() }
          if (s.area.value === "mp" && s.active.value === "posts-publish") { s.postStatus.value = "draft"; s.loadPosts() }
          if (s.area.value === "mp" && s.active.value === "posts-cats") s.loadSettings()
          if (s.area.value === "mp" && s.active.value === "posts-units") { s.loadPublisherUnits(); if (!s.projList.value.length) s.loadProjects(); if (!s.projEnterprises.value.length) s.loadEnterprises() }
          if (s.area.value === "mp" && s.active.value === "posts-dynamics") { s.loadSettings(); s.loadEnterprises(); s.loadProjectsForNoticeFilter(); s.noticePage.value = 1; s.loadNotices() }
          if (s.area.value === "mp" && s.active.value === "feedback") s.loadFeedback()
          if (((s.area.value === "mp" && !s.inEntWorkspace.value) || s.inEntWorkspace.value) && s.active.value === "invoices") s.loadInvoices()
          if (s.area.value === "mp" && s.active.value === "settings") { s.loadSettings(); s.loadEnterprises() }
          if (s.area.value === "mp" && s.active.value === "splash-announce") s.loadSettings()
          if (s.area.value === "mp" && !s.inEntWorkspace.value && (s.active.value === "mp-roles" || s.active.value === "mp-users")) { s.loadMpStaff(); if (!s.projEnterprises.value.length) s.loadEnterprises(); s.loadMpScopeProjects() }
          if (s.area.value === "mp" && s.active.value === "enterprises") s.loadEntList()
          if (s.inEntWorkspace.value && !s.inProjWorkspace.value && s.active.value === "dynamics") { s.openPage("notices"); return }
          if (s.inEntWorkspace.value && !s.inProjWorkspace.value && s.active.value === "home") { s.loadProjects(); s.loadBookings(); s.loadNotices(); s.loadMall(); s.loadMallOrders(); s.loadEntFinance(); s.loadEntStaff() }
          if (s.inProjWorkspace.value && s.active.value === "proj-home") { s.loadBookings(); s.loadNotices(); s.loadMall(); s.loadMallOrders() }
          if (s.inProjWorkspace.value && s.active.value === "proj-live") { s.ensureLiveDate(); s.loadProjLive(false); s.startLivePoll() } else { s.stopLivePoll() } /* live-command-center: Phase3 tabs — no vehicles */
          if (s.inProjWorkspace.value && s.active.value === "bookings") { if (!s.bkGroupMode.value) s.bkGroupMode.value = "byDate" }
          if (s.active.value === "proj-edit") {
            if (s.inProjWorkspace.value && s.opsProj.value && s.opsProj.value.id) {
              if (!s.projSelected.value || String(s.projSelected.value.id) !== String(s.opsProj.value.id)) s.openProj(s.opsProj.value)
              else { if (!s.projEditPanel.value) s.projEditPanel.value = "basic"; s.loadProjRoutes(s.opsProj.value.id); s.loadProjectResources(); s.loadEntDicts() }
            } else if (!s.projCreating.value && !s.projSelected.value) {
              s.projEditPanel.value = "basic"
            }
          }
          if (s.inEntWorkspace.value && s.active.value === "projects") { s.loadProjects(); s.loadEntDicts() }
          if (s.inEntWorkspace.value && s.active.value === "project-submit") { s.projStatus.value = "all"; s.loadProjects() }
          if (s.area.value === "mp" && !s.inEntWorkspace.value && s.active.value === "project-review") { s.projStatus.value = "all"; s.loadProjects(); s.loadSettings() }
          if (s.inEntWorkspace.value && s.active.value === "notices") { s.loadNotices(); s.loadEntDicts(); s.loadSettings(); if (!s.projList.value.length) s.loadProjects() }
          if (s.inEntWorkspace.value && s.active.value === "dynamics") { if (s.scopePid.value) s.noticeProjectId.value = String(s.scopePid.value); s.loadNotices(); s.loadEntDicts(); s.loadSettings(); if (!s.projList.value.length) s.loadProjects() }
          if (s.inEntWorkspace.value && s.active.value === "bookings") { s.loadBookings(); if (!s.projList.value.length) s.loadProjects() }
          if (s.inEntWorkspace.value && s.active.value === "mall") { s.loadMall(); s.loadEntDicts() }
          if (s.inEntWorkspace.value && s.active.value === "mall-orders") { s.loadMallOrders(); if (!(s.mallList.value || []).length) s.loadMall() }
          if (s.inEntWorkspace.value && s.active.value === "finance") s.loadEntFinance()
          if (s.inEntWorkspace.value && s.active.value === "finance-withdraw") { s.loadEntFinance(); s.loadEntWds(); s.loadPayAccounts() }
          if (s.inEntWorkspace.value && (s.active.value === "staff" || s.active.value === "staff-roles" || s.active.value === "staff-users")) { s.loadEntStaff(); if (!s.projList.value.length) s.loadProjects() }
          if (s.area.value === "mp" && s.inEntWorkspace.value && s.active.value === "ent-archive" && s.opsEnt.value) s.openEnt(s.opsEnt.value)
          if (s.active.value === "personal") s.refreshPersonal()
          if (s.area.value === "mp" && !s.inEntWorkspace.value && s.active.value === "finance") s.loadPlatFinance()
          if (s.area.value === "mp" && !s.inEntWorkspace.value && s.active.value === "withdraw-review") { s.loadPlatEwd(); s.loadDriverWithdrawals() }
          if (s.area.value === "mp" && !s.inEntWorkspace.value && s.active.value === "commission") s.loadCommission()
        })
        onMounted(s.restore)
}
