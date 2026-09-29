<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">INVOICE</div>
                    <h3>电子发票</h3>
                    <p v-if="inEntWorkspace">本企业文创商城与研学预约的电子普票（企业开具）</p>
                    <p v-else>租车（平台开具）电子普票申请，人工上传 PDF 开具</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ invStats.pending }}</b><span>待开票</span></div>
                    <div><b>{{ invStats.issued }}</b><span>已开票</span></div>
                    <div><b>{{ invStats.rejected }}</b><span>已驳回</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <button class="chip" :class="{ on: invFilter==='all' }" @click="invFilter='all'; loadInvoices()">全部</button>
                  <button class="chip" :class="{ on: invFilter==='PENDING' }" @click="invFilter='PENDING'; loadInvoices()">待开票</button>
                  <button class="chip" :class="{ on: invFilter==='ISSUED' }" @click="invFilter='ISSUED'; loadInvoices()">已开票</button>
                  <button class="chip" :class="{ on: invFilter==='REJECTED' }" @click="invFilter='REJECTED'; loadInvoices()">已驳回</button>
                  <el-button type="primary" :loading="invLoading" @click="loadInvoices()">刷新</el-button>
                </div>
                <div class="users-table">
                  <div v-if="invLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!invList.length" class="empty-board"><b>暂无开票申请</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th>抬头</th><th>开票方</th><th>用户</th><th>金额</th><th>明细</th><th>状态</th><th>申请时间</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" v-for="row in invList" :key="row.id" @click="openInvoice(row)">
                        <td>
                          <div class="name">{{ row.titleName || '—' }}</div>
                          <div class="sub">{{ row.titleType === 'company' ? '企业' : '个人' }}{{ row.taxNo ? ' · ' + row.taxNo : '' }}</div>
                        </td>
                        <td>
                          <div class="name">{{ invIssuerLabel(row) }}</div>
                          <div class="sub">{{ (row.items || []).map(invSourceLabel).filter((v,i,a)=>a.indexOf(v)===i).join(' / ') || '—' }}</div>
                        </td>
                        <td>
                          <div class="name">{{ (row.user && row.user.nickname) || '—' }}</div>
                          <div class="sub">{{ invUserLine(row) }}</div>
                        </td>
                        <td><b>¥{{ row.amount }}</b></td>
                        <td>{{ row.itemCount || (row.items && row.items.length) || 0 }} 笔</td>
                        <td>
                          <span class="tag" :class="String(row.status).toUpperCase()==='PENDING' ? 'warn' : (String(row.status).toUpperCase()==='REJECTED' ? 'off' : 'ok')">{{ invoiceLabel(row.status) }}</span>
                        </td>
                        <td>{{ fmtTime(row.createdAt) }}</td>
                        <td><span class="link-btn">查看</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  fmtTime,
  inEntWorkspace,
  invFilter,
  invIssuerLabel,
  invList,
  invLoading,
  invSourceLabel,
  invStats,
  invUserLine,
  invoiceLabel,
  loadInvoices,
  openInvoice
} = inject("console")
</script>
