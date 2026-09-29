import { ref, computed, watch, nextTick } from "vue"

export function useFeedback(s) {
        const feedbackLabel = (s) => {
          const v = String(s || "").toLowerCase()
          if (v === "submitted" || v === "pending" || v === "open") return "待处理"
          if (v === "processing") return "处理中"
          if (v === "replied" || v === "resolved") return "已回复"
          if (v === "closed") return "已关闭"
          if (v === "withdrawn") return "已撤回"
          return s || "—"
        }
        const FEEDBACK_TYPE_LABELS = { bug: "功能异常", experience: "体验建议", content: "内容问题", service: "客服服务", feature: "功能建议", other: "其他" }
        const feedbackTypeLabel = (t) => FEEDBACK_TYPE_LABELS[String(t || "").toLowerCase()] || t || "其他"
        const isPendingFbStatus = (s) => {
          const v = String(s || "").toLowerCase()
          return v === "submitted" || v === "open" || v === "pending" || v === "processing"
        }
        const fbFilter = ref("all")
        const fbAll = ref([])
        const fbList = ref([])
        const fbLoading = ref(false)
        const fbOpen = ref(false)
        const fbSelected = ref(null)
        const fbReply = ref("")
        const fbSaving = ref(false)
        const fbStats = computed(() => {
          const rows = fbAll.value || []
          let pending = 0, replied = 0, closed = 0
          for (let i = 0; i < rows.length; i++) {
            const st = String(rows[i].status || "").toLowerCase()
            if (isPendingFbStatus(st)) pending++
            else if (st === "replied" || st === "resolved") replied++
            else if (st === "closed") closed++
          }
          return { total: rows.length, pending, replied, closed }
        })
        const canFeedbackManage = computed(() => {
          const a = s.account.value
          if (!a || !a.mpAccess) return false
          if (String(a.mpRole || "") === "SUPER_ADMIN") return true
          const p = a.adminPermissions || []
          if (!p.length) return true
          return s.accountHasPerm(p, "feedback.manage")
        })
        const fbContentBrief = (c) => {
          const s = String(c || "").replace(/\s+/g, " ").trim()
          if (!s) return "—"
          return s.length > 48 ? s.slice(0, 48) + "…" : s
        }
        const fbUserLine = (f) => {
          const u = (f && f.user) || {}
          const parts = []
          if (u.nickname) parts.push(u.nickname)
          if (u.studyNo) parts.push(u.studyNo)
          if (u.phone) parts.push(s.maskPhone(u.phone))
          return parts.length ? parts.join(" · ") : "—"
        }
        const fbContactLine = (f) => {
          if (!f) return "—"
          const parts = []
          if (f.contactPhone) parts.push(f.contactPhone)
          if (f.contactEmail) parts.push(f.contactEmail)
          return parts.length ? parts.join(" · ") : "—"
        }
        const fbTagsText = (f) => {
          const tags = f && f.tags
          if (!tags) return ""
          if (Array.isArray(tags)) return tags.filter(Boolean).join("、")
          return String(tags)
        }
        const loadFeedback = async () => {
          fbLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/feedback", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || json.msg || "反馈加载失败")
            let list = s.unwrap(json)
            if (!Array.isArray(list)) list = (list && (list.items || list.list)) || []
            fbAll.value = list
            const f = fbFilter.value
            if (f === "pending") list = list.filter((row) => isPendingFbStatus(row.status))
            else if (f === "replied") list = list.filter((row) => { const s = String(row.status || "").toLowerCase(); return s === "replied" || s === "resolved" })
            else if (f === "closed") list = list.filter((row) => String(row.status || "").toLowerCase() === "closed")
            else if (f === "withdrawn") list = list.filter((row) => String(row.status || "").toLowerCase() === "withdrawn")
            fbList.value = list
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "反馈加载失败")
            fbAll.value = []
            fbList.value = []
          } finally {
            fbLoading.value = false
          }
        }
        const openFeedback = (row) => {
          fbSelected.value = row || null
          fbReply.value = (row && row.reply) ? String(row.reply) : ""
          fbOpen.value = true
        }
        const closeFeedback = () => {
          fbOpen.value = false
          fbSelected.value = null
          fbReply.value = ""
        }
        const saveFeedbackStatus = async (status) => {
          if (!fbSelected.value || !fbSelected.value.id) return
          if (!canFeedbackManage.value) {
            ElementPlus.ElMessage.warning("没有处理反馈的权限")
            return
          }
          fbSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/feedback/" + encodeURIComponent(fbSelected.value.id), {
              method: "PUT",
              headers: s.authHeaders(),
              body: JSON.stringify({ status, reply: fbReply.value })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || json.msg || "更新失败")
            const data = s.unwrap(json) || {}
            ElementPlus.ElMessage.success(status === "closed" ? "已关闭" : "已回复")
            await loadFeedback()
            const refreshed = (fbList.value || []).find((x) => x.id === fbSelected.value.id)
            if (refreshed) {
              fbSelected.value = refreshed
              fbReply.value = refreshed.reply ? String(refreshed.reply) : fbReply.value
            } else if (data && data.id) {
              fbSelected.value = data
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "更新失败")
          } finally {
            fbSaving.value = false
          }
        }
  Object.assign(s, {
    feedbackLabel,
    FEEDBACK_TYPE_LABELS,
    feedbackTypeLabel,
    isPendingFbStatus,
    fbFilter,
    fbAll,
    fbList,
    fbLoading,
    fbOpen,
    fbSelected,
    fbReply,
    fbSaving,
    fbStats,
    canFeedbackManage,
    fbContentBrief,
    fbUserLine,
    fbContactLine,
    fbTagsText,
    loadFeedback,
    openFeedback,
    closeFeedback,
    saveFeedbackStatus
  })
}
