<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">PAYOUT</div>
                    <h3>提现审批</h3>
                    <p>企业货款和司机车费的提现申请，通过后按打款信息转账。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ ewdPlatPending || 0 }}</b><span>企业待审</span></div>
                    <div><b>{{ wdStats.pending || 0 }}</b><span>司机待审</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <button class="chip" :class="{ on: wdReviewTab==='enterprise' }" @click="wdReviewTab='enterprise'; loadPlatEwd()">企业提现 {{ ewdPlatPending ? '('+ewdPlatPending+')' : '' }}</button>
                  <button class="chip" :class="{ on: wdReviewTab==='driver' }" @click="wdReviewTab='driver'; loadDriverWithdrawals()">司机提现 {{ wdStats.pending ? '('+wdStats.pending+')' : '' }}</button>
                </div>
                <div class="users-table" v-if="wdReviewTab==='enterprise'">
                  <div class="users-bar" style="border:0;border-radius:0">
                    <button class="chip" :class="{ on: ewdPlatStatus==='PENDING' }" @click="ewdPlatStatus='PENDING'; loadPlatEwd()">待审</button>
                    <button class="chip" :class="{ on: ewdPlatStatus==='PAID' }" @click="ewdPlatStatus='PAID'; loadPlatEwd()">已打款</button>
                    <button class="chip" :class="{ on: ewdPlatStatus==='REJECTED' }" @click="ewdPlatStatus='REJECTED'; loadPlatEwd()">已拒绝</button>
                    <button class="chip" :class="{ on: ewdPlatStatus==='all' }" @click="ewdPlatStatus='all'; loadPlatEwd()">全部</button>
                  </div>
                  <div v-if="!ewdPlat.length" class="empty-board"><b>没有企业提现申请</b></div>
                  <table v-else class="grid">
                    <thead><tr><th>企业</th><th>金额</th><th>打款信息</th><th>状态</th><th>申请时间</th><th></th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="w in ewdPlat" :key="'ew-'+w.id">
                        <td>{{ w.enterpriseName || '—' }}</td>
                        <td>{{ moneyYuan(w.amount) }}</td>
                        <td>
                          <div class="name">{{ w.bankName }} {{ w.accountNo }}</div>
                          <div class="sub">{{ w.accountName }} {{ w.note }}</div>
                        </td>
                        <td><span class="tag" :class="w.status==='PAID' ? 'ok' : (w.status==='REJECTED' ? 'off' : 'warn')">{{ w.statusLabel }}</span></td>
                        <td>{{ fmtTime(w.createdAt) }}</td>
                        <td>
                          <span class="link-btn" v-if="w.status==='PENDING'" @click="reviewEntWithdraw(w, 'approve')">通过打款</span>
                          <span class="link-btn" v-if="w.status==='PENDING'" @click="reviewEntWithdraw(w, 'reject')" style="margin-left:8px">拒绝</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="users-table" v-else>
                  <div class="users-bar" style="border:0;border-radius:0">
                    <button class="chip" :class="{ on: wdStatus==='PENDING' }" @click="wdStatus='PENDING'; loadDriverWithdrawals()">待审</button>
                    <button class="chip" :class="{ on: wdStatus==='PAID' }" @click="wdStatus='PAID'; loadDriverWithdrawals()">已到账</button>
                    <button class="chip" :class="{ on: wdStatus==='REJECTED' }" @click="wdStatus='REJECTED'; loadDriverWithdrawals()">已拒绝</button>
                    <button class="chip" :class="{ on: wdStatus==='all' }" @click="wdStatus='all'; loadDriverWithdrawals()">全部</button>
                  </div>
                  <div class="batch-bar" v-if="wdSel.length">
                    <span>已选 {{ wdSel.length }} 条</span>
                    <el-button size="small" @click="batchReviewWithdraws('approve')">通过</el-button>
                    <el-button size="small" @click="batchReviewWithdraws('reject')">拒绝</el-button>
                    <el-button size="small" @click="batchDeleteByUrl('/api/v1/admin/driver-withdrawals/batch-delete', 'wd', loadDriverWithdrawals)">删除所选</el-button>
                  </div>
                  <div v-if="wdLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!wdList.length" class="empty-board"><b>没有司机提现申请</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('wd', wdList)" :indeterminate="selSome('wd', wdList)" @change="(v)=>toggleSelAll('wd', wdList, v)" @click.stop /></th>
                      <th>司机</th><th>金额</th><th>渠道</th><th>状态</th><th>申请</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ picked: selHas('wd', w.id) }" v-for="w in wdList" :key="w.id">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('wd', w.id)" @change="(v)=>toggleSelOne('wd', w.id, v)" />
                        </td>
                        <td>
                          <div class="name">{{ w.driverName }}</div>
                          <div class="sub">{{ w.driverPhone }} · {{ w.plateNo }}</div>
                        </td>
                        <td>{{ w.amountText }}</td>
                        <td>{{ w.channel }}</td>
                        <td><span class="tag" :class="w.status==='PAID' ? 'ok' : (w.status==='REJECTED' ? 'off' : 'warn')">{{ w.statusLabel }}</span></td>
                        <td>{{ fmtTime(w.createdAt) }}</td>
                        <td>
                          <span class="link-btn" v-if="w.status==='PENDING'" @click.stop="reviewWithdraw(w,'approve')">通过</span>
                          <span class="link-btn" v-if="w.status==='PENDING'" @click.stop="reviewWithdraw(w,'reject')">拒绝</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  batchDeleteByUrl,
  batchReviewWithdraws,
  ewdPlat,
  ewdPlatPending,
  ewdPlatStatus,
  fmtTime,
  loadDriverWithdrawals,
  loadPlatEwd,
  moneyYuan,
  reviewEntWithdraw,
  reviewWithdraw,
  selAllOn,
  selHas,
  selSome,
  statusLabel,
  toggleSelAll,
  toggleSelOne,
  wdList,
  wdLoading,
  wdReviewTab,
  wdSel,
  wdStats,
  wdStatus
} = inject("console")
</script>
