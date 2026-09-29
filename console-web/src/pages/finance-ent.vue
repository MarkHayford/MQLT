<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">FINANCE</div>
                    <h3>企业流水</h3>
                    <p>按项目查看本月入账，点开可看这笔对应的预约或订单财务细节。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ moneyYuan(finWallet.available) }}</b><span>可提现</span></div>
                    <div><b>{{ moneyYuan(finWallet.pending) }}</b><span>审批中</span></div>
                    <div><b>{{ moneyYuan(finWallet.withdrawn) }}</b><span>已打款</span></div>
                    <div><b>{{ moneyYuan(finSummary.enterpriseNet) }}</b><span>本月应收</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="finMonth" placeholder="2026-09" style="width:140px" @keyup.enter="loadEntFinance()" />
                  <el-button type="primary" :loading="finLoading" @click="loadEntFinance()">查询</el-button>
                  <button class="chip" :class="{ on: finKind==='all' }" @click="finKind='all'; loadEntFinance()">全部</button>
                  <button class="chip" :class="{ on: finKind==='study' }" @click="finKind='study'; loadEntFinance()">预约</button>
                  <button class="chip" :class="{ on: finKind==='mall' }" @click="finKind='mall'; loadEntFinance()">订单</button>
                  <span class="sub">抽成 研学 {{ finRates.studyCommission }}% · 文创 {{ finRates.mallCommission }}%</span>
                </div>
                <div class="fin-flow" style="margin:0 0 4px">
                  <div class="fin-step"><b>学员付款</b><span>预约 / 文创订单支付后入账</span></div>
                  <div class="fin-arrow">→</div>
                  <div class="fin-step"><b>拆分抽成</b><span>按企业抽成比例拆给平台</span></div>
                  <div class="fin-arrow">→</div>
                  <div class="fin-step"><b>企业应收</b><span>可在提现申请页发起打款</span></div>
                </div>
                <div v-if="finLoading" class="empty-board"><b>正在载入</b></div>
                <div v-else-if="!finGroups.length" class="empty-board"><b>本月没有入账流水</b><span class="sub" style="display:block;margin-top:8px">有预约或文创订单支付后会出现在这里</span></div>
                <div v-else>
                  <div class="sheet" v-for="g in finGroups" :key="g.id" style="margin-bottom:16px">
                    <div class="sheet-hd">
                      <div class="fin-group-hd">
                        <div class="thumb">
                          <img v-if="finCoverSrc(g.coverUrl)" :src="finCoverSrc(g.coverUrl)" alt="" />
                          <span v-else>项</span>
                        </div>
                        <div>
                          <h4>{{ g.title }}</h4>
                          <p>预约 {{ moneyYuan(g.study) }} · 订单 {{ moneyYuan(g.mall) }} · 企业应收 {{ moneyYuan(g.net) }} · {{ g.items.length }} 笔</p>
                        </div>
                      </div>
                    </div>
                    <div class="sheet-bd" style="padding:0">
                      <div class="fin-rich-list">
                        <div class="fin-rich" v-for="row in g.items" :key="row.kind+row.id" @click="openFinDetail(row)">
                          <div class="thumb">
                            <img v-if="finCoverSrc(row.coverUrl)" :src="finCoverSrc(row.coverUrl)" alt="" />
                            <span v-else>{{ row.kind === 'mall' ? '订' : '约' }}</span>
                          </div>
                          <div class="meta">
                            <div class="name">{{ row.title }}</div>
                            <div class="sub">{{ row.subtitle || row.userName || row.refNo }}</div>
                            <div class="tags">
                              <span class="tag" :class="row.kind==='mall' ? 'gold' : 'ok'">{{ row.kindLabel || (row.kind==='mall' ? '订单' : '预约') }}</span>
                              <span class="tag">{{ row.statusLabel }}</span>
                              <span class="tag warn">{{ fmtTime(row.paidAt) }}</span>
                            </div>
                          </div>
                          <div class="amt">
                            <b>{{ moneyYuan(row.amount) }}</b>
                            <div class="net">应收 {{ moneyYuan(row.enterpriseNet != null ? row.enterpriseNet : row.amount) }}</div>
                            <span class="go">查看财务 ›</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  finCoverSrc,
  finGroups,
  finKind,
  finLoading,
  finMonth,
  finRates,
  finSummary,
  finWallet,
  fmtTime,
  loadEntFinance,
  moneyYuan,
  openFinDetail,
  statusLabel
} = inject("console")
</script>
