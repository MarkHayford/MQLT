import { ref, computed, watch, nextTick } from "vue"

export function useInvoices(s) {
        const invoiceLabel = (s) => {
          const v = String(s || "").toUpperCase()
          if (v === "PENDING") return "待开票"
          if (v === "ISSUED") return "已开票"
          if (v === "REJECTED") return "已驳回"
          if (v === "CANCELLED") return "已取消"
          return s || "—"
        }
        const invFilter = ref("all")
        const invAll = ref([])
        const invList = ref([])
        const invLoading = ref(false)
        const invOpen = ref(false)
        const invSelected = ref(null)
        const invSaving = ref(false)
        const invForm = ref({ pdfUrl: "", invoiceNo: "", rejectReason: "", adminRemark: "" })
        const invStats = computed(() => {
          const rows = invAll.value || []
          let pending = 0, issued = 0, rejected = 0
          for (let i = 0; i < rows.length; i++) {
            const st = String(rows[i].status || "").toUpperCase()
            if (st === "PENDING") pending++
            else if (st === "ISSUED") issued++
            else if (st === "REJECTED") rejected++
          }
          return { total: rows.length, pending, issued, rejected }
        })
        const canInvoiceManage = computed(() => {
          const a = s.account.value
          if (!a) return false
          if (a.mpAccess) {
            if (String(a.mpRole || "") === "SUPER_ADMIN") return true
            const p = a.adminPermissions || []
            if (!p.length) return true
            return s.accountHasPerm(p, "invoice.manage")
          }
          if (a.merchantAccess) {
            const p = a.merchantPermissions || []
            if (!p.length) return true
            return s.accountHasPerm(p, "invoice.manage")
          }
          return false
        })
        const invUserLine = (row) => {
          const u = (row && row.user) || {}
          const parts = []
          if (u.nickname) parts.push(u.nickname)
          if (u.studyNo) parts.push(u.studyNo)
          if (u.phone) parts.push(s.maskPhone(u.phone))
          return parts.length ? parts.join(" · ") : "—"
        }
        const invSourceLabel = (it) => {
          if (!it) return "—"
          const st = String(it.sourceType || "")
          if (st === "MALL_ORDER") return "文创"
          if (st === "STUDY_BOOKING") return "研学"
          if (st === "RENTAL_ORDER") return "租车"
          return st || "—"
        }
        const invIssuerLabel = (row) => {
          if (!row) return "—"
          if (String(row.issuerType || "").toUpperCase() === "PLATFORM") return "平台"
          return row.enterpriseName || "企业"
        }
        const loadInvoices = async () => {
          invLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (s.inEntWorkspace.value) s.scopeQs(qs)
            const url = "/api/v1/admin/invoices" + (qs.toString() ? ("?" + qs.toString()) : "")
            const res = await fetch(url, { headers: s.authHeaders() })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || json.msg || "发票加载失败")
            const rows = s.unwrap(json) || []
            invAll.value = Array.isArray(rows) ? rows : []
            const f = invFilter.value
            if (f === "all") invList.value = invAll.value.slice()
            else invList.value = invAll.value.filter((x) => String(x.status || "").toUpperCase() === String(f).toUpperCase())
          } catch (err) {
            invAll.value = []
            invList.value = []
            ElementPlus.ElMessage.error(err.message || "发票加载失败")
          } finally {
            invLoading.value = false
          }
        }
        const openInvoice = async (row) => {
          invSelected.value = row || null
          invForm.value = {
            pdfUrl: (row && row.pdfUrl) || "",
            invoiceNo: (row && row.invoiceNo) || "",
            rejectReason: (row && row.rejectReason) || "",
            adminRemark: (row && row.adminRemark) || ""
          }
          invOpen.value = true
          if (row && row.id) {
            try {
              const res = await fetch("/api/v1/admin/invoices/" + encodeURIComponent(row.id), { headers: s.authHeaders() })
              const json = await res.json().catch(() => ({}))
              if (res.ok) {
                const detail = s.unwrap(json)
                if (detail) {
                  invSelected.value = detail
                  invForm.value.pdfUrl = detail.pdfUrl || invForm.value.pdfUrl
                  invForm.value.invoiceNo = detail.invoiceNo || invForm.value.invoiceNo
                  invForm.value.rejectReason = detail.rejectReason || invForm.value.rejectReason
                  invForm.value.adminRemark = detail.adminRemark || invForm.value.adminRemark
                }
              }
            } catch (_e) {}
          }
        }
        const closeInvoice = () => {
          invOpen.value = false
          invSelected.value = null
        }
        const saveInvoiceStatus = async (status) => {
          if (!invSelected.value || !invSelected.value.id) return
          if (!canInvoiceManage.value) {
            ElementPlus.ElMessage.warning("没有开具发票的权限")
            return
          }
          invSaving.value = true
          try {
            const body = {
              status,
              pdfUrl: invForm.value.pdfUrl,
              invoiceNo: invForm.value.invoiceNo,
              rejectReason: invForm.value.rejectReason,
              adminRemark: invForm.value.adminRemark
            }
            const res = await fetch("/api/v1/admin/invoices/" + encodeURIComponent(invSelected.value.id), {
              method: "PUT",
              headers: { ...authHeaders(), "Content-Type": "application/json" },
              body: JSON.stringify(body)
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.message || json.msg || "保存失败")
            const payload = s.unwrap(json) || {}
            if (status === "ISSUED") {
              const mail = payload.emailNotice || "邮件：已跳过（未配置）"
              ElementPlus.ElMessage.success("已开具 · " + mail)
            } else {
              ElementPlus.ElMessage.success("已驳回")
            }
            await loadInvoices()
            const refreshed = (invList.value || []).find((x) => x.id === invSelected.value.id) || (invAll.value || []).find((x) => x.id === invSelected.value.id)
            if (refreshed) invSelected.value = refreshed
            else invSelected.value = s.unwrap(json)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            invSaving.value = false
          }
        }

  Object.assign(s, {
    invoiceLabel,
    invFilter,
    invAll,
    invList,
    invLoading,
    invOpen,
    invSelected,
    invSaving,
    invForm,
    invStats,
    canInvoiceManage,
    invUserLine,
    invSourceLabel,
    invIssuerLabel,
    loadInvoices,
    openInvoice,
    closeInvoice,
    saveInvoiceStatus
  })
}
