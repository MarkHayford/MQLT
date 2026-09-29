<template>
                  <div class="edit-grid sched-panel">
                    <div class="full" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
                      <button class="chip" :class="{ on: schedTab==='calendar' }" type="button" @click="schedTab='calendar'">月历</button>
                      <button class="chip" :class="{ on: schedTab==='day' }" type="button" @click="schedTab='day'">日详情</button>
                      <button class="chip" :class="{ on: schedTab==='versions' }" type="button" @click="schedTab='versions'; loadSchedVersions()">内容版本</button>
                      <button class="chip" :class="{ on: schedTab==='copy' }" type="button" @click="schedTab='copy'">复制场次</button>
                      <button class="chip" :class="{ on: schedTab==='logs' }" type="button" @click="schedTab='logs'; loadSchedLogs()">变更日志</button>
                      <el-button size="small" @click="seedSchedHorizon" :loading="schedSaving">生成可约窗口</el-button>
                      <span class="muted" style="font-size:12px">最远可约仍由「名额→可预约天数」控制；此处按日开关/点位/内容版。优先级：Live临时 &gt; 场次日 &gt; 项目默认。</span>
                    </div>

                    <div class="full" v-if="schedTab==='calendar'">
                      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                        <el-button size="small" @click="shiftSchedMonth(-1)">‹</el-button>
                        <b>{{ schedCalMonth }}</b>
                        <el-button size="small" @click="shiftSchedMonth(1)">›</el-button>
                        <el-button size="small" @click="loadSchedMonth" :loading="schedLoading">刷新</el-button>
                      </div>
                      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:12px">
                        <div v-for="w in ['一','二','三','四','五','六','日']" :key="w" style="text-align:center;font-size:12px;opacity:.7">{{ w }}</div>
                        <button v-for="(c,i) in schedMonthCells" :key="i" type="button" @click="c.inMonth && openSchedDay(c.date)"
                          :disabled="!c.inMonth"
                          :style="{
                            minHeight:'64px', border:'1px solid #e5e7eb', borderRadius:'8px', background: c.selected ? '#e8f5e9' : (c.open===false ? '#fef2f2' : (c.open ? '#f0fdf4' : '#fafafa')),
                            opacity: c.inMonth ? 1 : .35, cursor: c.inMonth ? 'pointer' : 'default', textAlign:'left', padding:'6px'
                          }">
                          <div style="font-weight:600">{{ c.day || '' }}</div>
                          <div v-if="c.inMonth && c.open===true" style="font-size:11px;color:#15803d">开{{ c.capacity!=null ? (' ·'+c.capacity) : '' }}</div>
                          <div v-else-if="c.inMonth && c.open===false" style="font-size:11px;color:#b91c1c">关</div>
                          <div v-else-if="c.inMonth" style="font-size:11px;opacity:.5">未配</div>
                          <div v-if="c.spotOn!=null" style="font-size:10px;opacity:.7">点 {{ c.spotOn }}/{{ c.spotAll }}</div>
                        </button>
                      </div>
                      <div style="border:1px dashed #d1d5db;border-radius:8px;padding:12px">
                        <b>批量：本月按星期</b>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;align-items:center">
                          <el-checkbox-group v-model="schedBatchWeekdays">
                            <el-checkbox :label="1">一</el-checkbox>
                            <el-checkbox :label="2">二</el-checkbox>
                            <el-checkbox :label="3">三</el-checkbox>
                            <el-checkbox :label="4">四</el-checkbox>
                            <el-checkbox :label="5">五</el-checkbox>
                            <el-checkbox :label="6">六</el-checkbox>
                            <el-checkbox :label="0">日</el-checkbox>
                          </el-checkbox-group>
                          <el-switch v-model="schedBatchOpen" active-text="开放" inactive-text="关闭" />
                          <el-input-number v-model="schedBatchCapacity" :min="0" placeholder="名额" />
                          <el-button type="primary" size="small" :loading="schedSaving" @click="batchSchedWeekdays">应用到本月</el-button>
                        </div>
                      </div>
                    </div>

                    <div class="full" v-if="schedTab==='day'">
                      <div v-if="!schedDayDetail" class="muted">请先在月历中选择一天</div>
                      <div v-else>
                        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
                          <b>{{ schedDayDetail.day.date }}</b>
                          <el-switch v-model="schedDayDetail.day.open" active-text="开放预约" inactive-text="关闭" />
                          <span>名额</span>
                          <el-input-number v-model="schedDayDetail.day.capacity" :min="0" />
                          <el-input v-model="schedDayDetail.day.note" placeholder="备注" style="max-width:280px" />
                          <el-button type="success" :loading="schedSaving" @click="saveSchedDay">保存当日</el-button>
                        </div>
                        <table class="data" style="width:100%">
                          <thead><tr><th>点位</th><th>开放</th><th>内容版本</th></tr></thead>
                          <tbody>
                            <tr v-for="sp in (schedDayDetail.day.spots||[])" :key="sp.routePointId">
                              <td>{{ sp.title || sp.routePointId }}</td>
                              <td><el-switch v-model="sp.enabled" /></td>
                              <td>
                                <el-select v-model="sp.contentVersionId" clearable placeholder="项目默认" style="min-width:200px">
                                  <el-option v-for="v in (schedDayDetail.contentVersions||schedVersions).filter(x => !x.routePointId || x.routePointId===sp.routePointId)" :key="v.id" :label="v.name" :value="v.id" />
                                </el-select>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div class="full" v-if="schedTab==='versions'">
                      <div style="display:flex;gap:8px;margin-bottom:8px">
                        <el-button size="small" @click="snapshotSchedVersions">从点位快照默认版</el-button>
                        <el-button size="small" @click="resetSchedVersionForm">新建</el-button>
                        <el-button size="small" @click="loadSchedVersions">刷新</el-button>
                      </div>
                      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                        <div>
                          <table class="data" style="width:100%">
                            <thead><tr><th>名称</th><th>点位</th><th></th></tr></thead>
                            <tbody>
                              <tr v-for="v in schedVersions" :key="v.id">
                                <td>{{ v.name }}<span v-if="v.isDefault" class="muted"> ·默认</span></td>
                                <td>{{ v.routePointId || '通用' }}</td>
                                <td>
                                  <el-button link type="primary" @click="editSchedVersion(v)">编辑</el-button>
                                  <el-button link type="danger" @click="deleteSchedVersion(v)">删</el-button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px">
                          <div><label>名称</label><el-input v-model="schedVersionForm.name" /></div>
                          <div style="margin-top:6px"><label>绑定点位 ID（可空=通用）</label><el-input v-model="schedVersionForm.routePointId" /></div>
                          <div style="margin-top:6px"><label>备注</label><el-input v-model="schedVersionForm.note" /></div>
                          <div style="margin-top:6px"><label>stepsJson</label><el-input v-model="schedVersionForm.stepsJsonText" type="textarea" :rows="10" /></div>
                          <el-button style="margin-top:8px" type="primary" :loading="schedSaving" @click="saveSchedVersion">保存版本</el-button>
                        </div>
                      </div>
                    </div>

                    <div class="full" v-if="schedTab==='copy'">
                      <div style="margin-bottom:12px">
                        <b>复制单日 → 日期范围</b>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:center">
                          <el-input v-model="schedCopySource" placeholder="源日期 YYYY-MM-DD" style="width:160px" />
                          <el-input v-model="schedCopyTargetFrom" placeholder="目标起" style="width:140px" />
                          <el-input v-model="schedCopyTargetTo" placeholder="目标止" style="width:140px" />
                          <el-button type="primary" size="small" :loading="schedSaving" @click="copySchedDayRange">复制</el-button>
                        </div>
                      </div>
                      <div>
                        <b>复制整周</b>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;align-items:center">
                          <el-input v-model="schedCopyFromWeek" placeholder="源周起始(周一)" style="width:160px" />
                          <el-input v-model="schedCopyToWeek" placeholder="目标周起始" style="width:160px" />
                          <el-button type="primary" size="small" :loading="schedSaving" @click="copySchedWeek">复制周</el-button>
                        </div>
                      </div>
                    </div>

                    <div class="full" v-if="schedTab==='logs'">
                      <el-button size="small" @click="loadSchedLogs">刷新</el-button>
                      <table class="data" style="width:100%;margin-top:8px">
                        <thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>详情</th></tr></thead>
                        <tbody>
                          <tr v-for="lg in schedLogs" :key="lg.id">
                            <td>{{ lg.createdAt }}</td>
                            <td>{{ lg.actorName || lg.actorId || '—' }}</td>
                            <td>{{ lg.action }}</td>
                            <td><code style="font-size:11px">{{ JSON.stringify(lg.payload) }}</code></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  active,
  batchSchedWeekdays,
  copySchedDayRange,
  copySchedWeek,
  deleteSchedVersion,
  editSchedVersion,
  loadSchedLogs,
  loadSchedMonth,
  loadSchedVersions,
  openSchedDay,
  resetSchedVersionForm,
  saveSchedDay,
  saveSchedVersion,
  schedBatchCapacity,
  schedBatchOpen,
  schedBatchWeekdays,
  schedCalMonth,
  schedCopyFromWeek,
  schedCopySource,
  schedCopyTargetFrom,
  schedCopyTargetTo,
  schedCopyToWeek,
  schedDayDetail,
  schedLoading,
  schedLogs,
  schedMonthCells,
  schedSaving,
  schedTab,
  schedVersionForm,
  schedVersions,
  seedSchedHorizon,
  shiftSchedMonth,
  snapshotSchedVersions
} = inject("console")
</script>
