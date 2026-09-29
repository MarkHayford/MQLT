import { ref, computed } from "vue"

export function usePosts(s) {
        const postSel = ref([])
        const noticeSel = ref([])
        const postBatch = async (url, body) => {
          const res = await fetch(url, { method: "POST", headers: s.authHeaders(), body: JSON.stringify(body || {}) })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "操作失败")
          return s.unwrap(json) || json
        }
        const postLabel = (s) => {
          const v = String(s || "").toLowerCase()
          if (v === "published") return "已发布"
          if (v === "draft") return "草稿"
          if (v === "hidden" || v === "removed") return "已下架"
          return s || "—"
        }
        const noticeFilterProjects = ref([])
        const loadProjectsForNoticeFilter = async () => {
          try {
            const qs = new URLSearchParams()
            qs.set("page", "1")
            qs.set("pageSize", "200")
            if (noticeEnterpriseId.value) qs.set("enterpriseId", String(noticeEnterpriseId.value))
            const res = await fetch("/api/v1/admin/study-projects?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            noticeFilterProjects.value = s.unwrapPaged(json).items || []
            if (!s.projList.value.length) s.projList.value = noticeFilterProjects.value
          } catch (_err) {
            noticeFilterProjects.value = []
          }
        }
        const onNoticeEnterpriseChange = () => {
          noticeProjectId.value = ""
          noticePage.value = 1
          loadProjectsForNoticeFilter()
          loadNotices()
        }
        const noticeProjectOptions = computed(() => {
          if (s.active.value === "posts-dynamics") return noticeFilterProjects.value.length ? noticeFilterProjects.value : s.projList.value
          return s.projList.value
        })
        const POST_DRAWER_W_KEY = "mqlt-post-drawer-width"
        const POST_FORM_W_KEY = "mqlt-post-form-width"
        const CHIP_DRAWER_W_KEY = "mqlt-chip-drawer-width"
        const CHIP_FORM_W_KEY = "mqlt-chip-form-width"
        const contentReviewForm = ref({ open: false, action: "approve", ids: [], category: "", note: "", count: 0 })
        const contentReviewSaving = ref(false)
        const submitContentReview = async () => {
          const f = contentReviewForm.value
          const ids = (f.ids || []).slice()
          if (!ids.length) { f.open = false; return }
          const category = String(f.category || "").trim()
          if (!category) {
            ElementPlus.ElMessage.warning("请选择分类")
            return
          }
          contentReviewSaving.value = true
          try {
            const items = ids.map((k) => {
              const s = String(k)
              if (s.indexOf("notice:") === 0) return { kind: "notice", id: s.slice(7) }
              if (s.indexOf("community:") === 0) return { kind: "community", id: s.slice(10) }
              return { kind: "community", id: s }
            })
            const data = await postBatch("/api/v1/admin/content-review/batch", {
              items,
              action: "approve",
              note: String(f.note || "").trim(),
              category
            })
            ElementPlus.ElMessage.success("已通过 " + ((data && data.updated) || ids.length) + " 条")
            postSel.value = []
            f.open = false
            await loadReviewQueue()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "审批失败")
          } finally {
            contentReviewSaving.value = false
          }
        }
        const batchPosts = async (action) => {
          const ids = (postSel.value || []).slice()
          if (!ids.length) return
          const onReview = s.active.value === "posts-review" || ids.some((x) => String(x).indexOf(":") > 0)
          let act = action
          let label = action === "publish" ? "上架" : (action === "hide" ? "下架" : "删除")
          let note = ""
          let category = ""
          if (onReview && (action === "publish" || action === "approve" || action === "reject")) {
            act = action === "reject" ? "reject" : "approve"
            label = act === "approve" ? "通过上架" : "驳回"
            if (act === "reject") {
              const res = await ElementPlus.ElMessageBox.prompt("可填写驳回原因（可选）", "驳回资讯", { confirmButtonText: "驳回", cancelButtonText: "取消", inputPlaceholder: "驳回原因", inputValue: "" }).catch(() => null)
              if (!res) return
              note = String((res && res.value) || "").trim()
            } else {
              if (!(s.settingsDicts.value && s.settingsDicts.value.noticeTypes && s.settingsDicts.value.noticeTypes.length)) {
                try { await s.loadSettings() } catch (_e) {}
              }
              const cats = ((s.settingsDicts.value && s.settingsDicts.value.noticeTypes) || []).slice()
              if (!cats.length) {
                ElementPlus.ElMessage.warning("请先在「资讯→分类」配置平台分类")
                return
              }
              contentReviewForm.value = {
                open: true,
                action: "approve",
                ids: ids.slice(),
                category: cats[0] || "",
                note: "",
                count: ids.length
              }
              return
            }
            try {
              const items = ids.map((k) => {
                const s = String(k)
                if (s.indexOf("notice:") === 0) return { kind: "notice", id: s.slice(7) }
                if (s.indexOf("community:") === 0) return { kind: "community", id: s.slice(10) }
                return { kind: "community", id: s }
              })
              const data = await postBatch("/api/v1/admin/content-review/batch", { items, action: act, note, category })
              ElementPlus.ElMessage.success("已处理 " + ((data && data.updated) || ids.length) + " 条")
              postSel.value = []
              await loadReviewQueue()
            } catch (err) {
              ElementPlus.ElMessage.error(err.message || "处理失败")
            }
            return
          }
          const ok = await ElementPlus.ElMessageBox.confirm("将对选中的 " + ids.length + " 篇文章执行「" + label + "」。", action === "delete" ? "批量删除" : "批量处理", { confirmButtonText: label, cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const data = await postBatch("/api/v1/admin/community-posts/batch", { ids, action })
            ElementPlus.ElMessage.success("已处理 " + ((data && (data.updated || data.deleted)) || ids.length) + " 条")
            postSel.value = []
            await loadPosts()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "处理失败")
          }
        }
        const emptyNotice = () => ({
          title: "", html: "<p></p>", type: "", category: "", projectId: "", publisher: "", kind: "news",
          coverMode: "none", coverTplId: "sticky", coverHl: "", coverImages: [],
          tags: [], tagDraft: "", videos: [], videoUrl: "", videoThumb: "", links: [], linkDraft: ""
        })
        const emptyPost = () => ({
          title: "", html: "<p></p>", channel: "official", status: "pending", category: "", projectId: "", enterpriseId: "", publisherScope: "platform",
          coverMode: "none", coverTplId: "sticky", coverHl: "", coverImages: [],
          tags: [], tagDraft: "", videos: [], videoUrl: "", videoThumb: "",
          links: [], linkDraft: ""
        })
        const COVER_TPLS = [
          { id: "sticky", name: "便签" }, { id: "quote", name: "引用" }, { id: "mint", name: "薄荷" },
          { id: "peach", name: "蜜桃" }, { id: "sky", name: "晴空" }, { id: "lined", name: "横线" },
          { id: "letter", name: "信笺" }, { id: "dusk", name: "暖橙" }, { id: "forest", name: "林绿" }
        ]
        const SUGGEST_TAGS = computed(() => (s.platformDicts.value && s.platformDicts.value.articleTags && s.platformDicts.value.articleTags.length) ? s.platformDicts.value.articleTags : ["感受", "宣传", "研学", "亲子", "攻略", "路线"])
        const encodeMark = (s) => String(s || "").split("|").join("%7C")
        const decodeMark = (s) => String(s || "").split("%7C").join("|")
        const parseMarks = (html, prefix) => {
          const out = []
          const token = "[[" + prefix + ":"
          let from = 0
          const src = String(html || "")
          while (true) {
            const i = src.indexOf(s.token, from)
            if (i < 0) break
            const start = i + s.token.length
            const end = src.indexOf("]]", start)
            if (end < 0) break
            out.push(src.substring(start, end))
            from = end + 2
          }
          return out
        }
        const stripBodyExtras = (html) => {
          let out = String(html || "")
          const kinds = ["video", "link", "tags", "cover"]
          for (let k = 0; k < kinds.length; k++) {
            const token = "[[" + kinds[k] + ":"
            while (true) {
              const i = out.indexOf(s.token)
              if (i < 0) break
              const end = out.indexOf("]]", i)
              if (end < 0) break
              let from = i
              let to = end + 2
              if (from >= 3 && out.substring(from - 3, from) === "<p>") from = from - 3
              if (to + 4 <= out.length && out.substring(to, to + 4) === "</p>") to = to + 4
              out = out.substring(0, from) + out.substring(to)
            }
          }
          return out
        }
        const appendBodyExtras = (html, videos, links, tags) => {
          let out = String(html || "")
          for (let i = 0; i < (videos || []).length; i++) {
            const v = videos[i]
            if (!v || !v.url) continue
            out += "<p>[[video:" + encodeMark(v.url) + "|" + encodeMark(v.thumb || "") + "]]</p>"
          }
          for (let i = 0; i < (links || []).length; i++) {
            const l = links[i]
            if (!l || !l.url) continue
            out += "<p>[[link:" + encodeMark(l.url) + "|" + encodeMark(l.title || "") + "]]</p>"
          }
          if ((tags || []).length) {
            let packed = encodeMark(tags[0])
            for (let i = 1; i < tags.length; i++) packed += "|" + encodeMark(tags[i])
            out += "<p>[[tags:" + packed + "]]</p>"
          }
          return out
        }
        const parsePostTags = (html) => {
          const raw = parseMarks(html, "tags")
          const out = []
          for (let i = 0; i < raw.length; i++) {
            const parts = raw[i].split("|")
            for (let j = 0; j < parts.length; j++) {
              const t = decodeMark(parts[j]).trim()
              if (t && out.indexOf(t) < 0) out.push(t)
            }
          }
          return out
        }
        const parsePostVideos = (html) => {
          const raw = parseMarks(html, "video")
          const out = []
          for (let i = 0; i < raw.length; i++) {
            const bar = raw[i].indexOf("|")
            const url = decodeMark(bar >= 0 ? raw[i].substring(0, bar) : raw[i])
            const thumb = decodeMark(bar >= 0 ? raw[i].substring(bar + 1) : "")
            if (url) out.push({ url, thumb })
          }
          return out
        }
        const parsePostLinks = (html) => {
          const raw = parseMarks(html, "link")
          const out = []
          for (let i = 0; i < raw.length; i++) {
            const bar = raw[i].indexOf("|")
            const url = decodeMark(bar >= 0 ? raw[i].substring(0, bar) : raw[i])
            const title = decodeMark(bar >= 0 ? raw[i].substring(bar + 1) : "")
            if (url) out.push({ url, title: title || guessPostLinkTitle(url) })
          }
          return out
        }
        const guessPostLinkTitle = (url) => {
          const u = String(url || "").toLowerCase()
          if (u.indexOf("mp.weixin.qq.com") >= 0) return "公众号文章"
          if (u.indexOf("channels.weixin.qq.com") >= 0) return "视频号"
          if (u.indexOf("weixin.qq.com") >= 0) return "微信链接"
          return "网页链接"
        }
        const isHttpCover = (url) => {
          const u = String(url || "")
          return u.indexOf("http://") === 0 || u.indexOf("https://") === 0
        }
        const coverModeOf = (cover) => {
          const u = String(cover || "").trim()
          if (isHttpCover(u)) return "image"
          if (u.indexOf("tpl:") === 0) return "tpl"
          return "none"
        }
        const coverTplUrlOf = (id, hl) => {
          const safe = String(id || "sticky")
          const mark = String(hl || "").trim()
          if (!mark) return "tpl:" + safe
          return "tpl:" + safe + "|hl=" + encodeURIComponent(mark)
        }
        const coverTplIdOf = (url) => {
          const u = String(url || "")
          if (u.indexOf("tpl:") !== 0) return "sticky"
          let raw = u.substring(4)
          const pipe = raw.indexOf("|")
          if (pipe >= 0) raw = raw.substring(0, pipe)
          const ids = COVER_TPLS.map((t) => t.id)
          return ids.indexOf(raw) >= 0 ? raw : "sticky"
        }
        const coverTplHlOf = (url) => {
          const u = String(url || "")
          if (u.indexOf("tpl:") !== 0) return ""
          const pipe = u.indexOf("|hl=")
          if (pipe < 0) return ""
          try { return decodeURIComponent(u.substring(pipe + 4)) } catch (_e) { return "" }
        }
        const postChannelLabel = (channel, type) => {
          if (channel === "official") return type || "官方"
          if (channel === "video") return "宣传"
          return type || "文章"
        }
        const postTagColor = (tag) => {
          if (tag === "官方") return "#1A1A1A"
          if (tag === "宣传" || tag === "视频") return "#C45C26"
          if (tag === "亲子") return "#C45C26"
          if (tag === "感受" || tag === "体验" || tag === "研学" || tag === "路线" || tag === "攻略") return "#1A73E8"
          return "#374151"
        }
        const postEditorKey = ref(0)
        const postComments = ref([])
        const postCoverParts = computed(() => {
          const title = String(postForm.value.title || "").trim() || "拟一个让人想点开的标题"
          const hl = String(postForm.value.coverHl || "").trim()
          if (!hl || title.indexOf(hl) < 0) return { prefix: title, head: "", rest: "" }
          const i = title.indexOf(hl)
          return { prefix: title.slice(0, i), head: hl, rest: title.slice(i + hl.length) }
        })
        const isCoverStack = (id) => ["sticky", "mint", "peach", "sky", "dusk"].indexOf(id) >= 0
        const isCoverQuote = (id) => id === "quote" || id === "forest"
        const postDrawerPx = ref(s.readStoredPx(POST_DRAWER_W_KEY, Math.min(1240, Math.max(860, s._winW - 80)), 760, 1400))
        const postFormPx = ref(s.readStoredPx(POST_FORM_W_KEY, 0, 0, 900))
        const startPostDrawerResize = (ev) => s.startColumnResize(ev, {
          getW: () => postDrawerPx.value,
          setW: (v) => { postDrawerPx.value = v },
          setHover: (v) => { s.splitHover.value = v },
          min: 760, max: () => Math.min(1400, window.innerWidth - 16),
          dir: -1, key: POST_DRAWER_W_KEY
        })
        const startPostSplitResize = (ev) => {
          ev.preventDefault()
          const wrap = ev.currentTarget.parentElement
          if (!wrap) return
          const rect = wrap.getBoundingClientRect()
          s.splitHover.value = true
          const move = (e) => {
            postFormPx.value = Math.min(rect.width - 390, Math.max(360, e.clientX - rect.left))
          }
          const up = () => {
            s.splitHover.value = false
            window.removeEventListener("mousemove", move)
            window.removeEventListener("mouseup", up)
            document.body.style.userSelect = ""
            document.body.style.cursor = ""
            try { localStorage.setItem(POST_FORM_W_KEY, String(postFormPx.value)) } catch (_e) {}
          }
          document.body.style.userSelect = "none"
          document.body.style.cursor = "col-resize"
          window.addEventListener("mousemove", move)
          window.addEventListener("mouseup", up)
        }
        const chipDrawerPx = ref(s.readStoredPx(CHIP_DRAWER_W_KEY, Math.min(960, Math.max(760, s._winW - 120)), 720, 1200))
        const chipFormPx = ref(s.readStoredPx(CHIP_FORM_W_KEY, 0, 0, 600))
        const startChipDrawerResize = (ev) => s.startColumnResize(ev, {
          getW: () => chipDrawerPx.value,
          setW: (v) => { chipDrawerPx.value = v },
          setHover: (v) => { s.splitHover.value = v },
          min: 720, max: () => Math.min(1200, window.innerWidth - 16),
          dir: -1, key: CHIP_DRAWER_W_KEY
        })
        const startChipSplitResize = (ev) => {
          ev.preventDefault()
          const wrap = ev.currentTarget.parentElement
          if (!wrap) return
          const rect = wrap.getBoundingClientRect()
          s.splitHover.value = true
          const move = (e) => {
            chipFormPx.value = Math.min(rect.width - 400, Math.max(168, e.clientX - rect.left))
          }
          const up = () => {
            s.splitHover.value = false
            window.removeEventListener("mousemove", move)
            window.removeEventListener("mouseup", up)
            document.body.style.userSelect = ""
            document.body.style.cursor = ""
            try { localStorage.setItem(CHIP_FORM_W_KEY, String(chipFormPx.value)) } catch (_e) {}
          }
          document.body.style.userSelect = "none"
          document.body.style.cursor = "col-resize"
          window.addEventListener("mousemove", move)
          window.addEventListener("mouseup", up)
        }
        const postPreviewHtml = computed(() => stripBodyExtras(postForm.value.html || ""))
        const postPreviewProject = computed(() => {
          const id = String(postForm.value.projectId || "")
          const hit = (s.projList.value || []).find((p) => String(p.id) === id)
          return hit ? hit.title : ((postSelected.value && postSelected.value.projectTitle) || "")
        })
        const postPublisherLabel = computed(() => {
          const scope = String(postForm.value.publisherScope || "platform")
          if (scope === "project") {
            const id = String(postForm.value.projectId || "")
            const hit = (s.projList.value || []).find((p) => String(p.id) === id)
            if (hit) return String(hit.publisherDisplayName || hit.title || "研学项目")
            return "请选择项目"
          }
          if (scope === "enterprise") {
            const id = String(postForm.value.enterpriseId || "")
            const hit = (s.projEnterprises.value || []).find((e) => String(e.id) === id)
              || (s.entList.value || []).find((e) => String(e.id) === id)
            if (hit) return String(hit.publisherDisplayName || hit.shortName || hit.name || "企业")
            return "请选择企业"
          }
          return "蒙企链探运营中心"
        })
        const onPostPublisherScopeChange = () => {
          const scope = String(postForm.value.publisherScope || "platform")
          if (scope === "platform") {
            postForm.value.projectId = ""
            postForm.value.enterpriseId = ""
          } else if (scope === "enterprise") {
            postForm.value.projectId = ""
            if (!s.projEnterprises.value.length) s.loadEnterprises()
          } else if (scope === "project") {
            if (!s.projList.value.length) s.loadProjects()
          }
        }
        const pubUnitKind = ref("all")
        const pubUnitKeyword = ref("")
        const pubUnitList = ref([])
        const pubUnitTotal = ref(0)
        const pubUnitLoading = ref(false)
        const pubUnitSaving = ref(false)
        const loadPublisherUnits = async () => {
          pubUnitLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (pubUnitKeyword.value.trim()) qs.set("keyword", pubUnitKeyword.value.trim())
            if (pubUnitKind.value && pubUnitKind.value !== "all") qs.set("kind", pubUnitKind.value)
            qs.set("page", "1")
            qs.set("pageSize", "200")
            const res = await fetch("/api/v1/admin/publisher-units?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            const paged = s.unwrapPaged(json)
            pubUnitList.value = (paged.items || []).map((u) => {
              const name = String((u && (u.publisherDisplayName || u.effectiveName || u.baseName)) || "").trim()
              return Object.assign({}, u, { publisherDisplayName: name, publisherAvatarUrl: String((u && u.publisherAvatarUrl) || "") })
            })
            pubUnitTotal.value = paged.total
          } catch (err) {
            pubUnitList.value = []
            pubUnitTotal.value = 0
            ElementPlus.ElMessage.error(err.message || "加载失败")
          } finally {
            pubUnitLoading.value = false
          }
        }
        const savePublisherUnitRow = async (row) => {
          if (!row || !row.kind || !row.id) return
          pubUnitSaving.value = true
          try {
            const res = await fetch("/api/v1/admin/publisher-units/" + encodeURIComponent(row.kind) + "/" + encodeURIComponent(row.id), {
              method: "PUT", headers: s.authHeaders(),
              body: JSON.stringify({ publisherDisplayName: String(row.publisherDisplayName || "").trim(), publisherAvatarUrl: String(row.publisherAvatarUrl || "").trim() })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const saved = s.unwrap(json) || {}
            row.publisherDisplayName = saved.publisherDisplayName || ""
            if (saved.publisherAvatarUrl != null) row.publisherAvatarUrl = saved.publisherAvatarUrl
            row.effectiveName = saved.effectiveName || row.baseName
            ElementPlus.ElMessage.success("发布单位已更新")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            pubUnitSaving.value = false
          }
        }
        const clearPublisherUnitOverride = async (row) => {
          if (!row) return
          row.publisherDisplayName = ""
          await savePublisherUnitRow(row)
        }
        const uploadPublisherAvatar = async (option, row) => {
          try {
            const url = await uploadPostFile(option && option.file, false)
            if (!url || !row) return
            row.publisherAvatarUrl = url
            await savePublisherUnitRow(row)
          } catch (err) {
            ElementPlus.ElMessage.error((err && err.message) || "上传失败")
          }
        }
        const clearPublisherAvatar = async (row) => {
          if (!row) return
          row.publisherAvatarUrl = ""
          await savePublisherUnitRow(row)
        }
        const contentTab = ref("notices")
        const noticeKeyword = ref("")
        const noticeEnterpriseId = ref("")
        const noticeProjectId = ref("")
        const noticePage = ref(1)
        const noticeTotal = ref(0)
        const noticeList = ref([])
        const noticeLoading = ref(false)
        const noticeOpen = ref(false)
        const noticeCreating = ref(false)
        const noticeSelected = ref(null)
        const noticeForm = ref(emptyNotice())
        const noticeSaving = ref(false)
        const postKeyword = ref("")
        const postStatus = ref("all")
        const postPage = ref(1)
        const postTotal = ref(0)
        const postList = ref([])
        const postLoading = ref(false)
        const postOpen = ref(false)
        const postCreating = ref(false)
        const postSelected = ref(null)
        const postForm = ref(emptyPost())
        const postSaving = ref(false)
        const NOTICE_TYPES = computed(() => {
          const list = (s.settingsDicts.value && s.settingsDicts.value.noticeTypes) || []
          return list.length ? list.slice() : ["测试分类"]
        })
        const noticeEditorKey = ref(0)
        const htmlToPlain = (html) => {
          return stripBodyExtras(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
        }
        const fillNoticeForm = (row) => {
          const raw = String((row && (row.content || (row.paragraphs || []).join("\n"))) || "")
          const tags = parsePostTags(raw)
          const videos = parsePostVideos(raw)
          const links = parsePostLinks(raw)
          const covers = parseMarks(raw, "cover").map(decodeMark)
          const cover = covers[0] || ""
          const images = covers.filter((u) => isHttpCover(u))
          noticeForm.value = {
            title: (row && row.title) || "",
            html: stripBodyExtras(raw) || "<p></p>",
            type: (row && (row.category || row.type)) || "",
            category: (row && (row.category || row.type)) || "",
            projectId: (row && row.projectId) || "",
            kind: (row && row.kind) || currentNoticeKind(),
            publisher: (row && row.publisher) || "",
            coverMode: coverModeOf(cover),
            coverTplId: coverTplIdOf(cover || "tpl:sticky"),
            coverHl: coverTplHlOf(cover),
            coverImages: images,
            tags,
            tagDraft: "",
            videos,
            videoUrl: "",
            videoThumb: "",
            links,
            linkDraft: ""
          }
          noticeEditorKey.value++
        }
        const noticeCoverParts = computed(() => {
          const title = String(noticeForm.value.title || "").trim() || "拟一个让人想点开的标题"
          const hl = String(noticeForm.value.coverHl || "").trim()
          if (!hl || title.indexOf(hl) < 0) return { prefix: title, head: "", rest: "" }
          const i = title.indexOf(hl)
          return { prefix: title.slice(0, i), head: hl, rest: title.slice(i + hl.length) }
        })
        const noticePreviewHtml = computed(() => stripBodyExtras(noticeForm.value.html || ""))
        const noticeProjectTitle = computed(() => {
          const id = String(noticeForm.value.projectId || "")
          const hit = (s.projList.value || []).find((p) => String(p.id) === id)
          return hit ? hit.title : ((noticeSelected.value && noticeSelected.value.projectTitle) || "")
        })
        const noticePublisherLabel = computed(() => {
          const pid = String(noticeForm.value.projectId || "")
          if (pid) {
            const hit = (s.projList.value || []).find((p) => String(p.id) === pid)
            if (hit) {
              const ov = String(hit.publisherDisplayName || "").trim()
              return s.ov || hit.title || "研学项目"
            }
            return (noticeSelected.value && noticeSelected.value.publisher) || noticeProjectTitle.value || "研学项目"
          }
          const entName = (s.opsEnt.value && (s.opsEnt.value.publisherDisplayName || s.opsEnt.value.shortName || s.opsEnt.value.name))
            || (s.account.value && s.account.value.enterpriseName)
            || ""
          if (entName) return String(entName)
          return (noticeSelected.value && noticeSelected.value.publisher) || "企业"
        })
        const postStatusLabel = (s) => {
          const v = String(s || "").toLowerCase()
          if (v === "pending") return "待审"
          if (v === "draft") return "草稿"
          if (v === "private") return "已下架"
          if (v === "rejected") return "已驳回"
          return "已通过"
        }
        const noticeStatusLabel = (s) => {
          const v = String(s || "").toLowerCase()
          if (v === "pending") return "待审"
          if (v === "rejected") return "已驳回"
          return "已通过"
        }
        const isStudyNoticeRow = (row) => {
          if (!row) return false
          const k = String(row.kind || "")
          if (k === "notice" || k === "news" || k === "dynamics") return true
          if (String(row.contentType || "") === "notice") return true
          if (String(row.reviewKey || "").indexOf("notice:") === 0) return true
          if (String(row.id || "").indexOf("n_") === 0) return true
          return false
        }
        const currentNoticeKind = () => {
          if (s.active.value === "dynamics" || s.active.value === "posts-dynamics") return "dynamics"
          if (s.active.value === "notices") return "news"
          return "news"
        }
        const contentSourceLabel = (row) => {
          if (!row) return "—"
          if (row.sourceLabel) return row.sourceLabel
          if (isStudyNoticeRow(row)) return row.projectId ? "项目" : "企业"
          return "平台"
        }
        const reviewKeyOf = (row) => {
          if (!row) return ""
          if (row.reviewKey) return String(row.reviewKey)
          const kind = isStudyNoticeRow(row) ? "notice" : "community"
          return kind + ":" + String(row.id || "")
        }
        const loadNotices = async () => {
          noticeLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (noticeKeyword.value.trim()) qs.set("keyword", noticeKeyword.value.trim())
            const kind = currentNoticeKind()
            qs.set("kind", kind)
            // 项目工作区：资讯/动态都锁定当前项目；企业工作区：动态可按项目筛选，资讯默认企业级
            let pid = ""
            if (s.inProjWorkspace.value && s.scopePid.value) pid = String(s.scopePid.value)
            else if (noticeProjectId.value) pid = String(noticeProjectId.value)
            if (pid) qs.set("projectId", pid)
            qs.set("page", String(noticePage.value || 1))
            qs.set("pageSize", "20")
            s.scopeQs(qs)
            if (s.inProjWorkspace.value && s.scopePid.value) qs.set("projectId", String(s.scopePid.value))
            if (kind === "news" && !s.inProjWorkspace.value && !noticeProjectId.value) qs.delete("projectId")
            if (s.active.value === "posts-dynamics" && noticeEnterpriseId.value) qs.set("enterpriseId", String(noticeEnterpriseId.value))
            const res = await fetch("/api/v1/admin/notices?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            const paged = s.unwrapPaged(json)
            noticeList.value = paged.items
            noticeTotal.value = paged.total
          } catch (_err) {
            noticeList.value = []
            noticeTotal.value = 0
          } finally {
            noticeLoading.value = false
          }
        }
        const loadProjNotices = async (projectId) => {
          const id = String(projectId || "")
          if (!id) { s.projNotices.value = []; return }
          try {
            const res = await fetch("/api/v1/admin/notices?projectId=" + encodeURIComponent(id) + "&kind=dynamics&page=1&pageSize=50", { headers: s.authHeaders() })
            const json = await res.json()
            s.projNotices.value = s.unwrapPaged(json).items
          } catch (_err) { s.projNotices.value = [] }
        }
        const addNoticeLink = () => {
          let url = String(noticeForm.value.linkDraft || "").trim()
          if (!url) return
          if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) url = "https://" + url
          noticeForm.value.links = (noticeForm.value.links || []).concat([{ url, title: guessPostLinkTitle(url) }])
          noticeForm.value.linkDraft = ""
        }
        const removeNoticeLink = (i) => {
          const links = (noticeForm.value.links || []).slice()
          links.splice(i, 1)
          noticeForm.value.links = links
        }
        const addNoticeVideo = () => {
          const url = String(noticeForm.value.videoUrl || "").trim()
          if (!url) return
          noticeForm.value.videos = (noticeForm.value.videos || []).concat([{ url, thumb: String(noticeForm.value.videoThumb || "").trim() }])
          noticeForm.value.videoUrl = ""
          noticeForm.value.videoThumb = ""
        }
        const removeNoticeVideo = (i) => {
          const videos = (noticeForm.value.videos || []).slice()
          videos.splice(i, 1)
          noticeForm.value.videos = videos
        }
        const onNoticeEditorInput = (ev) => {
          noticeForm.value.html = ev && ev.target ? ev.target.innerHTML : noticeForm.value.html
        }
        const uploadNoticeCover = async (option) => {
          try {
            const url = await uploadPostFile(option && option.file, false)
            if (!url) return
            noticeForm.value.coverImages = (noticeForm.value.coverImages || []).concat([url])
            noticeForm.value.coverMode = "image"
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const uploadNoticeBodyImage = async (option) => {
          try {
            await uploadPostFile(option && option.file, true)
            const el = document.querySelector(".notice-editor")
            if (el) noticeForm.value.html = el.innerHTML
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const removeNoticeCover = (i) => {
          const list = (noticeForm.value.coverImages || []).slice()
          list.splice(i, 1)
          noticeForm.value.coverImages = list
        }
        const addNoticeTag = (raw) => {
          let s = String(raw || noticeForm.value.tagDraft || "").trim()
          while (s.charAt(0) === "#") s = s.slice(1).trim()
          s = s.replace(/[ #,#，]/g, "")
          if (s.length > 8) s = s.slice(0, 8)
          if (!s) return
          const tags = (noticeForm.value.tags || []).slice()
          if (tags.indexOf(s) >= 0 || tags.length >= 4) return
          tags.push(s)
          noticeForm.value.tags = tags
          noticeForm.value.tagDraft = ""
        }
        const removeNoticeTag = (i) => {
          const tags = (noticeForm.value.tags || []).slice()
          tags.splice(i, 1)
          noticeForm.value.tags = tags
        }
        const saveNotice = async () => {
          const f = noticeForm.value
          if (!String(f.title || "").trim()) {
            ElementPlus.ElMessage.warning("请填写标题")
            return
          }
          const kind = (f.kind === "dynamics" || f.kind === "news") ? f.kind : currentNoticeKind()
          f.kind = kind
          if (s.inProjWorkspace.value) {
            f.projectId = String(s.scopePid.value || f.projectId || "")
            if (!f.projectId) {
              ElementPlus.ElMessage.warning("请先进入研学项目工作区")
              return
            }
          } else if (kind === "dynamics") {
            f.projectId = String(f.projectId || noticeProjectId.value || "")
            if (!f.projectId) {
              ElementPlus.ElMessage.warning("企业动态请选择所属研学项目")
              return
            }
          } else {
            // 企业资讯：不绑项目
            f.projectId = ""
          }
          // 发布单位：有项目=项目组，无项目=总企业（后端 resolvePublisherUnit）
          // 分类仅平台运维可改；动态内容免审立即发布，分类可后补

          const el = document.querySelector(".notice-editor")
          if (el) f.html = el.innerHTML
          let packed = appendBodyExtras(f.html || "<p></p>", f.videos || [], f.links || [], f.tags || [])
          const coverUrl = f.coverMode === "image"
            ? ((f.coverImages && f.coverImages[0]) || "")
            : (f.coverMode === "tpl" ? coverTplUrlOf(f.coverTplId, f.coverHl) : "")
          if (coverUrl) packed += "<p>[[cover:" + encodeMark(coverUrl) + "]]</p>"
          const plain = htmlToPlain(f.html)
          if (!plain && !(f.coverImages || []).length && !(f.videos || []).length) {
            ElementPlus.ElMessage.warning("请填写正文")
            return
          }
          noticeSaving.value = true
          try {
            const url = noticeCreating.value ? "/api/v1/admin/notices" : ("/api/v1/admin/notices/" + encodeURIComponent(noticeSelected.value.id))
            const res = await fetch(url, {
              method: noticeCreating.value ? "POST" : "PUT",
              headers: s.authHeaders(),
              body: JSON.stringify({
                title: f.title,
                content: packed,
                projectId: f.projectId || "",
                enterpriseId: s.scopeEid.value || (s.active.value === "posts-dynamics" ? String(noticeEnterpriseId.value || "") : ""),
                kind,
                category: (s.area.value === "mp" && !s.inEntWorkspace.value) ? String(f.category || "").trim() : undefined,
                keepPublished: !!(s.area.value === "mp" && !s.inEntWorkspace.value && noticeSelected.value && noticeSelected.value.status === "published"),
                paragraphs: plain ? [plain] : [kind === "dynamics" ? "动态" : "资讯"]
              })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const kept = !!(s.area.value === "mp" && !s.inEntWorkspace.value && noticeSelected.value && noticeSelected.value.status === "published")
            if (kind === "dynamics") ElementPlus.ElMessage.success(noticeCreating.value ? "已发布" : "已保存")
            else ElementPlus.ElMessage.success(noticeCreating.value ? "已提交，等待平台审批" : (kept ? "已保存" : "已保存并重新提交审批"))
            noticeOpen.value = false
            await loadNotices()
            const pid = (s.projSelected.value && s.projSelected.value.id) || f.projectId
            if (pid) await loadProjNotices(pid)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            noticeSaving.value = false
          }
        }
        const deleteNotice = async (row) => {
          const item = row || noticeSelected.value
          if (!item) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后票面/资讯列表不再显示这条内容。", "删除资讯", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          try {
            const res = await fetch("/api/v1/admin/notices/" + encodeURIComponent(item.id), { method: "DELETE", headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "删除失败")
            ElementPlus.ElMessage.success("已删除")
            noticeOpen.value = false
            await loadNotices()
            if (s.projSelected.value && s.projSelected.value.id) await loadProjNotices(s.projSelected.value.id)
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "删除失败")
          }
        }
        const loadPosts = async () => {
          postLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (postKeyword.value.trim()) qs.set("keyword", postKeyword.value.trim())
            if (postStatus.value && postStatus.value !== "all") qs.set("status", postStatus.value)
            qs.set("page", String(postPage.value || 1))
            qs.set("pageSize", "20")
            const res = await fetch("/api/v1/admin/community-posts?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            const paged = s.unwrapPaged(json)
            postList.value = paged.items
            postTotal.value = paged.total
          } catch (_err) {
            postList.value = []
            postTotal.value = 0
          } finally {
            postLoading.value = false
          }
        }
        const loadReviewQueue = async () => {
          postLoading.value = true
          try {
            const qs = new URLSearchParams()
            if (postKeyword.value.trim()) qs.set("keyword", postKeyword.value.trim())
            qs.set("status", postStatus.value && postStatus.value !== "all" ? postStatus.value : "pending")
            qs.set("page", String(postPage.value || 1))
            qs.set("pageSize", "20")
            const res = await fetch("/api/v1/admin/content-review?" + qs.toString(), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            const paged = s.unwrapPaged(json)
            postList.value = paged.items
            postTotal.value = paged.total
          } catch (_err) {
            postList.value = []
            postTotal.value = 0
          } finally {
            postLoading.value = false
          }
        }
        const fillPostForm = (row) => {
          const raw = String((row && row.content) || "")
          const tags = parsePostTags(raw)
          const videos = parsePostVideos(raw)
          const links = parsePostLinks(raw)
          if (row && row.videoUrl && !videos.some((v) => v.url === row.videoUrl)) videos.push({ url: row.videoUrl, thumb: "" })
          const cover = String((row && row.coverUrl) || "")
          const images = Array.isArray(row && row.images) ? row.images.filter((u) => isHttpCover(u)) : []
          if (isHttpCover(cover) && images.indexOf(cover) < 0) images.unshift(cover)
          const rowPid = (row && row.projectId) || ""
          const rowEid = (row && row.enterpriseId) || ""
          let scope = "platform"
          if (rowPid) scope = "project"
          else if (rowEid) scope = "enterprise"
          postForm.value = {
            title: (row && row.title) || "",
            html: stripBodyExtras(raw) || "<p></p>",
            channel: (row && row.channel) || "official",
            status: (row && row.status) || "pending",
            category: (row && row.category && row.category !== "待分类") ? row.category : "",
            projectId: rowPid,
            enterpriseId: rowEid,
            publisherScope: scope,
            coverMode: coverModeOf(cover),
            coverTplId: coverTplIdOf(cover),
            coverHl: coverTplHlOf(cover),
            coverImages: images,
            tags: tags.length ? tags : ((row && row.type && row.type !== "文章" && row.type !== "官方资讯") ? [row.type] : []),
            tagDraft: "",
            videos,
            videoUrl: "",
            videoThumb: "",
            links,
            linkDraft: ""
          }
          postComments.value = (row && row.comments) || []
          postEditorKey.value++
        }
        const addPostTag = (raw) => {
          let s = String(raw || postForm.value.tagDraft || "").trim()
          while (s.charAt(0) === "#") s = s.slice(1).trim()
          s = s.replace(/[ #,#，]/g, "")
          if (s.length > 8) s = s.slice(0, 8)
          if (!s) return
          const tags = (postForm.value.tags || []).slice()
          if (tags.indexOf(s) >= 0 || tags.length >= 4) return
          tags.push(s)
          postForm.value.tags = tags
          postForm.value.tagDraft = ""
        }
        const removePostTag = (i) => {
          const tags = (postForm.value.tags || []).slice()
          tags.splice(i, 1)
          postForm.value.tags = tags
        }
        const addPostLink = () => {
          let url = String(postForm.value.linkDraft || "").trim()
          if (!url) return
          if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) url = "https://" + url
          const links = (postForm.value.links || []).slice()
          links.push({ url, title: guessPostLinkTitle(url) })
          postForm.value.links = links
          postForm.value.linkDraft = ""
        }
        const removePostLink = (i) => {
          const links = (postForm.value.links || []).slice()
          links.splice(i, 1)
          postForm.value.links = links
        }
        const addPostVideo = () => {
          const url = String(postForm.value.videoUrl || "").trim()
          if (!url) return
          const videos = (postForm.value.videos || []).slice()
          videos.push({ url, thumb: String(postForm.value.videoThumb || "").trim() })
          postForm.value.videos = videos
          postForm.value.videoUrl = ""
          postForm.value.videoThumb = ""
        }
        const removePostVideo = (i) => {
          const videos = (postForm.value.videos || []).slice()
          videos.splice(i, 1)
          postForm.value.videos = videos
        }
        const postFormat = (cmd, val) => {
          document.execCommand(cmd, false, val == null ? null : val)
          const el = document.activeElement
          if (el && el.classList && el.classList.contains("spot-editor")) s.onSpotSectionInput({ currentTarget: el })
        }
        const onPostEditorInput = (ev) => {
          postForm.value.html = ev && ev.target ? ev.target.innerHTML : postForm.value.html
        }
        const uploadPostFile = async (file, intoEditor) => {
          if (!file) return ""
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/v1/admin/products/images", {
            method: "POST",
            headers: { Authorization: "Bearer " + s.token() },
            body: fd
          })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "上传失败")
          const data = s.unwrap(json)
          const url = (data && (data.url || data.imageUrl)) || ""
          if (intoEditor && url) document.execCommand("insertImage", false, url)
          return url
        }
        const uploadPostCover = async (option) => {
          try {
            const url = await uploadPostFile(option && option.file, false)
            if (!url) return
            const list = (postForm.value.coverImages || []).slice()
            list.push(url)
            postForm.value.coverImages = list
            postForm.value.coverMode = "image"
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const uploadPostBodyImage = async (option) => {
          try {
            await uploadPostFile(option && option.file, true)
            const el = document.querySelector(".post-editor")
            if (el) postForm.value.html = el.innerHTML
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const removePostCover = (i) => {
          const list = (postForm.value.coverImages || []).slice()
          list.splice(i, 1)
          postForm.value.coverImages = list
        }
        const savePost = async () => {
          const f = postForm.value
          if (!String(f.title || "").trim()) {
            ElementPlus.ElMessage.warning("请填写标题")
            return
          }
          if (f.publisherScope === "enterprise" && !String(f.enterpriseId || "").trim()) {
            ElementPlus.ElMessage.warning("请选择发布企业（发布单位将锁定为企业）")
            return
          }
          if (f.publisherScope === "project" && !String(f.projectId || "").trim()) {
            ElementPlus.ElMessage.warning("请选择研学项目（发布单位将锁定为项目）")
            return
          }
          const el = document.querySelector(".post-editor")
          if (el) f.html = el.innerHTML
          const packed = appendBodyExtras(f.html || "<p></p>", f.videos || [], f.links || [], f.tags || [])
          const coverUrl = f.coverMode === "image"
            ? ((f.coverImages && f.coverImages[0]) || "")
            : (f.coverMode === "tpl" ? coverTplUrlOf(f.coverTplId, f.coverHl) : "")
          postSaving.value = true
          try {
            let st = String(f.status || "pending")
            if (st !== "draft" && st !== "private") st = "pending"
            f.status = st
            const url = postCreating.value ? "/api/v1/admin/community-posts" : ("/api/v1/admin/community-posts/" + encodeURIComponent(postSelected.value.id))
            const res = await fetch(url, {
              method: postCreating.value ? "POST" : "PUT",
              headers: s.authHeaders(),
              body: JSON.stringify({
                title: f.title,
                content: packed,
                channel: f.channel,
                status: st,
                projectId: (f.publisherScope === "project" ? (f.projectId || "") : ""),
                enterpriseId: (f.publisherScope === "enterprise" ? (f.enterpriseId || "") : ""),
                coverUrl,
                images: f.coverMode === "image" ? (f.coverImages || []) : [],
                videoUrl: (f.videos && f.videos[0] && f.videos[0].url) || "",
                type: (f.tags && f.tags[0]) || (f.channel === "official" ? "官方资讯" : "文章")
              })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            ElementPlus.ElMessage.success(st === "draft" ? "草稿已保存" : (postCreating.value ? "已提交审核" : "已保存并提交审核"))
            postOpen.value = false
            await loadPosts()
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            postSaving.value = false
          }
        }
        const deletePost = async () => {
          const item = postSelected.value
          if (!item) return
          const ok = await ElementPlus.ElMessageBox.confirm("删除后资讯页不再显示这篇文章。", "删除文章", { confirmButtonText: "删除", cancelButtonText: "取消", type: "warning" }).catch(() => null)
          if (!ok) return
          const res = await fetch("/api/v1/admin/community-posts/" + encodeURIComponent(item.id), { method: "DELETE", headers: s.authHeaders() })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "删除失败")
          ElementPlus.ElMessage.success("已删除")
          postOpen.value = false
          await loadPosts()
        }
  Object.assign(s, {
    postSel,
    noticeSel,
    postBatch,
    postLabel,
    noticeFilterProjects,
    loadProjectsForNoticeFilter,
    onNoticeEnterpriseChange,
    noticeProjectOptions,
    POST_DRAWER_W_KEY,
    POST_FORM_W_KEY,
    CHIP_DRAWER_W_KEY,
    CHIP_FORM_W_KEY,
    contentReviewForm,
    contentReviewSaving,
    submitContentReview,
    batchPosts,
    emptyNotice,
    emptyPost,
    COVER_TPLS,
    SUGGEST_TAGS,
    encodeMark,
    decodeMark,
    parseMarks,
    stripBodyExtras,
    appendBodyExtras,
    parsePostTags,
    parsePostVideos,
    parsePostLinks,
    guessPostLinkTitle,
    isHttpCover,
    coverModeOf,
    coverTplUrlOf,
    coverTplIdOf,
    coverTplHlOf,
    postChannelLabel,
    postTagColor,
    postEditorKey,
    postComments,
    postCoverParts,
    isCoverStack,
    isCoverQuote,
    postDrawerPx,
    postFormPx,
    startPostDrawerResize,
    startPostSplitResize,
    chipDrawerPx,
    chipFormPx,
    startChipDrawerResize,
    startChipSplitResize,
    postPreviewHtml,
    postPreviewProject,
    postPublisherLabel,
    onPostPublisherScopeChange,
    pubUnitKind,
    pubUnitKeyword,
    pubUnitList,
    pubUnitTotal,
    pubUnitLoading,
    pubUnitSaving,
    loadPublisherUnits,
    savePublisherUnitRow,
    clearPublisherUnitOverride,
    uploadPublisherAvatar,
    clearPublisherAvatar,
    contentTab,
    noticeKeyword,
    noticeEnterpriseId,
    noticeProjectId,
    noticePage,
    noticeTotal,
    noticeList,
    noticeLoading,
    noticeOpen,
    noticeCreating,
    noticeSelected,
    noticeForm,
    noticeSaving,
    postKeyword,
    postStatus,
    postPage,
    postTotal,
    postList,
    postLoading,
    postOpen,
    postCreating,
    postSelected,
    postForm,
    postSaving,
    NOTICE_TYPES,
    noticeEditorKey,
    htmlToPlain,
    fillNoticeForm,
    noticeCoverParts,
    noticePreviewHtml,
    noticeProjectTitle,
    noticePublisherLabel,
    postStatusLabel,
    noticeStatusLabel,
    isStudyNoticeRow,
    currentNoticeKind,
    contentSourceLabel,
    reviewKeyOf,
    loadNotices,
    loadProjNotices,
    addNoticeLink,
    removeNoticeLink,
    addNoticeVideo,
    removeNoticeVideo,
    onNoticeEditorInput,
    uploadNoticeCover,
    uploadNoticeBodyImage,
    removeNoticeCover,
    addNoticeTag,
    removeNoticeTag,
    saveNotice,
    deleteNotice,
    loadPosts,
    loadReviewQueue,
    fillPostForm,
    addPostTag,
    removePostTag,
    addPostLink,
    removePostLink,
    addPostVideo,
    removePostVideo,
    postFormat,
    onPostEditorInput,
    uploadPostFile,
    uploadPostCover,
    uploadPostBodyImage,
    removePostCover,
    savePost,
    deletePost
  })
}
