<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">PLATFORM LEDGER</div>
                    <h3>财务</h3>
                    <p>{{ finMonth }} · 学员付款后拆成企业抽成、租车 GMV / 平台租车抽成。</p>
                  </div>
                  <div class="users-bar" style="background:transparent;border:0;padding:0">
                    <el-input class="users-search" v-model="finMonth" placeholder="2026-09" style="width:140px" @keyup.enter="loadPlatFinance()" />
                    <el-button type="primary" :loading="platFinLoading" @click="loadPlatFinance()">查询</el-button>
                    <el-button @click="openPage('withdraw-review')">提现审批</el-button>
                    <el-button @click="openPage('commission')">设抽成</el-button>
                  </div>
                </div>
                <div class="fin-flow">
                  <div class="fin-step"><b>1. 学员付款</b><span>研学预约、文创下单、租车加价，钱先到平台。</span></div>
                  <div class="fin-arrow">→</div>
                  <div class="fin-step"><b>2. 抽成留存</b><span>按企业/司机比例留下研学、文创抽成；租车整笔归平台。</span></div>
                  <div class="fin-arrow">→</div>
                  <div class="fin-step"><b>3. 企业应收</b><span>研学、文创货款减去抽成，记在各企业财务里待结算。</span></div>
                  <div class="fin-arrow">→</div>
                  <div class="fin-step"><b>4. 司机到账</b><span>租车完成后，司机钱包入账 = 车费 × (1 − 抽成)。</span></div>
                </div>
                <div class="fin-layout" :style="{ '--fin-right-w': finRightWidth + 'px' }">
                  <div class="fin-board">
                    <div class="fin-kicker">本月平台进账</div>
                    <div class="fin-tiles">
                      <div class="fin-tile">
                        <div class="fin-ico gold"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v8M9.5 10h4c1.2 0 2 .7 2 1.7s-.8 1.7-2 1.7h-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div>
                        <div><b>{{ moneyYuan((platFin.summary && platFin.summary.platformTotal) || 0) }}</b><span>平台收入</span></div>
                      </div>
                      <div class="fin-tile">
                        <div class="fin-ico"><svg viewBox="0 0 24 24" fill="none"><path d="M5 19V6.5L12 3.8 19 6.5V19" stroke="currentColor" stroke-width="1.8"/><path d="M9 19v-6h6v6" stroke="currentColor" stroke-width="1.8"/></svg></div>
                        <div><b>{{ moneyYuan((platFin.summary && platFin.summary.commissionTotal) || 0) }}</b><span>企业抽成</span></div>
                      </div>
                      <div class="fin-tile">
                        <div class="fin-ico clay"><svg viewBox="0 0 24 24" fill="none"><path d="M4.5 16.5h15l.8-4.2c.1-.6-.3-1.3-1-1.3H4.7c-.7 0-1.1.7-1 1.3l.8 4.2Z" stroke="currentColor" stroke-width="1.8"/><circle cx="7.5" cy="16.5" r="1.5" stroke="currentColor" stroke-width="1.8"/><circle cx="16.5" cy="16.5" r="1.5" stroke="currentColor" stroke-width="1.8"/></svg></div>
                        <div><b>{{ moneyYuan((platFin.summary && (platFin.summary.rentalCommission != null ? platFin.summary.rentalCommission : platFin.summary.rentalIncome)) || 0) }}</b><span>租车抽成</span></div>
                      </div>
                      <div class="fin-tile">
                        <div class="fin-ico moss"><svg viewBox="0 0 24 24" fill="none"><path d="M4 18h16M7 18V8h10v10M9.5 8V5.5h5V8" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></div>
                        <div><b>{{ moneyYuan((platFin.summary && platFin.summary.enterprisePayable) || 0) }}</b><span>应付企业</span></div>
                      </div>
                    </div>
                  </div>
                  <div class="mqlt-vsplit" :class="{ on: mqltSplitHover==='fin' }" title="拖动调整图表列宽" @mousedown="startFinRightResize"></div>
                  <div class="fin-chart">
                    <div class="fin-donut" :style="{ background: platShare.donut }"></div>
                    <div class="fin-legend">
                      <div class="fin-kicker">收入构成</div>
                      <div class="one"><span><i class="fin-dot" style="background:#1A73E8"></i>研学抽成 {{ platShare.studyPct }}%</span><b>{{ moneyYuan(platShare.study) }}</b></div>
                      <div class="one"><span><i class="fin-dot" style="background:#6B7280"></i>文创抽成 {{ platShare.mallPct }}%</span><b>{{ moneyYuan(platShare.mall) }}</b></div>
                      <div class="one"><span><i class="fin-dot" style="background:#DC2626"></i>租车抽成 {{ platShare.rentalPct }}%</span><b>{{ moneyYuan(platShare.rental) }}</b></div>
                      <div class="one"><span><i class="fin-dot" style="background:#E5E7EB"></i>租车 GMV（代收）</span><b>{{ moneyYuan(platShare.rentalGmv) }}</b></div>
                    </div>
                  </div>
                </div>
                <div class="users-bar">
                  <button class="chip" :class="{ on: platFinTab==='enterprises' }" @click="platFinTab='enterprises'">企业分账</button>
                  <button class="chip" :class="{ on: platFinTab==='rental' }" @click="platFinTab='rental'">租车流水</button>
                </div>
                <div class="users-table">
                  <div v-if="platFinLoading" class="empty-board"><b>正在载入</b></div>
                  <template v-else-if="platFinTab==='enterprises'">
                    <div v-if="!(platFin.enterprises || []).length" class="empty-board"><b>本月没有企业入账</b></div>
                    <div v-else class="fin-bars" style="padding:16px 18px">
                      <div class="fin-bar-row" v-for="e in platFin.enterprises" :key="'pf-'+e.id">
                        <div class="meta">
                          <span>{{ e.name }} · 抽成 {{ moneyYuan(e.platformTake) }} / 企业 {{ moneyYuan(e.enterpriseNet) }}</span>
                          <span class="link-btn" @click="enterEntWorkspace(e); openPage('finance')">企业财务</span>
                        </div>
                        <div class="fin-bar">
                          <i class="cut" :style="{ width: (Number(e.platformTake||0) / platBarMax * 100) + '%' }"></i>
                          <i class="keep" :style="{ width: (Number(e.enterpriseNet||0) / platBarMax * 100) + '%' }"></i>
                        </div>
                      </div>
                    </div>
                    <table class="grid">
                      <thead><tr><th>企业</th><th>研学入账</th><th>文创入账</th><th>抽成</th><th>企业应收</th></tr></thead>
                      <tbody>
                        <tr class="row" v-for="e in platFin.enterprises" :key="'pft-'+e.id" @click="enterEntWorkspace(e); openPage('finance')">
                          <td>
                            <div class="name">{{ e.name }}</div>
                            <div class="sub">研学 {{ (e.rates && e.rates.studyCommission) || 0 }}% · 文创 {{ (e.rates && e.rates.mallCommission) || 0 }}%</div>
                          </td>
                          <td>{{ moneyYuan(e.studyGross) }}</td>
                          <td>{{ moneyYuan(e.mallGross) }}</td>
                          <td>{{ moneyYuan(e.platformTake) }}</td>
                          <td>{{ moneyYuan(e.enterpriseNet) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                  <template v-else-if="platFinTab==='rental'">
                    <div v-if="!(platFin.rentalItems || []).length" class="empty-board"><b>本月没有租车流水</b></div>
                    <table v-else class="grid">
                      <thead><tr><th>行程</th><th>企业</th><th>GMV</th><th>平台抽成</th><th>司机净值</th><th>状态</th><th>入账时间</th></tr></thead>
                      <tbody>
                        <tr class="row" v-for="row in platFin.rentalItems" :key="'rt-'+row.id">
                          <td>
                            <div class="name">{{ row.title }}</div>
                            <div class="sub">{{ row.userName || row.refNo }}</div>
                          </td>
                          <td>{{ row.enterpriseName || '—' }}</td>
                          <td>{{ moneyYuan(row.gmv != null ? row.gmv : row.amount) }}</td>
                          <td>{{ moneyYuan(row.platformCut || 0) }}</td>
                          <td>{{ moneyYuan(row.driverNet != null ? row.driverNet : row.amount) }}</td>
                          <td>{{ row.statusLabel }}</td>
                          <td>{{ fmtTime(row.paidAt) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </template>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  enterEntWorkspace,
  finMonth,
  finRightWidth,
  fmtTime,
  loadPlatFinance,
  moneyYuan,
  mqltSplitHover,
  openPage,
  platBarMax,
  platFin,
  platFinLoading,
  platFinTab,
  platShare,
  startFinRightResize,
  statusLabel
} = inject("console")
</script>
