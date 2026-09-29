<template>
                  <div class="route-studio" :style="{ '--route-rail-w': routeRailWidth + 'px' }">
                    <div v-if="projCreating || !projSelected" class="route-empty"><b>先保存项目</b><span>保存后再编辑研学路径点位</span></div>
                    <template v-else>
                      <aside class="route-rail">
                        <div class="route-rail-hd">
                          <div class="route-rail-kicker">ITINERARY</div>
                          <div class="route-rail-title">点位目录</div>
                          <div class="route-rail-sub">目录展示，不决定学员到访顺序</div>
                        </div>
                        <div class="route-rail-scroll">
                          <div class="spot-nav" v-for="(s, si) in projRoutePoints" :key="s.id" :class="{ on: projSpotForm && projSpotForm.id === s.id }" @click="selectProjSpot(s)">
                            <div class="spot-nav-no">{{ padStopNo(si) }}</div>
                            <div class="spot-nav-copy">
                              <div class="spot-nav-name">{{ s.title }}</div>
                              <div class="spot-nav-meta">{{ s.zoneLabel }} · {{ s.durationText }}</div>
                            </div>
                          </div>
                          <div v-if="!projRoutePoints.length" class="route-rail-empty">还没有点位，点下方新增</div>
                        </div>
                        <div class="route-rail-foot">
                          <div class="zone-mini">
                            <span class="zone-pill" v-for="(z, i) in (entDicts.routeZones || [])" :key="'ez'+i">{{ z.label }}</span>
                            <span class="link-btn" @click="spotZoneOpen = !spotZoneOpen">{{ spotZoneOpen ? '收起分区' : '管理分区' }}</span>
                          </div>
                          <div v-if="spotZoneOpen" style="margin-bottom:10px">
                            <div>
                              <span class="tax-chip" v-for="(z, i) in (entDicts.routeZones || [])" :key="'ezm'+i">
                                {{ z.label }}
                                <button type="button" @click="removeEntZone(i)">×</button>
                              </span>
                            </div>
                            <div class="tax-add" style="margin-top:8px">
                              <el-input v-model="entDictDraft.zoneLabel" placeholder="分区名称，回车添加" @keyup.enter="addEntZone" />
                              <el-button size="small" @click="addEntZone">添加</el-button>
                            </div>
                          </div>
                          <el-button type="primary" style="width:100%" @click="startNewProjSpot">新增点位</el-button>
                        </div>
                      </aside>
                      <div class="route-split" :class="{ on: routeSplitHover }" title="拖动调整目录宽度" @mousedown="startRouteRailResize"></div>
                      <section class="route-main" v-if="projSpotForm">
                        <div class="route-tabs">
                          <button class="route-tab" type="button" :class="{ on: spotFormTab==='info' }" @click="setSpotFormTab('info')">资料</button>
                          <button class="route-tab" type="button" :class="{ on: spotFormTab==='story' }" @click="setSpotFormTab('story')">详情</button>
                          <button class="route-tab" type="button" :class="{ on: spotFormTab==='map' }" @click="setSpotFormTab('map')">地图</button>
                          <button class="route-tab" type="button" :class="{ on: spotFormTab==='gate' }" @click="setSpotFormTab('gate')">研学</button>
                        </div>
                        <div class="route-main-scroll">
                          <div class="route-pane" v-if="spotFormTab==='info'" :style="{ '--route-preview-w': routePreviewWidth + 'px' }">
                            <div class="edit-grid">
                              <div class="full"><label>名称</label><el-input v-model="projSpotForm.title" maxlength="40" /></div>
                              <div class="full"><label>列表简介</label><el-input v-model="projSpotForm.description" maxlength="80" placeholder="票面路径列表上的一句话" /></div>
                              <div>
                                <label>分区</label>
                                <el-select v-model="projSpotForm.zoneKey" style="width:100%">
                                  <el-option v-for="z in projZones" :key="'rz-'+z.key" :label="z.label" :value="z.key" />
                                </el-select>
                              </div>
                              <div><label>停留（分钟）</label><el-input-number v-model="projSpotForm.durationMin" :min="5" :max="240" /></div>
                              <div class="full">
                                <label>封面</label>
                                <div class="gallery-row">
                                  <div class="gallery-item" v-if="projSpotForm.coverUrl">
                                    <img :src="projSpotForm.coverUrl" alt="" />
                                    <button class="gallery-del" type="button" @click="projSpotForm.coverUrl=''">×</button>
                                  </div>
                                  <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="uploadSpotCover">
                                    <div class="gallery-add">+</div>
                                  </el-upload>
                                </div>
                              </div>
                            </div>
                            <div class="mqlt-vsplit" :class="{ on: mqltSplitHover==='route-preview' }" title="拖动调整预览宽度" @mousedown="startRoutePreviewResize"></div>
                            <div class="route-edit-preview">
                              <div class="pv-label">小程序预览</div>
                              <div class="spot-sheet">
                                <div class="spot-sheet-handle"></div>
                                <div class="spot-sheet-hd">
                                  <div>
                                    <div class="spot-sheet-tt">{{ projSpotForm.title || "点位名称" }}</div>
                                    <div class="spot-sheet-sub">{{ spotPreviewZone }} · 预计 {{ spotPreviewDur }}</div>
                                  </div>
                                  <span class="spot-sheet-close">关闭</span>
                                </div>
                                <div class="spot-sheet-body">
                                  <div class="spot-sheet-cover" v-if="projSpotForm.coverUrl"><img :src="projSpotForm.coverUrl" alt="" /></div>
                                  <div class="spot-sheet-cover" v-else>{{ projSpotForm.title || "封面" }}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="route-pane" v-else-if="spotFormTab==='story'" :style="{ '--route-preview-w': routePreviewWidth + 'px' }">
                            <div>
                              <label>详情段落（标题可改）</label>
                              <div class="story-fmt">
                                <button type="button" @mousedown.prevent="postFormat('bold')">加粗</button>
                                <button type="button" @mousedown.prevent="postFormat('italic')">斜体</button>
                                <button type="button" @mousedown.prevent="postFormat('underline')">下划线</button>
                                <select @change="postFormat('fontSize', $event.target.value)">
                                  <option value="3">正文</option>
                                  <option value="5">大号</option>
                                  <option value="6">更大</option>
                                  <option value="2">小号</option>
                                </select>
                                <button type="button" @mousedown.prevent="postFormat('foreColor', '#1A1A1A')">墨色</button>
                                <button type="button" @mousedown.prevent="postFormat('foreColor', '#C45C26')">赭色</button>
                                <button type="button" @mousedown.prevent="postFormat('foreColor', '#1A73E8')">金色</button>
                                <button type="button" @mousedown.prevent="postFormat('justifyLeft')">左对齐</button>
                                <button type="button" @mousedown.prevent="postFormat('justifyCenter')">居中</button>
                                <button type="button" @mousedown.prevent="postFormat('insertUnorderedList')">列表</button>
                                <el-upload :show-file-list="false" :http-request="uploadSpotBodyImage">
                                  <button type="button" @mousedown.prevent>插图</button>
                                </el-upload>
                              </div>
                              <div class="spot-sec" v-for="(sec, si) in projSpotForm.sections" :key="'sec-'+spotEditorKey+'-'+sec.key+'-'+si">
                                <div class="spot-sec-hd">
                                  <el-input v-model="sec.title" maxlength="20" placeholder="段落标题，如区域介绍" />
                                  <span class="link-btn" @click="moveSpotSection(si, -1)">上移</span>
                                  <span class="link-btn" @click="moveSpotSection(si, 1)">下移</span>
                                  <span class="link-btn" @click="removeSpotSection(si)">删除</span>
                                </div>
                                <div class="post-editor spot-editor" contenteditable="true" :data-sec-index="si" @focus="onSpotEditorFocus(si)" @input="onSpotSectionInput" @blur="onSpotSectionInput"></div>
                              </div>
                              <el-button style="margin-top:8px" @click="addSpotSection">增加段落</el-button>
                            </div>
                            <div class="mqlt-vsplit" :class="{ on: mqltSplitHover==='route-preview' }" title="拖动调整预览宽度" @mousedown="startRoutePreviewResize"></div>
                            <div class="route-edit-preview">
                              <div class="pv-label">详情预览</div>
                              <div class="spot-sheet">
                                <div class="spot-sheet-handle"></div>
                                <div class="spot-sheet-hd">
                                  <div>
                                    <div class="spot-sheet-tt">{{ projSpotForm.title || "点位名称" }}</div>
                                    <div class="spot-sheet-sub">{{ spotPreviewZone }} · 预计 {{ spotPreviewDur }}</div>
                                  </div>
                                </div>
                                <div class="spot-sheet-body">
                                  <div class="spot-sheet-sec" v-for="sec in spotPreviewSections" :key="'pv-'+spotPreviewTick+'-'+sec.key">
                                    <b>{{ sec.title || "段落" }}</b>
                                    <div class="pd-rich" v-if="spotHtmlHasBody(sec.html)" v-html="sec.html"></div>
                                    <div class="spot-sheet-empty" v-else>未填写</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div class="route-pane solo" v-else-if="spotFormTab==='map'">
                            <div>
                              <label>地图选点</label>
                              <el-input v-model="projSpotMapQuery" placeholder="搜地点，或直接在地图点选 / 拖动标记" @keyup.enter="searchProjSpotMap">
                                <template #append><el-button @click="searchProjSpotMap">搜索</el-button></template>
                              </el-input>
                              <div id="proj-spot-map" class="proj-map proj-spot-map"></div>
                              <div class="proj-map-meta">点选或拖动标记{{ projSpotForm.latitude != null ? (' · ' + projSpotForm.latitude + ', ' + projSpotForm.longitude) : '' }}</div>
                            </div>
                          </div>
                          <div class="gate-layout" v-else-if="spotFormTab==='gate'" :style="{ '--gate-right-w': gateRightWidth + 'px' }">
                            <div class="gate-main">
                              <p class="gate-help">学员按顺序完成或跳过每一关；视频/答题/小游戏完成后自动计分。仅「现场任务」需要扫本站研学码（点位码）确认。全部关卡完成后自动结算本站积分、拼图与卡券，不再要求最后扫整站码。跳过没有积分。积分决定本站奖品卡券的档次，卡券可免费兑换绑定的文创商品。</p>
                              <div class="step-add">
                                <el-button size="small" @click="addStationStep('video')">+ 视频</el-button>
                                <el-button size="small" @click="addStationStep('quiz')">+ 答题</el-button>
                                <el-button size="small" @click="addStationStep('task')">+ 现场任务</el-button>
                                <el-button size="small" @click="addStationStep('game')">+ H5 小游戏</el-button>
                              </div>
                              <div v-if="!(projSpotForm.stationSteps && projSpotForm.stationSteps.length)" class="route-foot-hint" style="margin-bottom:12px">还没有内容。添加后学员会按顺序完成；若含现场任务，完成该项时扫本站研学码确认。全部完成后自动结算通关。</div>
                              <div class="step-card" v-for="(st, si) in (projSpotForm.stationSteps || [])" :key="st.id || si">
                                <div class="step-card-hd">
                                  <span class="step-type">{{ { video: "视频", quiz: "答题", task: "任务", game: "游戏" }[st.type] || st.type }}</span>
                                  <el-input v-model="st.title" maxlength="40" placeholder="这一项的标题" />
                                  <div class="step-ops">
                                    <span class="link-btn" @click="moveStationStep(si, -1)">上移</span>
                                    <span class="link-btn" @click="moveStationStep(si, 1)">下移</span>
                                    <span class="link-btn" @click="removeStationStep(si)">删除</span>
                                  </div>
                                </div>
                                <div>
                                  <el-select :model-value="st.resourceId || ''" clearable placeholder="从本项目研学资源中选用" style="width:100%" @change="(v)=>applyStepResource(si, v)">
                                    <el-option v-for="r in projectResourcesOf(st.type)" :key="r.id" :label="r.title || '未命名'" :value="r.id" />
                                  </el-select>
                                  <div class="route-foot-hint" style="margin-top:8px" v-if="!projectResourcesOf(st.type).length">还没有该类资源，请先到项目「研学资源」里添加。</div>
                                  <video v-if="st.type==='video' && st.videoUrl" class="spot-video" :src="st.videoUrl" controls style="margin-top:8px"></video>
                                  <div v-if="st.type==='quiz' && (st.questions||[]).length" class="route-foot-hint" style="margin-top:8px">共 {{ st.questions.length }} 题，内容以资源库为准。</div>
                                  <el-input v-if="st.type==='task' && st.taskBody" :model-value="st.taskBody" type="textarea" :rows="3" disabled style="margin-top:8px" />
                                  <div v-if="st.type==='game'" style="margin-top:8px">
                                    <el-input v-model="st.passScore" type="number" placeholder="及格分，可空" style="width:140px" />
                                    <el-input v-model="st.maxRetries" type="number" placeholder="次数上限，空=不限" style="width:160px;margin-left:8px" />
                                    <span class="link-btn" v-if="st.gameUrl" @click="openResourceUrl({ gameUrl: st.gameUrl })">打开游戏</span>
                                    <div class="route-foot-hint" style="margin-top:6px" v-if="(st.scoreTiers||[]).length">积分档：{{ (st.scoreTiers||[]).map(t => (t.minScore + '分→' + t.points + '积分')).join('，') }}</div>
                                  </div>
                                  <div class="step-reward-row">
                                    <el-checkbox v-model="st.skippable">允许跳过</el-checkbox>
                                    <span class="hint">完成得</span>
                                    <el-input-number v-model="st.points" :min="0" :max="999" :step="5" size="small" />
                                    <span class="hint">积分</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div class="gate-split" :class="{ on: gateSplitHover }" title="拖动调整右侧宽度" @mousedown="startGateRightResize"></div>
                            <div class="gate-side">
                            <div class="reward-panel">
                              <div class="reward-hd">
                                <div>
                                  <b>本站奖品卡券</b>
                                  <span>按本站积分发到学员「我的卡券」，可免费兑换绑定的文创。</span>
                                </div>
                                <el-switch :model-value="!!(projSpotForm.stationReward && projSpotForm.stationReward.enabled)" @update:model-value="(v)=>{ ensureStationReward(); projSpotForm.stationReward.enabled=!!v }" active-text="开启" inactive-text="关闭" />
                              </div>
                              <div v-if="projSpotForm.stationReward && projSpotForm.stationReward.enabled" class="reward-body">
                                <div class="reward-grid">
                                  <div>
                                    <label>每人最多几张</label>
                                    <el-input-number v-model="projSpotForm.stationReward.maxCoupons" :min="1" :max="5" />
                                  </div>
                                  <div>
                                    <label>发放后有效天数</label>
                                    <el-input-number v-model="projSpotForm.stationReward.expireDays" :min="0" :max="3650" />
                                  </div>
                                </div>
                                <p class="hint">积分档从低到高匹配，学员拿到达到的最高档。此处「发放后有效天数」只影响<strong>新发放</strong>的奖品卡券；已发出的卡券请到用户详情「卡券」或 Live「积分卡券证」里改期/延长。0 天表示长期有效。</p>
                                <div class="tier-card" v-for="(tier, ti) in (projSpotForm.stationReward.tiers || [])" :key="'tier'+ti">
                                  <div class="tier-top">
                                    <el-input v-model="tier.title" maxlength="16" placeholder="档位名称，如纪念 / 精选 / 臻选" />
                                    <span class="link-btn" @click="removeRewardTier(ti)">删除</span>
                                  </div>
                                  <div class="reward-grid">
                                    <div>
                                      <label>至少积分</label>
                                      <el-input-number v-model="tier.minPoints" :min="0" :max="9999" :step="5" />
                                    </div>
                                    <div>
                                      <label>兑换文创</label>
                                      <el-select v-model="tier.productId" filterable clearable placeholder="绑定本项目商品" style="width:100%">
                                        <el-option v-for="p in (projAllProducts || [])" :key="p.id" :label="p.name" :value="p.id" />
                                      </el-select>
                                    </div>
                                  </div>
                                </div>
                                <el-button @click="addRewardTier">增加积分档</el-button>
                                <p class="hint" v-if="!(projAllProducts || []).length">还没有可绑定的文创。请先在项目店铺里绑定商品。</p>
                              </div>
                            </div>
                            <div class="gate-qr-card">
                              <b>本站研学码</b><span class="hint" style="display:block;margin-top:4px;font-weight:400">供现场任务扫码确认（非整站通关闸门）</span>
                              <template v-if="projSpotForm.id">
                                <div id="spot-gate-qr-box" class="gate-qr-box"></div>
                                <div class="gate-qr-serial" v-if="spotGateQrSerial">校验号 {{ spotGateQrSerial }}</div>
                                <p v-if="spotGateQrHint">{{ spotGateQrHint }}</p>
                                <p v-else>打印后交给现场员工出示，供学员完成「现场任务」时扫码确认。点刷新会换新码，旧码立刻失效。整站通关已改为关卡完成后自动结算。</p>
                                <el-button :loading="spotGateQrLoading" @click="refreshSpotGateQr">刷新换新码</el-button>
                                <el-button type="primary" @click="openSpotGateQr">打开大图</el-button>
                              </template>
                              <p v-else>先保存点位，再生成研学码。</p>
                            </div>
                            </div>
                          </div>
                        </div>
                        <div class="route-foot">
                          <div class="route-foot-hint">{{ projSpotForm.id ? '修改后点保存才会生效' : '新点位保存后会出现在左侧目录' }}</div>
                          <div style="display:flex;gap:8px">
                            <el-button v-if="projSpotForm.id" @click="deleteProjSpot()">删除</el-button>
                            <el-button type="primary" :loading="projRouteSaving" @click="saveProjSpot">保存点位</el-button>
                          </div>
                        </div>
                      </section>
                      <section class="route-main" v-else>
                        <div class="route-empty">
                          <b>选择或新增一个点位</b>
                          <span>左侧目录点选已有站点，或直接新增</span>
                          <el-button type="primary" @click="startNewProjSpot">新增点位</el-button>
                        </div>
                      </section>
                    </template>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  active,
  addEntZone,
  addRewardTier,
  addSpotSection,
  addStationStep,
  applyStepResource,
  deleteProjSpot,
  ensureStationReward,
  entDictDraft,
  entDicts,
  gateRightWidth,
  gateSplitHover,
  moveSpotSection,
  moveStationStep,
  mqltSplitHover,
  onSpotEditorFocus,
  onSpotSectionInput,
  openResourceUrl,
  openSpotGateQr,
  padStopNo,
  postFormat,
  projAllProducts,
  projCreating,
  projRoutePoints,
  projRouteSaving,
  projSelected,
  projSpotForm,
  projSpotMapQuery,
  projZones,
  projectResourcesOf,
  refreshSpotGateQr,
  removeEntZone,
  removeRewardTier,
  removeSpotSection,
  removeStationStep,
  routePreviewWidth,
  routeRailWidth,
  routeSplitHover,
  saveProjSpot,
  searchProjSpotMap,
  selectProjSpot,
  setSpotFormTab,
  spotEditorKey,
  spotFormTab,
  spotGateQrHint,
  spotGateQrLoading,
  spotGateQrSerial,
  spotHtmlHasBody,
  spotPreviewDur,
  spotPreviewSections,
  spotPreviewTick,
  spotPreviewZone,
  spotZoneOpen,
  startGateRightResize,
  startNewProjSpot,
  startRoutePreviewResize,
  startRouteRailResize,
  uploadSpotBodyImage,
  uploadSpotCover
} = inject("console")
</script>
