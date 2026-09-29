import { ref } from "vue"

export function useSettings(s) {
        const LEGAL_RIGHT_W_KEY = "mqlt-legal-right-width"
        const legalRightWidth = ref(s.readStoredPx(LEGAL_RIGHT_W_KEY, 420, 280, 560))
        const H5_GAME_GUIDE = [
          "蒙企链探 · 研学 H5 小游戏接入规则",
          "",
          "1. 页面引入 SDK：",
          "https://res.wx.qq.com/open/js/jweixin-1.6.0.js",
          "http://127.0.0.1:3000/api/v1/study/h5/sdk.js",
          "模板：http://127.0.0.1:3000/api/v1/study/h5/template.html",
          "",
          "2. 游戏结束时调用（分数、是否合格、自定义数据）：",
          "MQLT.complete({ score: 86, passed: true, durationMs: 120000, payload: { stars: 2 } })",
          "MQLT.fail({ score: 40, payload: { reason: \"timeout\" } })",
          "MQLT.progress({ score: 10, payload: { level: 1 } })",
          "",
          "3. 也可以直连后端（小程序打开游戏时 URL 会带 playToken）：",
          "POST http://127.0.0.1:3000/api/v1/study/h5/game-result",
          "Content-Type: application/json",
          "{ \"token\": \"<playToken>\", \"event\": \"complete\", \"score\": 86, \"passed\": true, \"durationMs\": 120000, \"payload\": { \"stars\": 2 } }",
          "",
          "event: complete 通关 / fail 不合格 / progress 过程分",
          "控制台可设及格分。低于及格分或 passed:false 时，该步骤不算完成，不能进入后续关卡/自动结算。不合格可无限重试。"
        ].join("\n")
        const emptyEntDicts = () => ({ noticeTypes: ["测试分类"], mallCategories: ["文具礼品", "生活用品"], routeZones: [{ key: "test", label: "测试分类" }] })
        const loadEntDicts = async () => {
          const id = s.scopeEid.value
          if (!id) return
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id), { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) return
            const d = s.unwrap(json) || {}
            s.entDicts.value = Object.assign({}, emptyEntDicts(), d.dicts || {})
          } catch (_err) {}
        }
        const persistEntDicts = async () => {
          const id = s.scopeEid.value
          if (!id) return
          try {
            const res = await fetch("/api/v1/admin/enterprises/" + encodeURIComponent(id), {
              method: "PUT", headers: s.authHeaders(), body: JSON.stringify({ dicts: s.entDicts.value })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            if (json && s.unwrap(json) && s.unwrap(json).dicts) s.entDicts.value = Object.assign({}, emptyEntDicts(), s.unwrap(json).dicts)
            ElementPlus.ElMessage.success("分类已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          }
        }
        const addEntDictItem = (key) => {
          const raw = String(s.entDictDraft.value[key] || "").trim()
          if (!raw) return
          const list = (s.entDicts.value[key] || []).slice()
          if (list.indexOf(raw) >= 0) return
          list.push(raw)
          s.entDicts.value = Object.assign({}, s.entDicts.value, { [key]: list })
          s.entDictDraft.value[key] = ""
          persistEntDicts()
        }
        const removeEntDictItem = (key, i) => {
          const list = (s.entDicts.value[key] || []).slice()
          list.splice(i, 1)
          s.entDicts.value = Object.assign({}, s.entDicts.value, { [key]: list })
          persistEntDicts()
        }
        const addEntZone = () => {
          const l = String(s.entDictDraft.value.zoneLabel || "").trim()
          if (!l) return
          const list = (s.entDicts.value.routeZones || []).slice()
          if (list.some((x) => x.label === l || x.key === l)) return
          list.push({ key: l, label: l })
          s.entDicts.value = Object.assign({}, s.entDicts.value, { routeZones: list })
          s.entDictDraft.value.zoneKey = ""
          s.entDictDraft.value.zoneLabel = ""
          persistEntDicts()
        }
        const removeEntZone = (i) => {
          const list = (s.entDicts.value.routeZones || []).slice()
          list.splice(i, 1)
          s.entDicts.value = Object.assign({}, s.entDicts.value, { routeZones: list })
          persistEntDicts()
        }
        const settingsTab = ref("contact")
        const settingsLoading = ref(false)
        const settingsSaving = ref(false)
        const settingsContact = ref({ name: "蒙企链探", phone: "19931708002", hours: "工作日 09:00–18:00", email: "203790885@qq.com" })
        const splashEditorKey = ref(1)
        const splashForm = ref({ enabled: false, closable: true, title: "", html: "<p></p>", images: [], videos: [], attachments: [], version: 0 })
        const settingsFeatures = ref({ rental: true, aiPlan: true, driverCommission: 0 })
        const settingsLegal = ref({ agreement: { title: "用户协议", updatedAt: "", intro: "", sections: [] }, privacy: { title: "隐私政策", updatedAt: "", intro: "", sections: [] } })
        const settingsDicts = ref({ noticeTypes: ["测试分类"], articleTags: ["感受", "宣传", "研学", "亲子", "攻略", "路线"], mallCategories: ["文具礼品", "生活用品"], contentChannels: [{ key: "all", label: "全部" }, { key: "test", label: "测试分类" }], routeZones: [{ key: "test", label: "测试分类" }], studyCategories: ["企业研学"], studyTags: ["研学", "亲子"] })
        const dictDraft = ref({ noticeTypes: "", articleTags: "", mallCategories: "", channelKey: "", channelLabel: "", zoneKey: "", zoneLabel: "", studyCategories: "", studyTags: "" })
        const loadSettings = async () => {
          settingsLoading.value = true
          try {
            const res = await fetch("/api/v1/admin/settings", { headers: s.authHeaders() })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "加载失败")
            const data = s.unwrap(json) || {}
            if (data.contact) settingsContact.value = Object.assign({}, settingsContact.value, data.contact)
            if (data.features) settingsFeatures.value = Object.assign({}, settingsFeatures.value, data.features)
            if (data.legal) {
              settingsLegal.value = {
                agreement: Object.assign({ title: "用户协议", updatedAt: "", intro: "", sections: [] }, data.legal.agreement || {}),
                privacy: Object.assign({ title: "隐私政策", updatedAt: "", intro: "", sections: [] }, data.legal.privacy || {})
              }
            }
            if (data.dicts) {
              settingsDicts.value = Object.assign({}, settingsDicts.value, data.dicts)
              s.platformDicts.value = data.dicts
            }
            if (data.splash) {
              splashForm.value = Object.assign({ enabled: false, closable: true, title: "", html: "<p></p>", images: [], videos: [], attachments: [], version: 0 }, data.splash)
              splashEditorKey.value = splashEditorKey.value + 1
            }
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "设置加载失败")
          } finally {
            settingsLoading.value = false
          }
        }
        const splashFormat = (cmd) => { document.execCommand(cmd, false, null) }
        const onSplashEditorInput = (e) => {
          const el = e && e.target
          if (el) splashForm.value.html = el.innerHTML
        }
        const uploadSplashBodyImage = async (option) => {
          try {
            const url = await uploadSplashRaw(option && option.file)
            if (url) document.execCommand("insertImage", false, url)
            const el = document.querySelector(".splash-editor")
            if (el) splashForm.value.html = el.innerHTML
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const uploadSplashRaw = async (file) => {
          if (!file) return ""
          const fd = new FormData()
          fd.append("file", file)
          const res = await fetch("/api/v1/admin/splash-file", { method: "POST", headers: { Authorization: "Bearer " + s.token() }, body: fd })
          const json = await res.json()
          if (!res.ok) throw new Error(json.message || "上传失败")
          const data = s.unwrap(json) || {}
          return data.url || data.imageUrl || ""
        }
        const uploadSplashAsset = async (option, kind) => {
          try {
            const file = option && option.file
            const url = await uploadSplashRaw(file)
            if (!url) return
            const row = { url, name: (file && file.name) || "文件", size: (file && file.size) || 0, mime: (file && file.type) || "" }
            const list = (splashForm.value[kind] || []).slice()
            list.push(row)
            splashForm.value[kind] = list
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "上传失败")
          }
        }
        const removeSplashAsset = (kind, i) => {
          const list = (splashForm.value[kind] || []).slice()
          list.splice(i, 1)
          splashForm.value[kind] = list
        }
        const saveSplashAnnounce = () => saveSettingsPart("splash")
        const saveSettingsPart = async (part) => {
          settingsSaving.value = true
          try {
            const body = {}
            if (part === "contact") body.contact = settingsContact.value, body.features = settingsFeatures.value
            if (part === "legal") body.legal = settingsLegal.value
            if (part === "dicts") body.dicts = settingsDicts.value
            if (part === "splash") {
              const el = document.querySelector(".splash-editor")
              if (el) splashForm.value.html = el.innerHTML
              body.splash = splashForm.value
            }
            const res = await fetch("/api/v1/admin/settings", { method: "PUT", headers: s.authHeaders(), body: JSON.stringify(body) })
            const json = await res.json()
            if (!res.ok) throw new Error(json.message || "保存失败")
            const data = s.unwrap(json) || {}
            if (data.dicts) s.platformDicts.value = data.dicts
            ElementPlus.ElMessage.success("已保存")
          } catch (err) {
            ElementPlus.ElMessage.error(err.message || "保存失败")
          } finally {
            settingsSaving.value = false
          }
        }
        const addDictItem = (key) => {
          const raw = String(dictDraft.value[key] || "").trim()
          if (!raw) return
          const list = (settingsDicts.value[key] || []).slice()
          if (list.indexOf(raw) >= 0) return
          list.push(raw)
          settingsDicts.value = Object.assign({}, settingsDicts.value, { [key]: list })
          dictDraft.value[key] = ""
        }
        const removeDictItem = (key, i) => {
          const list = (settingsDicts.value[key] || []).slice()
          list.splice(i, 1)
          settingsDicts.value = Object.assign({}, settingsDicts.value, { [key]: list })
        }
        const addDictPair = (key, kField, lField) => {
          const l = String(dictDraft.value[lField] || "").trim()
          if (!l) return
          const k = l === "全部" ? "all" : l
          const list = (settingsDicts.value[key] || []).slice()
          if (list.some((x) => x.label === l || x.key === k)) return
          list.push({ key: k, label: l })
          settingsDicts.value = Object.assign({}, settingsDicts.value, { [key]: list })
          dictDraft.value[kField] = ""
          dictDraft.value[lField] = ""
        }
        const removeDictPair = (key, i) => {
          const list = (settingsDicts.value[key] || []).slice()
          list.splice(i, 1)
          settingsDicts.value = Object.assign({}, settingsDicts.value, { [key]: list })
        }
        const addLegalSection = (kind) => {
          const doc = Object.assign({}, settingsLegal.value[kind])
          doc.sections = (doc.sections || []).concat([{ heading: "", body: "" }])
          settingsLegal.value = Object.assign({}, settingsLegal.value, { [kind]: doc })
        }
        const removeLegalSection = (kind, i) => {
          const doc = Object.assign({}, settingsLegal.value[kind])
          const sections = (doc.sections || []).slice()
          sections.splice(i, 1)
          doc.sections = sections
          settingsLegal.value = Object.assign({}, settingsLegal.value, { [kind]: doc })
        }
  Object.assign(s, {
    LEGAL_RIGHT_W_KEY,
    legalRightWidth,
    H5_GAME_GUIDE,
    emptyEntDicts,
    loadEntDicts,
    persistEntDicts,
    addEntDictItem,
    removeEntDictItem,
    addEntZone,
    removeEntZone,
    settingsTab,
    settingsLoading,
    settingsSaving,
    settingsContact,
    splashEditorKey,
    splashForm,
    settingsFeatures,
    settingsLegal,
    settingsDicts,
    dictDraft,
    loadSettings,
    splashFormat,
    onSplashEditorInput,
    uploadSplashBodyImage,
    uploadSplashRaw,
    uploadSplashAsset,
    removeSplashAsset,
    saveSplashAnnounce,
    saveSettingsPart,
    addDictItem,
    removeDictItem,
    addDictPair,
    removeDictPair,
    addLegalSection,
    removeLegalSection
  })
}
