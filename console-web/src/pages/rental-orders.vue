<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">RENTAL</div>
                    <h3>租车</h3>
                    <p>抢单协商 → 确认价支付 → 履约（出车/到达/行程/完成）。参考价仅作参考，成交价以协商锁定为准。聊天只读。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ roStats.open }}</b><span>派单中</span></div>
                    <div><b>{{ roStats.negotiating }}</b><span>协商中</span></div>
                    <div><b>{{ roStats.priceConfirmed || 0 }}</b><span>待支付</span></div>
                    <div><b>{{ roStats.paid || 0 }}</b><span>已支付</span></div>
                    <div><b>{{ roStats.fulfilling || 0 }}</b><span>履约中</span></div>
                    <div><b>{{ roStats.completed || 0 }}</b><span>已完成</span></div>
                  </div>
                </div>
                <div>
                  <div class="users-bar">
                    <el-input class="users-search" v-model="roKeyword" placeholder="单号 / 上车点 / 备注" clearable @keyup.enter="roPage=1; loadRentalOrders()" />
                    <el-button type="primary" :loading="roLoading" @click="roPage=1; loadRentalOrders()">查询</el-button>
                    <button class="chip" :class="{ on: roStatus==='all' }" @click="roStatus='all'; roPage=1; loadRentalOrders()">全部</button>
                    <button class="chip" :class="{ on: roStatus==='OPEN' }" @click="roStatus='OPEN'; roPage=1; loadRentalOrders()">派单中</button>
                    <button class="chip" :class="{ on: roStatus==='NEGOTIATING' }" @click="roStatus='NEGOTIATING'; roPage=1; loadRentalOrders()">协商中</button>
                    <button class="chip" :class="{ on: roStatus==='PRICE_CONFIRMED' }" @click="roStatus='PRICE_CONFIRMED'; roPage=1; loadRentalOrders()">待支付</button>
                    <button class="chip" :class="{ on: roStatus==='PAID' }" @click="roStatus='PAID'; roPage=1; loadRentalOrders()">已支付</button>
                    <button class="chip" :class="{ on: roStatus==='EN_ROUTE' }" @click="roStatus='EN_ROUTE'; roPage=1; loadRentalOrders()">出车中</button>
                    <button class="chip" :class="{ on: roStatus==='IN_TRIP' }" @click="roStatus='IN_TRIP'; roPage=1; loadRentalOrders()">行程中</button>
                    <button class="chip" :class="{ on: roStatus==='COMPLETED' }" @click="roStatus='COMPLETED'; roPage=1; loadRentalOrders()">已完成</button>
                    <button class="chip" :class="{ on: roStatus==='CANCELLED' }" @click="roStatus='CANCELLED'; roPage=1; loadRentalOrders()">已取消</button>
                  </div>
                  <div class="users-table">
                    <div v-if="roLoading" class="empty-board"><b>正在载入</b></div>
                    <div v-else-if="!roList.length" class="empty-board"><b>暂无租车单</b></div>
                    <table v-else class="grid">
                      <thead><tr>
                        <th>单号</th><th>项目</th><th>出行</th><th>人数</th><th>上车点</th><th>司机</th><th>报价/成交</th><th>状态</th><th>创建时间</th><th></th>
                      </tr></thead>
                      <tbody>
                        <tr class="row" v-for="r in roList" :key="r.id">
                          <td>
                            <div class="name">{{ r.orderNo }}</div>
                            <div class="sub">{{ r.remark || '' }}</div>
                          </td>
                          <td>{{ r.projectTitle || r.projectId || '—' }}</td>
                          <td>{{ r.travelDateText || '—' }}</td>
                          <td>{{ r.passengerCount }}人</td>
                          <td>{{ r.pickupAddress || '—' }}</td>
                          <td>{{ r.driverName || (r.status==='OPEN' ? '待抢' : '—') }}</td>
                          <td>
                            <div v-if="r.offeredPrice!=null">报价 ¥{{ Number(r.offeredPrice).toFixed(2) }}</div>
                            <div v-if="r.agreedPrice!=null">成交 ¥{{ Number(r.agreedPrice).toFixed(2) }}</div>
                            <div v-if="r.offeredPrice==null && r.agreedPrice==null">—</div>
                          </td>
                          <td><span class="tag" :class="r.status==='OPEN' ? 'warn' : (r.status==='NEGOTIATING' || r.status==='PRICE_CONFIRMED' || r.status==='PAID' ? 'ok' : 'off')">{{ r.statusLabel }}</span></td>
                          <td>{{ fmtTime(r.createdAt) }}</td>
                          <td><el-button link type="primary" @click.stop="openRentalChat(r)">聊天</el-button></td>
                        </tr>
                      </tbody>
                    </table>
                    <div style="padding:12px 16px" v-if="roTotal > 20">
                      <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="roPage" :total="roTotal" @current-change="(n)=>{ roPage=n; loadRentalOrders() }" />
                    </div>
                  </div>
                </div>
              
                <el-dialog v-model="roChatOpen" title="租车协商（只读）" width="520px">
                  <div v-if="roChatLoading">加载中…</div>
                  <div v-else>
                    <div style="margin-bottom:8px;color:#666" v-if="roChatOrder">
                      {{ roChatOrder.orderNo || '' }} · {{ roChatOrder.statusLabel || roChatOrder.status || '' }}
                      <span v-if="roChatOrder.agreedPrice!=null"> · 成交 ¥{{ Number(roChatOrder.agreedPrice).toFixed(2) }}</span>
                      <span v-else-if="roChatOrder.offeredPrice!=null"> · 报价 ¥{{ Number(roChatOrder.offeredPrice).toFixed(2) }}</span>
                    </div>
                    <div style="max-height:360px;overflow:auto;background:#F5F7FB;padding:12px;border-radius:8px">
                      <div v-for="m in roChatItems" :key="m.id" style="margin-bottom:10px">
                        <div style="font-size:12px;color:#888">{{ m.senderTypeLabel }} · {{ m.timeText }}</div>
                        <div style="white-space:pre-wrap">{{ m.content }}</div>
                      </div>
                      <div v-if="!roChatItems.length" style="color:#999">暂无消息</div>
                    </div>
                  </div>
                </el-dialog>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  fmtTime,
  loadRentalOrders,
  openRentalChat,
  projectTitle,
  roChatItems,
  roChatLoading,
  roChatOpen,
  roChatOrder,
  roKeyword,
  roList,
  roLoading,
  roPage,
  roStats,
  roStatus,
  roTotal,
  statusLabel
} = inject("console")
</script>
