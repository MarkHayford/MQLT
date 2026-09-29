<template>
              <div class="users-page live-cc" :class="{ 'live-kiosk': liveKiosk, 'live-compact': liveCompact }">
                <div class="users-hero">
                  <div>
                    <div class="kicker">LIVE · 指挥台</div>
                    <div class="live-marquee" v-if="liveBroadcastBanner">📢 {{ liveBroadcastBanner }}</div>
                    <h3>研学 Live</h3>
                    <p>总览 / 排班 / 名额 / 核销 / 进度 / 点位码 / 快控 / 监控。约 20 秒自动刷新。不含车辆。</p>
                  </div>
                  <div class="users-bar" style="flex-wrap:wrap;gap:8px;justify-content:flex-end">
                    <el-date-picker v-model="liveDate" type="date" value-format="YYYY-MM-DD" placeholder="日期" @change="loadProjLive(false)" />
                    <el-button type="primary" :loading="liveLoading" @click="loadProjLive(false)">刷新</el-button>
                    <el-button @click="exportLiveCsv">导出 CSV</el-button>
                  </div>
                </div>
                <div v-if="liveAlerts.length" style="margin:0 0 12px;display:flex;flex-direction:column;gap:6px">
                  <div v-for="(al, ai) in liveAlerts" :key="ai" class="proj-banner" style="margin:0">{{ al.message }}</div>
                </div>
                <div class="users-bar" style="gap:6px;flex-wrap:wrap;margin-bottom:12px">
                  <button class="chip" :class="{ on: liveTab==='overview' }" @click="liveTab='overview'">总览 KPI</button>
                  <button class="chip" :class="{ on: liveTab==='duty' }" @click="liveTab='duty'">当日排班</button>
                  <button class="chip" :class="{ on: liveTab==='quota' }" @click="liveTab='quota'">预约名额</button>
                  <button class="chip" :class="{ on: liveTab==='checkin' }" @click="liveTab='checkin'">核销工作台</button>
                  <button class="chip" :class="{ on: liveTab==='field-map' }" @click="openLiveFieldMapTab">现场地图</button>
                  <button class="chip" :class="{ on: liveTab==='progress' }" @click="liveTab='progress'">现场进度</button>
                  <button class="chip" :class="{ on: liveTab==='gates' }" @click="liveTab='gates'">点位码</button>
                  <button class="chip" :class="{ on: liveTab==='quick' }" @click="liveTab='quick'">积分卡券证书</button>
                  <button class="chip" :class="{ on: liveTab==='monitor' }" @click="liveTab='monitor'">监控</button>
                  <button class="chip" :class="{ on: liveTab==='proxy' }" @click="liveTab='proxy'">代客预约</button>
                  <button class="chip" :class="{ on: liveTab==='scan' }" @click="liveTab='scan'">扫码核销台</button>
                  <button class="chip" :class="{ on: liveTab==='noshow' }" @click="liveTab='noshow'">缺勤提醒</button>
                  <button class="chip" :class="{ on: liveTab==='heatmap' }" @click="liveTab='heatmap'">点位热力</button>
                  <button class="chip" :class="{ on: liveTab==='ops' }" @click="liveTab='ops'">导览旗标</button>
                  <button class="chip" :class="{ on: liveTab==='points' }" @click="liveTab='points'">积分卡券证</button>
                  <button class="chip" :class="{ on: liveTab==='anomaly' }" @click="liveTab='anomaly'">异常</button>
                  <button class="chip" :class="{ on: liveTab==='timeline' }" @click="liveTab='timeline'">日程时间线</button>
                </div>

                <div v-show="liveTab==='overview'" class="users-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">
                  <div><b>{{ liveCounts.bookings || 0 }}</b><span>预约组</span></div>
                  <div><b>{{ liveCounts.seats || 0 }}</b><span>人数</span></div>
                  <div><b>{{ liveCounts.checkedIn || liveCounts.checkedInSeats || 0 }}</b><span>已核销</span></div>
                  <div><b>{{ liveCounts.pending || liveCounts.pendingCheckInSeats || 0 }}</b><span>待核销</span></div>
                  <div><b>{{ liveCounts.cancelled || 0 }}</b><span>已取消</span></div>
                  <div><b>{{ liveCounts.inTour || 0 }}</b><span>导览中</span></div>
                  <div><b>{{ liveCounts.graduated || 0 }}</b><span>已结业</span></div>
                  <div><b>{{ liveCounts.remaining != null ? liveCounts.remaining : '—' }}</b><span>剩余名额</span></div>
                </div>

                <div v-show="liveTab==='duty'" class="edit-grid" style="max-width:640px;margin-bottom:16px">
                  <div class="full"><label>今日现场负责人</label>
                    <el-select v-model="liveDutyId" :disabled="!liveCanWrite" clearable filterable placeholder="从项目联系人选择" style="width:100%">
                      <el-option v-for="c in liveDutyOptions" :key="c.id" :label="(c.name||'') + ' · ' + (c.role||'') + (c.phone ? (' · '+c.phone) : '')" :value="c.id" />
                    </el-select>
                  </div>
                  <div class="full" v-if="liveData && liveData.dutyContact"><span class="sub">当前：{{ liveData.dutyContact.name }} · {{ liveData.dutyContact.role }} · {{ liveData.dutyContact.phone || '无电话' }}</span></div>
                  <div class="full"><el-button class="live-write-only" type="success" :loading="liveSaving" @click="saveLiveDayOps" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">保存排班</el-button>
                    <span class="sub" style="margin-left:8px">写入 dayOps.duty；学员端导览帮助展示「今日现场负责人」</span></div>
                </div>

                <div v-show="liveTab==='quota'" class="edit-grid" style="max-width:720px;margin-bottom:16px">
                  <div><label>暂停新预约</label><el-switch class="live-write-only" v-model="livePaused"  :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite"/></div>
                  <div><label>暂停核销</label><el-switch class="live-write-only" v-model="livePauseCheckin"  :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite"/></div>
                  <div><label>当日名额</label><el-input-number v-model="liveCapacity" :disabled="!liveCanWrite" :min="0" /></div>
                  <div class="full"><label>当日备注</label><el-input v-model="liveNote" :disabled="!liveCanWrite" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="现场说明 / 集合点等" /></div>
                  <div class="full"><el-button class="live-write-only" type="success" :loading="liveSaving" @click="saveLiveDayOps" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">保存名额设置</el-button>
                    <span class="sub" style="margin-left:8px">容量默认=项目上限；留空清除覆盖</span></div>
                </div>

                <div v-show="liveTab==='checkin'">
                  <div class="users-bar" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">
                    <el-button @click="liveSelectAllPending">全选未核销</el-button>
                    <el-button @click="liveClearSelect">清空</el-button>
                    <el-button class="live-write-only" type="primary" :loading="liveBatchBusy" @click="batchRedeemLive(false)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">批量核销</el-button>
                    <el-button class="live-write-only" :loading="liveBatchBusy" @click="batchRedeemLive(true)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">批量撤销</el-button>
                    <span class="sub">已选 {{ liveSelectedIds.length }} 人 · 入口大码请用「点位码」页</span>
                  </div>
                  <div class="users-table">
                    <div v-if="liveLoading && !liveData" class="empty-board"><b>正在载入</b></div>
                    <div v-else-if="!liveAttendees.length" class="empty-board"><b>当日暂无预约学员</b></div>
                    <table v-else class="grid">
                      <thead><tr>
                        <th></th><th>学员</th><th>研学号</th><th>手机</th><th>状态</th><th>点位</th><th>核销</th><th></th>
                      </tr></thead>
                      <tbody>
                        <tr class="row" v-for="a in liveAttendees" :key="a.bookingId">
                          <td><input type="checkbox" :checked="!!liveSelected[a.bookingId]" @change="toggleLiveSelect(a.bookingId, $event.target.checked)" /></td>
                          <td><div class="name">{{ a.participantName || '—' }}</div></td>
                          <td>{{ a.studyNo || '—' }}</td>
                          <td>{{ a.phone || '—' }}</td>
                          <td><span class="tag warn">{{ bookingLabel(a.status) }}</span></td>
                          <td>{{ a.spotCount || 0 }}</td>
                          <td><span class="tag" :class="a.dayRedeemed ? 'ok' : 'warn'">{{ a.dayRedeemed ? '已核销' : '未核销' }}</span></td>
                          <td>
                            <span class="link-btn live-write-only" v-if="!a.dayRedeemed" @click="redeemLiveDay(a, false)" :data-live-ro="liveCanWrite?0:1">核销</span>
                            <span class="link-btn live-write-only" :data-live-ro="liveCanWrite?0:1" v-if="!a.dayRedeemed" @click="liveForceCheckinPrompt(a)">强制</span>
                            <span class="link-btn live-write-only" v-else @click="redeemLiveDay(a, true)" :data-live-ro="liveCanWrite?0:1">撤销</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="proj-banner" style="margin-top:12px">入口大码提示：请切换到「点位码」Tab，选择大门/入口点位，全屏展示 QR 供学员扫码入场。</div>
                </div>

                <div v-show="liveTab==='field-map'">
                  <div class="proj-banner" style="margin-bottom:10px">现场地图：点位标记 + 右上角列表；点击标记/列表打开详情，可改临时关闭、今日关卡、点位码，并对本站学员做进度操作。全场暂停/广播仍在「导览旗标」。</div>
                  <div class="live-field-map-wrap">
                    <div ref="liveFieldMapEl" class="live-field-map-el"></div>
                    <div v-if="!(liveRoutePoints && liveRoutePoints.length)" class="live-map-empty">暂无路线点位，请先在项目编辑中配置点位坐标</div>
                    <div class="live-field-map-list" v-if="liveRoutePoints && liveRoutePoints.length">
                      <div class="hd">点位列表 · {{ liveRoutePoints.length }}</div>
                      <div class="row" v-for="rp in liveMapSpotRows" :key="'lm-'+rp.id" :class="{ on: liveMapSelectedId===rp.id }" @click="focusLiveMapSpot(rp.id, true)">
                        <span class="dot" :class="{ closed: rp.closed, off: !rp.enabled }"></span>
                        <div>
                          <div class="nm">{{ rp.title || rp.id }}</div>
                          <div class="meta">{{ rp.closed ? '临时关闭' : (rp.enabled === false ? '未启用' : '开放') }} · 在站 {{ rp.atSpot }} · 完成率 {{ rp.completionRate }}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <el-dialog v-model="liveMapDlgOpen" :title="(liveMapDlgSpot && (liveMapDlgSpot.title || liveMapDlgSpot.id)) || '点位详情'" width="720px" class="live-spot-dlg" destroy-on-close @closed="onLiveMapDlgClosed">
                    <template v-if="liveMapDlgSpot">
                      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px">
                        <span class="tag" :class="liveMapDlgSpot.closed ? 'warn' : 'ok'">{{ liveMapDlgSpot.closed ? '临时关闭' : '开放中' }}</span>
                        <span class="tag warn" v-if="liveTourPaused">全场已暂停</span>
                        <span class="sub">在站 {{ liveMapDlgSpot.atSpot || 0 }} · 卡住 {{ liveMapDlgSpot.stuck || 0 }} · 通关 {{ liveMapDlgSpot.cleared || 0 }} · 完成率 {{ liveMapDlgSpot.completionRate || 0 }}%</span>
                      </div>
                      <div class="sub" v-if="liveMapDlgSpot.latitude != null">坐标 {{ liveMapDlgSpot.latitude }}, {{ liveMapDlgSpot.longitude }}</div>

                      <div class="sec">
                        <div class="sec-title">临时关闭本站</div>
                        <el-switch class="live-write-only" :model-value="!!liveMapDlgSpot.closed" @change="liveMapSetClosed($event)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite" active-text="关闭（学员不可进）" inactive-text="开放" />
                      </div>

                      <div class="sec">
                        <div class="sec-title">今日必做关卡</div>
                        <el-select v-model="liveMapOverrideRequired" :disabled="!liveCanWrite" multiple filterable placeholder="不选则按点位默认关卡" style="width:100%">
                          <el-option v-for="st in liveMapOverrideStepOpts" :key="'ms-'+st.id" :label="st.title || st.id" :value="st.id" />
                        </el-select>
                        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                          <el-button class="live-write-only" type="primary" size="small" @click="liveMapSaveStepOverride" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">保存关卡覆盖</el-button>
                          <el-button class="live-write-only" size="small" @click="liveMapClearStepOverride" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">清除覆盖</el-button>
                        </div>
                      </div>

                      <div class="sec">
                        <div class="sec-title">点位码</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                          <el-button type="primary" size="small" :loading="liveGateLoading" @click="liveMapOpenGate(false)">打开点位码</el-button>
                          <el-button size="small" :loading="liveGateLoading" @click="liveMapOpenGate(true)">刷新码</el-button>
                        </div>
                        <div v-if="liveGate && liveGatePointId===liveMapDlgSpot.id" style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
                          <img v-if="liveGate.raw" :src="'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(liveGate.raw)" alt="gate-qr" style="width:160px;height:160px;image-rendering:pixelated;border:1px solid #e5e7eb;border-radius:8px" />
                          <div class="sub" style="word-break:break-all;max-width:360px">序列 {{ liveGate.serial || '—' }}<br>{{ liveGate.raw }}</div>
                        </div>
                      </div>

                      <div class="sec">
                        <div class="sec-title">本站学员进度</div>
                        <div v-if="!liveMapDlgAttendees.length" class="sub">当前没有学员在该点位</div>
                        <table v-else class="grid" style="width:100%">
                          <thead><tr><th>学员</th><th>阶段</th><th>关卡</th><th>操作</th></tr></thead>
                          <tbody>
                            <tr v-for="a in liveMapDlgAttendees" :key="'ma-'+a.bookingId">
                              <td>
                                <div class="name">{{ a.participantName || '—' }}</div>
                                <div class="sub">{{ a.studyNo || '' }}</div>
                              </td>
                              <td>{{ a.exploreStage || a.tourStatus || '—' }}</td>
                              <td style="min-width:120px">
                                <el-select :model-value="liveProgStep[a.bookingId] || a.pendingStepId || ''" placeholder="关卡" size="small" filterable style="width:120px" @change="(v)=>setLiveProgStep(a.bookingId, v)">
                                  <el-option v-for="st in liveStepsForRow(Object.assign({}, a, { exploreSpotId: liveMapDlgSpot.id }))" :key="st.id" :label="(st.finished?'✓ ':'')+(st.title||st.id)" :value="st.id" />
                                </el-select>
                              </td>
                              <td style="white-space:nowrap">
                                <span class="link-btn live-write-only" :class="{ disabled: liveActBusy }" @click="liveMapSkipStep(a, 'skip')" :data-live-ro="liveCanWrite?0:1">跳过</span>
                                <span class="link-btn live-write-only" :class="{ disabled: liveActBusy }" @click="liveMapSkipStep(a, 'complete')" :data-live-ro="liveCanWrite?0:1">强制完成</span>
                                <span class="link-btn live-write-only" :class="{ disabled: liveActBusy }" @click="liveMapEndStation(a)" :data-live-ro="liveCanWrite?0:1">结束站点</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </template>
                  </el-dialog>
                </div>

                <div v-show="liveTab==='progress'">
                  <div class="proj-banner" style="margin-bottom:10px">现场进度：可远程跳过/强制完成当前关卡，或结束站点（跳过未完成关 + 通关结算）。点位码主要用于现场任务确认；整站通关已自动结算。需学员已入口核销。</div>
                  <div class="users-table">
                    <div v-if="!liveAttendees.length" class="empty-board"><b>当日暂无预约学员</b></div>
                    <table v-else class="grid">
                      <thead><tr><th>学员</th><th>核销</th><th>导览</th><th>阶段</th><th>点位</th><th>关卡</th><th>操作</th></tr></thead>
                      <tbody>
                        <tr class="row" v-for="a in liveAttendees" :key="'p-'+a.bookingId" >
                          <td>
                            <div class="name">{{ a.participantName || '—' }}</div>
                            <div class="sub">{{ a.studyNo || '' }}</div>
                          </td>
                          <td><span class="tag" :class="a.dayRedeemed ? 'ok' : 'warn'">{{ a.dayRedeemed ? '已核销' : '未核销' }}</span></td>
                          <td>
                            <span>{{ a.tourStatus || (a.graduated ? '结业' : '—') }}</span>
                            <div class="sub" v-if="a.mallRedeemUnlocked">商城可兑</div>
                          </td>
                          <td>{{ a.exploreStage || '—' }}</td>
                          <td style="min-width:140px">
                            <el-select :model-value="liveProgSpot[a.bookingId] || a.exploreSpotId || ''" placeholder="点位" size="small" filterable style="width:140px"
                              @change="(v)=>setLiveProgSpot(a.bookingId, v)">
                              <el-option v-for="rp in liveSpotOptionsFor(a)" :key="rp.id" :label="(rp.sortOrder||0)+'. '+(rp.title||rp.id)" :value="rp.id" />
                            </el-select>
                          </td>
                          <td style="min-width:140px">
                            <el-select :model-value="liveProgStep[a.bookingId] || a.pendingStepId || ''" placeholder="关卡" size="small" filterable style="width:140px"
                              @change="(v)=>setLiveProgStep(a.bookingId, v)">
                              <el-option v-for="st in liveStepsForRow(a)" :key="st.id" :label="(st.finished?'✓ ':'')+(st.title||st.id)" :value="st.id" />
                            </el-select>
                          </td>
                          <td style="white-space:nowrap">
                            <span class="link-btn live-write-only" :class="{ disabled: liveActBusy }" @click="liveSkipStep(a, 'skip')" :data-live-ro="liveCanWrite?0:1">跳过</span>
                            <span class="link-btn live-write-only" :class="{ disabled: liveActBusy }" @click="liveSkipStep(a, 'complete')" :data-live-ro="liveCanWrite?0:1">强制完成</span>
                            <span class="link-btn live-write-only" :class="{ disabled: liveActBusy }" @click="liveEndStation(a)" :data-live-ro="liveCanWrite?0:1">结束站点</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-show="liveTab==='gates'">
                  <div class="users-bar" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">
                    <el-select v-model="liveGatePointId" placeholder="选择点位" style="min-width:220px" filterable>
                      <el-option v-for="rp in liveRoutePoints" :key="rp.id" :label="(rp.sortOrder||0) + '. ' + (rp.title||rp.id)" :value="rp.id" />
                    </el-select>
                    <el-button type="primary" :loading="liveGateLoading" @click="loadLiveGate(false)">打开点位码</el-button>
                    <el-button :loading="liveGateLoading" @click="loadLiveGate(true)">刷新码</el-button>
                  </div>
                  <div v-if="liveGate" style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start">
                    <div style="background:#fff;padding:16px;border-radius:12px;border:1px solid #e5e7eb;text-align:center;min-width:280px">
                      <div class="sub" style="margin-bottom:8px">{{ (liveGate.routePoint && liveGate.routePoint.title) || '点位' }} · 序列 {{ liveGate.serial || '—' }}</div>
                      <img v-if="liveGate.raw" :src="'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=' + encodeURIComponent(liveGate.raw)" alt="gate-qr" style="width:280px;height:280px;image-rendering:pixelated" />
                      <div class="sub" style="margin-top:8px;word-break:break-all;max-width:280px">{{ liveGate.raw }}</div>
                    </div>
                    <div>
                      <p class="sub">入口点位可全屏展示入场相关码；研学点位码供学员完成「现场任务」扫码确认。刷新会轮换 nonce。整站通关已改为关卡完成后自动结算。</p>
                      <el-button @click="liveTab='checkin'">回核销工作台</el-button>
                    </div>
                  </div>
                  <div v-else class="empty-board"><b>选择点位后打开 QR</b></div>
                </div>

                <div v-show="liveTab==='quick'" class="edit-grid" style="max-width:720px">
                  <div class="full"><label>今日导览积分商城</label>
                    <el-select v-model="liveTourMallOpen" :disabled="!liveCanWrite" clearable placeholder="跟随项目配置" style="width:100%">
                      <el-option label="跟随项目配置" :value="null" />
                      <el-option label="今日强制开放" :value="true" />
                      <el-option label="今日强制关闭" :value="false" />
                    </el-select>
                  </div>
                  <div class="full" v-if="liveData && liveData.tourMall"><span class="sub">项目商城：{{ liveData.tourMall.enabled ? '已启用' : '未启用' }} · {{ liveData.tourMall.title || '' }}</span></div>
                  <div class="full" style="display:flex;gap:8px;flex-wrap:wrap">
                    <el-button class="live-write-only" type="success" :loading="liveSaving" @click="saveLiveDayOps" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">保存商城快控</el-button>
                    <el-button class="live-write-only" @click="openLiveCertPanel" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">结业证书面板</el-button>
                    <el-button class="live-write-only" @click="openLiveMallPanel" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">积分商城面板</el-button>
                  </div>
                  <div class="full" style="margin-top:8px"><label>结业解锁（导览积分商城兑换门禁）</label>
                    <el-select v-model="liveGradBookingId" :disabled="!liveCanWrite" filterable clearable placeholder="选择当日学员预约" style="width:100%">
                      <el-option v-for="a in liveAttendees" :key="'g-'+a.bookingId"
                        :label="(a.participantName||'学员') + ' · ' + (a.studyNo||a.bookingId) + (a.mallRedeemUnlocked || a.graduated ? '（已解锁）' : '（未解锁）')"
                        :value="a.bookingId" />
                    </el-select>
                  </div>
                  <div class="full" style="display:flex;gap:8px;flex-wrap:wrap">
                    <el-button class="live-write-only" type="primary" :loading="liveActBusy" @click="setLiveGraduation(true)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">解锁结业 + 商城兑换</el-button>
                    <el-button class="live-write-only" :loading="liveActBusy" @click="setLiveGraduation(false)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">锁定兑换</el-button>
                  </div>
                  <div class="full"><span class="sub">解锁后写入 tripPlan.tour.graduated / mallRedeemUnlocked，小程序刷新导览即可兑。卡券/证书批量发放仍未接。</span></div>
                </div>

                <div v-show="liveTab==='monitor'">
                  <div class="proj-banner" v-if="!liveAlerts.length">运行正常：未暂停、名额未满。</div>
                  <div v-for="(al, ai) in liveAlerts" :key="'m-'+ai" class="proj-banner">{{ al.message }}</div>
                  <div class="users-bar" style="margin-top:12px;gap:8px">
                    <el-button type="primary" :loading="liveLoading" @click="loadProjLive(false)">立即刷新</el-button>
                    <el-button @click="exportLiveCsv">导出今日学员 CSV</el-button>
                    <el-button @click="toggleLiveKiosk">{{ liveKiosk ? '退出投屏' : '投屏/Kiosk' }}</el-button>
                    <el-button @click="toggleLiveCompact">{{ liveCompact ? '标准布局' : '手机紧凑' }}</el-button>
                    <el-switch v-model="liveSoundOn" active-text="声音提醒" />
                    <span class="sub">自动刷新（20s）· {{ liveCanWrite ? '可写' : '只读' }}</span>
                  </div>
                  <div class="users-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-top:12px">
                    <div><b>{{ liveCounts.seats || 0 }}</b><span>在场预约</span></div>
                    <div><b>{{ liveCounts.checkedIn || 0 }}</b><span>已入场</span></div>
                    <div><b>{{ liveCounts.inTour || 0 }}</b><span>导览中</span></div>
                    <div><b>{{ liveCounts.graduated || 0 }}</b><span>结业</span></div>
                  </div>
                </div>
                <div v-show="liveTab==='proxy'" class="edit-grid" style="max-width:820px">
                  <div class="proj-banner">代客预约 / 改期 / 加减席 / 候补。</div>
                  <div><label>用户 ID</label><el-input v-model="liveProxyUserId" :disabled="!liveCanWrite" placeholder="userId" /></div>
                  <div><label>席位数</label><el-input-number v-model="liveProxySeats" :disabled="!liveCanWrite" :min="1" :max="20" /></div>
                  <div class="full"><label>学员姓名（可选）</label><el-input v-model="liveProxyName" :disabled="!liveCanWrite" /></div>
                  <div class="full"><el-button class="live-write-only" type="primary" :loading="liveActBusy" @click="liveProxyBook" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">代客预约</el-button></div>
                  <div><label>改期预约 ID</label><el-input v-model="liveRescheduleId" :disabled="!liveCanWrite" /></div>
                  <div><label>改到日期</label><el-date-picker v-model="liveRescheduleDate" :disabled="!liveCanWrite" type="date" value-format="YYYY-MM-DD" /></div>
                  <div class="full"><el-button class="live-write-only" @click="liveDoReschedule" :loading="liveActBusy" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">改期</el-button></div>
                  <div><label>席位预约 ID</label><el-input v-model="liveSeatBookingId" :disabled="!liveCanWrite" /></div>
                  <div><label>席位操作</label>
                    <el-select v-model="liveSeatAction" :disabled="!liveCanWrite" style="width:100%"><el-option label="设为" value="set" /><el-option label="增加" value="add" /><el-option label="减少" value="remove" /></el-select>
                  </div>
                  <div><label>数量</label><el-input-number v-model="liveSeatDelta" :disabled="!liveCanWrite" :min="1" /></div>
                  <div class="full"><el-button class="live-write-only" @click="liveDoSeats" :loading="liveActBusy" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">调整席位</el-button></div>
                  <div class="full"><label>候补姓名</label><el-input v-model="liveWaitName" :disabled="!liveCanWrite" /></div>
                  <div><label>候补手机</label><el-input v-model="liveWaitPhone" :disabled="!liveCanWrite" /></div>
                  <div class="full"><el-button class="live-write-only" type="success" @click="liveWaitlistAdd" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">加入候补</el-button><el-button @click="liveWaitlistLoad">刷新候补</el-button></div>
                  <div class="full">
                    <div v-for="w in liveWaitlist" :key="w.id" class="proj-banner" style="display:flex;justify-content:space-between;gap:8px">
                      <span>{{ w.name }} · {{ w.phone }} · {{ w.at }}</span>
                      <span class="link-btn live-write-only" @click="liveWaitlistRemove(w.id)" :data-live-ro="liveCanWrite?0:1">移除</span>
                    </div>
                  </div>
                </div>

                <div v-show="liveTab==='scan'">
                  <div class="proj-banner">全屏扫码核销台：扫枪/粘贴核销码后回车；可强制核销并写审计备注。</div>
                  <el-button class="live-write-only" type="primary" @click="openLiveScan" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">打开全屏核销台</el-button>
                  <div class="edit-grid" style="max-width:640px;margin-top:12px" v-if="liveScanHit">
                    <div class="full">命中：{{ liveScanHit.participantName }} · {{ liveScanHit.studyNo }} · {{ liveScanHit.phone }}</div>
                    <div class="full"><label>强制核销备注</label><el-input v-model="liveForceNote" :disabled="!liveCanWrite" type="textarea" /></div>
                    <div class="full">
                      <el-button class="live-write-only" type="success" @click="liveRedeemFromScan(false)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">正常核销</el-button>
                      <el-button class="live-write-only" type="warning" @click="liveForceFromScan" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">强制核销</el-button>
                    </div>
                  </div>
                </div>

                <div v-show="liveTab==='noshow'">
                  <div class="proj-banner">{{ (liveData && liveData.smsLimitation) || '无短信通道：仅队列标记/导出；微信订阅为占位。' }}</div>
                  <div class="users-bar" style="gap:8px;margin-bottom:8px">
                    <el-button class="live-write-only" type="primary" @click="liveRemindNoshow('console')" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">标记已提醒</el-button>
                    <el-button class="live-write-only" @click="liveRemindNoshow('wechat_stub')" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">微信订阅占位</el-button>
                    <el-button @click="exportNoshowCsv">导出缺勤名单</el-button>
                  </div>
                  <table class="data-table"><thead><tr><th></th><th>学员</th><th>手机</th><th>已提醒</th><th>渠道</th></tr></thead>
                    <tbody>
                      <tr v-for="a in liveNoshowQueue" :key="'ns-'+a.bookingId">
                        <td><input type="checkbox" :checked="!!liveSelected[a.bookingId]" @change="toggleLiveSelect(a.bookingId, $event.target.checked)" /></td>
                        <td>{{ a.participantName }}</td><td>{{ a.phone }}</td>
                        <td>{{ a.reminded ? '是' : '否' }}</td><td>{{ a.remindChannel || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-show="liveTab==='heatmap'">
                  <div class="live-heatmap">
                    <div class="hm" v-for="h in liveHeatmap" :key="'hm-'+h.routePointId">
                      <div style="font-weight:600">{{ h.title }} <span v-if="h.closed" class="tag warn">关闭</span></div>
                      <b>{{ h.atSpot }}</b><span>在站</span>
                      <div class="sub">完成率 {{ h.completionRate }}% · 卡住 {{ h.stuck }} · 通关 {{ h.cleared }}</div>
                    </div>
                  </div>
                </div>

                <div v-show="liveTab==='ops'" class="edit-grid" style="max-width:820px">
                  <div class="full"><label>全场导览暂停（学员只读）</label><el-switch class="live-write-only" v-model="liveTourPaused"  :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite"/></div>
                  <div class="full"><label>紧急广播</label><el-input v-model="liveBroadcastText" :disabled="!liveCanWrite" type="textarea" placeholder="将在小程序弹窗/跑马灯展示" /></div>
                  <div class="full">
                    <el-button class="live-write-only" type="danger" @click="liveSaveTourFlags" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">保存旗标/广播</el-button>
                    <el-button class="live-write-only" @click="liveBroadcastText=''; liveSaveTourFlags()" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">清除广播</el-button>
                  </div>
                  <div class="full"><label>临时关闭点位</label>
                    <el-select v-model="liveClosedSpots" :disabled="!liveCanWrite" multiple filterable style="width:100%" placeholder="选择点位">
                      <el-option v-for="rp in liveRoutePoints" :key="'cl-'+rp.id" :label="rp.title||rp.id" :value="rp.id" />
                    </el-select>
                  </div>
                  <div><label>改今日关卡 · 点位</label>
                    <el-select v-model="liveOverrideSpot" :disabled="!liveCanWrite" style="width:100%" @change="liveLoadOverrideSteps">
                      <el-option v-for="rp in liveRoutePoints" :key="'ov-'+rp.id" :label="rp.title||rp.id" :value="rp.id" />
                    </el-select>
                  </div>
                  <div><label>今日必做关卡</label>
                    <el-select v-model="liveOverrideRequired" :disabled="!liveCanWrite" multiple filterable style="width:100%">
                      <el-option v-for="st in liveOverrideStepOpts" :key="'req-'+st.id" :label="st.title||st.id" :value="st.id" />
                    </el-select>
                  </div>
                  <div class="full">
                    <el-button class="live-write-only" type="primary" @click="liveSaveStepOverride" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">保存今日关卡覆盖</el-button>
                    <el-button class="live-write-only" @click="liveClearStepOverride" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">清除覆盖</el-button>
                  </div>
                </div>

                <div v-show="liveTab==='points'" class="edit-grid" style="max-width:900px">
                  <div><label>学员预约</label>
                    <el-select v-model="livePtsBookingId" filterable style="width:100%" @change="liveLoadPointsAndCoupons">
                      <el-option v-for="a in liveAttendees" :key="'pb-'+a.bookingId" :label="(a.participantName||'')+' · '+a.bookingId" :value="a.bookingId" />
                    </el-select>
                  </div>
                  <div><label>调分 Δ</label><el-input-number v-model="livePtsDelta" :disabled="!liveCanWrite" /></div>
                  <div class="full"><label>调分备注</label><el-input v-model="livePtsNote" :disabled="!liveCanWrite" /></div>
                  <div class="full">
                    <el-button class="live-write-only" type="primary" @click="liveAdjustPoints" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">手动调分</el-button>
                    <el-button @click="liveLoadPointsAndCoupons">刷新账本/卡包</el-button>
                  </div>
                  <div class="full"><pre style="white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px;max-height:180px;overflow:auto">{{ livePtsLedgerText }}</pre></div>
                  <div class="full"><label>批量发卡标题</label><el-input v-model="liveCouponTitle" :disabled="!liveCanWrite" placeholder="站点卡券" /></div>
                  <div><label>批量发卡有效天数</label><el-input-number v-model="liveBatchExpireDays" :disabled="!liveCanWrite" :min="0" :max="3650" /><span class="hint" style="margin-left:8px">0=长期有效</span></div>
                  <div class="full"><label>点位（可选）</label>
                    <el-select v-model="liveCouponSpot" :disabled="!liveCanWrite" clearable style="width:100%">
                      <el-option v-for="rp in liveRoutePoints" :key="'cp-'+rp.id" :label="rp.title||rp.id" :value="rp.id" />
                    </el-select>
                  </div>
                  <div class="full">
                    <el-button class="live-write-only" type="success" @click="liveBatchCoupons" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">给勾选学员批量发卡</el-button>
                    <el-button class="live-write-only" @click="livePuzzleGrant(true)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">发放拼图块</el-button>
                    <el-button class="live-write-only" @click="livePuzzleGrant(false)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">收回拼图块</el-button>
                    <el-button class="live-write-only" type="warning" @click="liveCertAction('reissue')" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">补发证书</el-button>
                    <el-button class="live-write-only" type="danger" @click="liveCertAction('void')" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">作废证书</el-button>
                  </div>
                  <div class="full">
                    <div class="proj-banner" style="margin-bottom:8px">已发奖品卡券（选学员后刷新）。可改到期日或延长 N 天；已核销不可改。</div>
                    <table class="data-table" v-if="liveCouponItems.length">
                      <thead><tr><th>名称</th><th>状态</th><th>来源</th><th>到期</th><th>操作</th></tr></thead>
                      <tbody>
                        <tr v-for="c in liveCouponItems" :key="c.id">
                          <td>{{ c.title || c.id }}<div class="sub">{{ c.subtitle || c.grade || '' }}</div></td>
                          <td>{{ c.status }}</td>
                          <td>{{ c.source || '-' }}</td>
                          <td>{{ c.expireAt ? fmtTime(c.expireAt) : '长期' }}</td>
                          <td style="white-space:nowrap">
                            <template v-if="String(c.status||'').toLowerCase()!=='used'">
                              <span class="link-btn live-write-only" @click="openLiveCouponEdit(c)" :data-live-ro="liveCanWrite?0:1">改期</span>
                              <span class="link-btn live-write-only" @click="quickExtendLiveCoupon(c,7)" :data-live-ro="liveCanWrite?0:1">+7天</span>
                              <span class="link-btn live-write-only" @click="quickExtendLiveCoupon(c,30)" :data-live-ro="liveCanWrite?0:1">+30天</span>
                            </template>
                            <span v-else class="sub">已核销</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-else class="sub">暂无卡券或未选择学员</div>
                    <details style="margin-top:8px"><summary class="sub">原始 JSON</summary><pre style="white-space:pre-wrap;background:#f8fafc;padding:10px;border-radius:8px;max-height:120px;overflow:auto">{{ liveCouponsText }}</pre></details>
                  </div>
                  <div v-if="liveCouponEdit" class="full" style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;background:#fff">
                    <b>修改过期 · {{ liveCouponEdit.title || liveCouponEdit.id }}</b>
                    <div class="edit-grid" style="margin-top:8px">
                      <div><label>到期日</label><el-date-picker v-model="liveCouponEditExpire" type="date" value-format="YYYY-MM-DD" clearable style="width:100%" /></div>
                      <div><label>延长天数</label><el-input-number v-model="liveCouponExtendDays" :min="-3650" :max="3650" /></div>
                      <div class="full" style="display:flex;gap:8px;flex-wrap:wrap">
                        <el-button class="live-write-only" type="primary" @click="saveLiveCouponExpire('set')" :disabled="!liveCanWrite">保存到期日</el-button>
                        <el-button class="live-write-only" type="success" @click="saveLiveCouponExpire('extend')" :disabled="!liveCanWrite">按天数延长</el-button>
                        <el-button class="live-write-only" @click="saveLiveCouponExpire('clear')" :disabled="!liveCanWrite">设为长期有效</el-button>
                        <el-button @click="closeLiveCouponEdit">取消</el-button>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-show="liveTab==='anomaly'">
                  <div class="edit-grid" style="max-width:720px">
                    <div class="full"><label>上报异常</label><el-input v-model="liveAnomalyMsg" :disabled="!liveCanWrite" placeholder="扫码失败 / 游戏报错 …" /></div>
                    <div class="full"><el-button class="live-write-only" type="primary" @click="liveReportAnomaly" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">写入异常队列</el-button></div>
                  </div>
                  <table class="data-table" style="margin-top:10px"><thead><tr><th>时间</th><th>类型</th><th>内容</th><th>状态</th><th></th></tr></thead>
                    <tbody>
                      <tr v-for="an in liveAnomalies" :key="an.id">
                        <td>{{ an.at }}</td><td>{{ an.type }}</td><td>{{ an.message }}</td><td>{{ an.status }}</td>
                        <td><span class="link-btn live-write-only" @click="liveAckAnomaly(an.id)" :data-live-ro="liveCanWrite?0:1">确认</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div v-show="liveTab==='timeline'">
                  <div class="proj-banner">当日事件时间线（预约/核销/旗标/调分/异常等）</div>
                  <div v-for="ev in liveTimeline" :key="ev.id" class="proj-banner" style="margin-bottom:6px">
                    <b>{{ ev.at }}</b> · {{ ev.type }} · {{ ev.summary || '' }}
                  </div>
                  <div v-if="!liveTimeline.length" class="sub">暂无事件</div>
                </div>

                <div v-if="liveScanOpen" class="live-scan-fs" @click.self="liveScanOpen=false">
                  <div class="scan-box">
                    <div style="font-size:20px;font-weight:700;margin-bottom:8px">全屏核销工作台</div>
                    <div class="sub" style="color:#94a3b8;margin-bottom:12px">扫码枪对准此处输入框，扫完自动回车</div>
                    <input ref="liveScanInput" v-model="liveScanCode" @keydown.enter.prevent="liveScanSubmit" placeholder="粘贴/扫描核销码或研学号" autofocus />
                    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                      <el-button type="primary" @click="liveScanSubmit">查询</el-button>
                      <el-button @click="liveScanOpen=false">关闭</el-button>
                    </div>
                    <div v-if="liveScanHit" style="margin-top:16px;line-height:1.7">
                      <div><b>{{ liveScanHit.participantName }}</b> · {{ liveScanHit.studyNo }} · {{ liveScanHit.phone }}</div>
                      <el-input v-model="liveForceNote" :disabled="!liveCanWrite" type="textarea" placeholder="强制核销审计备注" style="margin-top:8px" />
                      <div style="margin-top:8px;display:flex;gap:8px">
                        <el-button class="live-write-only" type="success" @click="liveRedeemFromScan(false)" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">核销</el-button>
                        <el-button class="live-write-only" type="warning" @click="liveForceFromScan" :data-live-ro="liveCanWrite?0:1" :disabled="!liveCanWrite">强制核销</el-button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  active,
  batchRedeemLive,
  bookingLabel,
  closeLiveCouponEdit,
  exportLiveCsv,
  exportNoshowCsv,
  fmtTime,
  focusLiveMapSpot,
  liveAckAnomaly,
  liveActBusy,
  liveAdjustPoints,
  liveAlerts,
  liveAnomalies,
  liveAnomalyMsg,
  liveAttendees,
  liveBatchBusy,
  liveBatchCoupons,
  liveBatchExpireDays,
  liveBroadcastBanner,
  liveBroadcastText,
  liveCanWrite,
  liveCapacity,
  liveCertAction,
  liveClearSelect,
  liveClearStepOverride,
  liveClosedSpots,
  liveCompact,
  liveCounts,
  liveCouponEdit,
  liveCouponEditExpire,
  liveCouponExtendDays,
  liveCouponItems,
  liveCouponSpot,
  liveCouponTitle,
  liveCouponsText,
  liveData,
  liveDate,
  liveDoReschedule,
  liveDoSeats,
  liveDutyId,
  liveDutyOptions,
  liveEndStation,
  liveFieldMapEl,
  liveForceCheckinPrompt,
  liveForceFromScan,
  liveForceNote,
  liveGate,
  liveGateLoading,
  liveGatePointId,
  liveGradBookingId,
  liveHeatmap,
  liveKiosk,
  liveLoadOverrideSteps,
  liveLoadPointsAndCoupons,
  liveLoading,
  liveMapClearStepOverride,
  liveMapDlgAttendees,
  liveMapDlgOpen,
  liveMapDlgSpot,
  liveMapEndStation,
  liveMapOpenGate,
  liveMapOverrideRequired,
  liveMapOverrideStepOpts,
  liveMapSaveStepOverride,
  liveMapSelectedId,
  liveMapSetClosed,
  liveMapSkipStep,
  liveMapSpotRows,
  liveNoshowQueue,
  liveNote,
  liveOverrideRequired,
  liveOverrideSpot,
  liveOverrideStepOpts,
  livePauseCheckin,
  livePaused,
  liveProgSpot,
  liveProgStep,
  liveProxyBook,
  liveProxyName,
  liveProxySeats,
  liveProxyUserId,
  livePtsBookingId,
  livePtsDelta,
  livePtsLedgerText,
  livePtsNote,
  livePuzzleGrant,
  liveRedeemFromScan,
  liveRemindNoshow,
  liveReportAnomaly,
  liveRescheduleDate,
  liveRescheduleId,
  liveRoutePoints,
  liveSaveStepOverride,
  liveSaveTourFlags,
  liveSaving,
  liveScanCode,
  liveScanHit,
  liveScanOpen,
  liveScanSubmit,
  liveSeatAction,
  liveSeatBookingId,
  liveSeatDelta,
  liveSelectAllPending,
  liveSelected,
  liveSelectedIds,
  liveSkipStep,
  liveSoundOn,
  liveSpotOptionsFor,
  liveStepsForRow,
  liveTab,
  liveTimeline,
  liveTourMallOpen,
  liveTourPaused,
  liveWaitName,
  liveWaitPhone,
  liveWaitlist,
  liveWaitlistAdd,
  liveWaitlistLoad,
  liveWaitlistRemove,
  loadLiveGate,
  loadProjLive,
  onLiveMapDlgClosed,
  openLiveCertPanel,
  openLiveCouponEdit,
  openLiveFieldMapTab,
  openLiveMallPanel,
  openLiveScan,
  ov,
  quickExtendLiveCoupon,
  redeemLiveDay,
  saveLiveCouponExpire,
  saveLiveDayOps,
  setLiveGraduation,
  setLiveProgSpot,
  setLiveProgStep,
  toggleLiveCompact,
  toggleLiveKiosk,
  toggleLiveSelect
} = inject("console")
</script>
