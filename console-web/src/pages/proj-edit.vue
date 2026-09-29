<template>
              <div class="studio-page">
                <div class="studio-head">
                  <div class="who">
                    <div class="thumb"><img v-if="projCover(projForm)" :src="projCover(projForm)" alt="" /><span v-else>研</span></div>
                    <div>
                      <h3>{{ projCreating ? '上架研学项目' : (projForm.title || '项目编辑') }}</h3>
                      <div class="sub">{{ projSelected && projSelected.id ? ('编号 ' + projSelected.id) : '填写资料后提交上架' }}</div>
                    </div>
                  </div>
                  <div style="display:flex;gap:8px">
                    <el-button v-if="projSelected && !projCreating" @click="deleteProj">删除</el-button>
                    <el-button @click="closeProj">返回</el-button>
                    <el-button type="primary" :loading="projSaving" @click="saveProj">{{ projSaveLabel }}</el-button>
                  </div>
                </div>
                <div class="proj-banner" v-if="(isMerchant || inEntWorkspace) && projSelected && !projCreating && ['待审批','已驳回'].indexOf(String(projSelected.status||'')) < 0">
                  已通过首次审批：修改后立即生效，无需再次审批。
                </div>
                <div class="proj-banner" v-else-if="(isMerchant || inEntWorkspace) && projSelected && !projCreating && String(projSelected.status||'')==='已驳回'">
                  {{ '已驳回：' + (projSelected.reviewNote || '请调整后重新提交上架审批') }}
                </div>
                <div class="proj-banner" v-else-if="(isMerchant || inEntWorkspace) && projSelected && !projCreating && String(projSelected.status||'')==='待审批'">
                  首次上架待平台审批，通过前学员端不可见。
                </div>
                <div class="studio-body" :class="{ wide: projEditPanel==='route' || projEditPanel==='resources' || projEditPanel==='cert' || projEditPanel==='tourmall' || projEditPanel==='audience' }" :style="{ '--studio-nav-w': studioNavWidth + 'px', '--studio-preview-w': studioPreviewWidth + 'px' }">
                  <div class="studio-nav">
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='basic' }" @click="openProjEdit('basic')">信息<span>名称 / 价格 / 状态</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='media' }" @click="openProjEdit('media')">图文<span>头图 / 标签</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='seat' }" @click="openProjEdit('seat')">名额<span>{{ projForm.enrolled }}/{{ projForm.maxCapacity }}</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='schedule' }" @click="openProjEdit('schedule')">可约日程<span>场次 / 点位 / 内容版</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='place' }" @click="openProjEdit('place')">地点<span>研学地点</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='route' }" @click="openProjEdit('route')">路径<span>{{ (projRoutePoints || []).length }} 个点位</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='resources' }" @click="openProjEdit('resources')">研学资源<span>视频 / 题库 / 游戏 / 任务</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='cert' }" @click="openProjEdit('cert')">结业证书<span>模板 / 拼图源图</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='tourmall' }" @click="openProjEdit('tourmall')">积分商城<span>导览兑换门禁</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='audience' }" @click="openProjEdit('audience')">人群模板<span>分层点位方案</span></button>
                    <button class="mall-mod" type="button" :class="{ on: projEditPanel==='contact' }" @click="openProjEdit('contact')">负责人<span>研学联系人 / 热线</span></button>
                  </div>
                  <div class="mqlt-vsplit" :class="{ on: mqltSplitHover==='studio-nav' }" title="拖动调整模块栏宽度" @mousedown="startStudioNavResize"></div>
                  <div class="studio-main">
                  <PanelBasic v-if="projEditPanel==='basic'" />
                  <PanelMedia v-else-if="projEditPanel==='media'" />
                  <PanelSeat v-else-if="projEditPanel==='seat'" />
                  <PanelSchedule v-else-if="projEditPanel==='schedule'" />
                  <PanelPlace v-else-if="projEditPanel==='place'" />
                  <PanelRoute v-else-if="projEditPanel==='route'" />
                  <PanelResources v-else-if="projEditPanel==='resources'" />
                  <PanelCert v-else-if="projEditPanel==='cert'" />
                  <PanelTourmall v-else-if="projEditPanel==='tourmall'" />
                  <PanelAudience v-else-if="projEditPanel==='audience'" />
                  <PanelContact v-else-if="projEditPanel==='contact'" />
                  </div>
                  <div class="mqlt-vsplit" v-show="projEditPanel!=='route' && projEditPanel!=='resources' && projEditPanel!=='cert' && projEditPanel!=='tourmall' && projEditPanel!=='audience'" :class="{ on: mqltSplitHover==='studio-preview' }" title="拖动调整预览宽度" @mousedown="startStudioPreviewResize"></div>
                  <div class="studio-preview" v-show="projEditPanel!=='route' && projEditPanel!=='resources' && projEditPanel!=='cert' && projEditPanel!=='tourmall' && projEditPanel!=='audience'">
                    <div class="pv-label">小程序预览</div>
                    <div class="pv-board">
                      <div class="pv-back">
                        <svg viewBox="0 0 48 48" fill="none"><path d="M28 12L16 24L28 36" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        返回
                      </div>
                      <div class="pv-scroll">
                        <div class="pv-ticket">
                          <div class="pv-gold"></div>
                          <div class="pv-hero mp-hit" @click="openProjEdit('media')">
                            <img v-if="projCover(projForm)" :src="projCover(projForm)" alt="" />
                            <div v-else class="pv-hero-empty">STUDY PASS</div>
                            <div class="pv-overlay"></div>
                            <div class="pv-dots" v-if="(projForm.mediaColors || []).length > 1">
                              <span class="pv-dot" v-for="(u, di) in projForm.mediaColors" :key="'d'+di" :class="{ on: di===0 }"></span>
                            </div>
                          </div>
                          <div class="pv-rip">
                            <div class="pv-cut pv-cut-l"></div>
                            <div class="pv-rip-line"></div>
                            <div class="pv-holes"><span class="pv-hole" v-for="h in projHoles" :key="'h'+h"></span></div>
                            <div class="pv-cut pv-cut-r"></div>
                          </div>
                          <div class="pv-band">
                            <div>
                              <div class="pv-brand-en">STUDY PASS</div>
                              <div class="pv-brand-cn">蒙企链探 · 研学通票</div>
                            </div>
                            <div>
                              <div class="pv-serial-l">TICKET NO.</div>
                              <div class="pv-serial">{{ projSerial }}</div>
                            </div>
                          </div>
                          <div class="pv-pass mp-hit" @click="openProjEdit('basic')">
                            <div class="pv-wm">PASS</div>
                            <div class="pv-stamp">{{ projStamp }}</div>
                            <div class="pv-tt">{{ projForm.title || '' }}</div>
                            <div class="pv-sub" v-if="projForm.subtitle">{{ projForm.subtitle }}</div>
                            <div class="pv-grid">
                              <div class="pv-cell"><div class="pv-lab">HOST 隶属企业</div><div class="pv-val">{{ projEnterpriseName }}</div></div>
                              <div class="pv-cell"><div class="pv-lab">GATE 地点</div><div class="pv-val">{{ projLocName }}</div></div>
                            </div>
                            <div class="pv-grid">
                              <div class="pv-cell"><div class="pv-lab">SEAT 名额</div><div class="pv-val">{{ projCapacityText }}</div></div>
                              <div class="pv-cell"><div class="pv-lab">CLASS 分类</div><div class="pv-val">{{ projForm.category || '研学' }}</div></div>
                            </div>
                            <div class="pv-tags" v-if="(projForm.tags || []).length">
                              <span class="pv-tag" v-for="(tag, ti) in (projForm.tags || []).slice(0,4)" :key="'tg'+ti">{{ tag }}</span>
                            </div>
                            <div v-if="Number(projForm.maxCapacity) > 0" @click.stop="openProjEdit('seat')">
                              <div class="pv-track"><div class="pv-fill" :style="{ width: projSeatPct + '%' }"></div></div>
                              <div class="pv-hint">{{ projCapacityHint }}</div>
                            </div>
                            <div class="pv-main">
                              <div class="pv-price"><span class="pv-sym">¥</span><span class="pv-num">{{ projForm.price }}</span><span class="pv-unit">/人起</span></div>
                              <div class="pv-book" :class="{ off: projBookDisabled }">{{ projBookText }}</div>
                            </div>
                          </div>
                          <div class="pv-rule"></div>
                          <div class="pv-sec">
                            <div class="pv-sec-h"><span class="pv-k">BULLETIN</span><span class="pv-h">相关动态</span><span class="pv-more">查看更多</span></div>
                            <div class="pv-news-item" v-for="n in projNoticePreview" :key="'pn'+n.id">
                              <div class="pv-news-meta">
                                <span class="nv-type" :style="{ background: (n.type || '测试分类')==='测试分类' ? '#1A1A1A' : '#8E8E93' }">{{ n.type || '测试分类' }}</span>
                                <span class="nv-time">{{ prettyDate(n.publishedAt) }}</span>
                              </div>
                              <div class="pv-news-title">{{ n.title }}</div>
                            </div>
                            <div v-if="!projNoticePreview.length" class="pv-empty">暂无相关动态</div>
                          </div>
                          <div class="pv-rule"></div>
                          <div class="pv-sec">
                            <div class="pv-sec-h"><span class="pv-k">SOUVENIR</span><span class="pv-h">文创商城</span><span class="pv-more">查看更多</span></div>
                            <div class="pv-hint-s">本研学项目专属周边，与其他项目商品互不混入</div>
                            <div class="pv-shop" v-if="projShopPreview.length">
                              <div class="pv-shop-item" v-for="item in projShopPreview" :key="'ps'+item.id">
                                <div class="pv-shop-frame">
                                  <img class="pv-shop-img" :src="productImg(item)" alt="" />
                                </div>
                                <div class="pv-shop-name">{{ item.name }}</div>
                                <div class="pv-shop-foot">
                                  <span class="pv-shop-price">¥{{ item.price }}</span>
                                  <span class="pv-go">选购</span>
                                </div>
                              </div>
                            </div>
                            <div v-else class="pv-shop-empty"><b>暂无本项目文创</b><span class="pv-news-empty">上架后会出现在这里</span></div>
                          </div>
                          <div class="pv-rule"></div>
                          <div class="pv-sec mp-hit" @click="openProjEdit('place')">
                            <div class="pv-sec-h">
                              <svg class="pv-ico" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="18" fill="#F1F5F9"/><path d="M32 16.5C25.649 16.5 20.5 21.537 20.5 27.75C20.5 35.9 32 47.5 32 47.5C32 47.5 43.5 35.9 43.5 27.75C43.5 21.537 38.351 16.5 32 16.5Z" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/><circle cx="32" cy="27.5" r="4" fill="#1A1A1A"/></svg>
                              <span class="pv-k">GATE</span><span class="pv-h">研学地点</span>
                            </div>
                            <div class="pv-loc">{{ projLocName }}</div>
                            <div class="pv-loc-d">{{ projLocDesc }}</div>
                            <div class="pv-map"><span>查看路线导航</span><span>›</span></div>
                          </div>
                          <div class="pv-rule"></div>
                          <div class="pv-sec mp-hit" @click="openProjEdit('route')">
                            <div class="pv-sec-h">
                              <svg class="pv-ico" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="18" fill="#F1F5F9"/><path d="M22 44C22 44 24.5 34 32 32C39.5 30 42 20 42 20" stroke="#1A1A1A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="22" cy="44" r="4.25" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2.5"/><circle cx="42" cy="20" r="4.25" fill="#1A1A1A" stroke="#1A1A1A" stroke-width="2.5"/><circle cx="32" cy="32" r="2" fill="#94A3B8"/></svg>
                              <span class="pv-k">ITINERARY</span><span class="pv-h">研学路径</span><span class="pv-more">查看更多</span>
                            </div>
                            <div class="pv-chips"><span class="pv-chip on">全部</span><span class="pv-chip" v-for="z in projZones" :key="z.key">{{ z.label }}</span></div>
                            <div class="pv-route" v-for="spot in projRouteSpots" :key="spot.no">
                              <div class="pv-stop">{{ spot.no }}</div>
                              <div class="pv-route-body">
                                <div class="pv-route-top">
                                  <div class="pv-route-tt">{{ spot.title }}</div>
                                  <span class="pv-ztag">{{ spot.zoneLabel }}</span>
                                </div>
                                <div class="pv-route-desc">{{ spot.desc }}</div>
                                <div class="pv-route-dur">预计 {{ spot.durationText }}</div>
                              </div>
                              <span class="pv-detail">详情</span>
                            </div>
                            <div v-if="!projRouteSpots.length" class="pv-empty">暂无研学点位</div>
                          </div>
                          <div class="pv-rule"></div>
                          <div class="pv-sec mp-hit" @click="openProjEdit('contact')">
                            <div class="pv-sec-h">
                              <svg class="pv-ico" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="18" fill="#F1F5F9"/><path d="M18.5 22.5C18.5 19.739 20.739 17.5 23.5 17.5H40.5C43.261 17.5 45.5 19.739 45.5 22.5V33.5C45.5 36.261 43.261 38.5 40.5 38.5H31.2L24.5 44.5V38.5H23.5C20.739 38.5 18.5 36.261 18.5 33.5V22.5Z" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2.5" stroke-linejoin="round"/><path d="M25 26.5H39" stroke="#1A1A1A" stroke-width="2.25" stroke-linecap="round"/><path d="M25 32H34.5" stroke="#94A3B8" stroke-width="2.25" stroke-linecap="round"/></svg>
                              <span class="pv-k">SERVICE</span><span class="pv-h">联系方式</span>
                            </div>
                            <div class="pv-row">
                              <span class="pv-clab">官方热线</span>
                              <span class="pv-cval">{{ projPhoneDisplay }}</span>
                            </div>
                            <div class="pv-row">
                              <div class="pv-consult-copy">
                                <div class="pv-consult-title">在线咨询</div>
                                <div class="pv-hours">工作日 09:00–18:00</div>
                              </div>
                              <span class="pv-consult">去咨询</span>
                            </div>
                          </div>
                          <div class="pv-rip">
                            <div class="pv-cut pv-cut-l"></div>
                            <div class="pv-rip-line"></div>
                            <div class="pv-holes"><span class="pv-hole" v-for="h in projHoles" :key="'bh'+h"></span></div>
                            <div class="pv-cut pv-cut-r"></div>
                          </div>
                          <div class="pv-stub">
                            <div class="pv-bars"><span class="pv-bar" v-for="(bw, bi) in projBars" :key="'bb'+bi" :style="{ width: bw + 'px' }"></span></div>
                            <div class="pv-admit"><span>ADMIT ONE · 一票通行</span><span>{{ projSerial }}</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
</template>

<script setup>
import { inject, defineAsyncComponent } from "vue"
const PanelBasic = defineAsyncComponent(() => import("./proj-edit/basic.vue"))
const PanelMedia = defineAsyncComponent(() => import("./proj-edit/media.vue"))
const PanelSeat = defineAsyncComponent(() => import("./proj-edit/seat.vue"))
const PanelSchedule = defineAsyncComponent(() => import("./proj-edit/schedule.vue"))
const PanelPlace = defineAsyncComponent(() => import("./proj-edit/place.vue"))
const PanelRoute = defineAsyncComponent(() => import("./proj-edit/route.vue"))
const PanelResources = defineAsyncComponent(() => import("./proj-edit/resources.vue"))
const PanelCert = defineAsyncComponent(() => import("./proj-edit/cert.vue"))
const PanelTourmall = defineAsyncComponent(() => import("./proj-edit/tourmall.vue"))
const PanelAudience = defineAsyncComponent(() => import("./proj-edit/audience.vue"))
const PanelContact = defineAsyncComponent(() => import("./proj-edit/contact.vue"))
const {
  closeProj,
  deleteProj,
  inEntWorkspace,
  isMerchant,
  mqltSplitHover,
  openProjEdit,
  prettyDate,
  productImg,
  projBars,
  projBookDisabled,
  projBookText,
  projCapacityHint,
  projCapacityText,
  projCover,
  projCreating,
  projEditPanel,
  projEnterpriseName,
  projForm,
  projHoles,
  projLocDesc,
  projLocName,
  projNoticePreview,
  projPhoneDisplay,
  projRoutePoints,
  projRouteSpots,
  projSaveLabel,
  projSaving,
  projSeatPct,
  projSelected,
  projSerial,
  projShopPreview,
  projStamp,
  projZones,
  saveProj,
  startStudioNavResize,
  startStudioPreviewResize,
  studioNavWidth,
  studioPreviewWidth
} = inject("console")
</script>
