<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">MALL ORDERS</div>
                    <h3>文创订单</h3>
                    <p>发货、取消与售后处理。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ moStats.unpaid }}</b><span>待支付</span></div>
                    <div><b>{{ moStats.paid }}</b><span>待发货</span></div>
                    <div><b>{{ moStats.shipped }}</b><span>待收货</span></div>
                    <div><b>{{ moStats.done }}</b><span>已完成</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="moKeyword" placeholder="订单号 / 手机 / 研学号" clearable @keyup.enter="loadMallOrders()" />
                  <el-button type="primary" :loading="moLoading" @click="loadMallOrders()">查询</el-button>
                  <button class="chip" :class="{ on: moStatus==='all' }" @click="moStatus='all'; loadMallOrders()">全部</button>
                  <button class="chip" :class="{ on: moStatus==='UNPAID' }" @click="moStatus='UNPAID'; loadMallOrders()">待支付</button>
                  <button class="chip" :class="{ on: moStatus==='PAID' }" @click="moStatus='PAID'; loadMallOrders()">待发货</button>
                  <button class="chip" :class="{ on: moStatus==='UNRECEIVED' }" @click="moStatus='UNRECEIVED'; loadMallOrders()">待收货</button>
                  <button class="chip" :class="{ on: moStatus==='COMPLETED' }" @click="moStatus='COMPLETED'; loadMallOrders()">已完成</button>
                  <button class="chip" :class="{ on: moStatus==='CANCELLED' }" @click="moStatus='CANCELLED'; loadMallOrders()">已取消</button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="moSel.length">
                    <span>已选 {{ moSel.length }} 条</span>
                    <el-button size="small" @click="batchDeleteByUrl('/api/v1/admin/orders/batch-delete', 'mo', loadMallOrders)">删除所选</el-button>
                  </div>
                  <div v-if="moLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!filteredMo.length" class="empty-board"><b>没有订单</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('mo', filteredMo)" :indeterminate="selSome('mo', filteredMo)" @change="(v)=>toggleSelAll('mo', filteredMo, v)" @click.stop /></th>
                      <th>订单</th><th>学员</th><th>金额</th><th>状态</th><th>下单</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ picked: selHas('mo', o.id) }" v-for="o in filteredMo" :key="o.id" @click="openMallOrder(o)">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('mo', o.id)" @change="(v)=>toggleSelOne('mo', o.id, v)" />
                        </td>
                        <td>
                          <div class="name">{{ orderGoods(o) }}</div>
                          <div class="sub">{{ o.orderNo }}</div>
                        </td>
                        <td>{{ (o.user && (o.user.nickname || o.user.studyNo)) || o.address && o.address.receiver || '—' }}</td>
                        <td>{{ moneyText(o.amount) }}</td>
                        <td><span class="tag" :class="String(o.status).toUpperCase()==='COMPLETED' ? 'ok' : (String(o.status).toUpperCase().indexOf('CANCEL')>=0 ? 'off' : 'warn')">{{ orderLabel(o.status) }}</span></td>
                        <td>{{ fmtTime(o.createdAt) }}</td>
                        <td><span class="link-btn">打开</span></td>
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
  filteredMo,
  fmtTime,
  loadMallOrders,
  moKeyword,
  moLoading,
  moSel,
  moStats,
  moStatus,
  moneyText,
  openMallOrder,
  orderGoods,
  orderLabel,
  selAllOn,
  selHas,
  selSome,
  toggleSelAll,
  toggleSelOne
} = inject("console")
</script>
