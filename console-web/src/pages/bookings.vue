<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">BOOKINGS</div>
                    <h3>预约订单</h3>
                    <p>履约处理、今日核销与代客预约。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ bkStats.unpaid }}</b><span>待支付</span></div>
                    <div><b>{{ bkStats.booked }}</b><span>待出行</span></div>
                    <div><b>{{ bkStats.completed }}</b><span>已完成</span></div>
                    <div><b>{{ bkStats.cancelled }}</b><span>已取消</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="bkKeyword" clearable @keyup.enter="bkPage=1; loadBookings()" />
                  <el-select v-if="!inProjWorkspace" v-model="bkProjectId" clearable placeholder="全部项目" style="width:180px" @change="bkPage=1; loadBookings()">
                    <el-option v-for="p in projList" :key="p.id" :label="p.title" :value="p.id" />
                  </el-select>
                  <el-button type="primary" :loading="bkLoading" @click="bkPage=1; loadBookings()">查询</el-button>
                  <button class="chip" :class="{ on: bkFilter==='all' }" @click="bkFilter='all'; bkPage=1; loadBookings()">全部</button>
                  <button class="chip" :class="{ on: bkFilter==='unpaid' }" @click="bkFilter='unpaid'; bkPage=1; loadBookings()">待支付</button>
                  <button class="chip" :class="{ on: bkFilter==='booked' }" @click="bkFilter='booked'; bkPage=1; loadBookings()">待出行</button>
                  <button class="chip" :class="{ on: bkFilter==='today' }" @click="bkFilter='today'; bkPage=1; loadBookings()">今日核销</button>
                  <button class="chip" :class="{ on: bkFilter==='completed' }" @click="bkFilter='completed'; bkPage=1; loadBookings()">已完成</button>
                  <button class="chip" :class="{ on: bkFilter==='cancelled' }" @click="bkFilter='cancelled'; bkPage=1; loadBookings()">已取消</button>
                  <button class="chip" :class="{ on: bkGroupMode==='byDate' }" @click="bkGroupMode='byDate'">按预约日</button>
                  <button class="chip" :class="{ on: bkGroupMode==='byCreated' }" @click="bkGroupMode='byCreated'; bkDateFilter=''; loadBookings()">按下单时间</button>
                  <template v-if="bkGroupMode==='byDate'">
                    <el-date-picker v-model="bkDateFilter" type="date" value-format="YYYY-MM-DD" placeholder="指定预约日" clearable style="width:150px" @change="bkPage=1; loadBookings()" />
                    <button class="chip" :class="{ on: !bkDateFilter }" @click="clearBkDateFilter">全部日期</button>
                    <button class="chip" v-for="c in bkDateChips" :key="'bkd-'+c.key" :class="{ on: bkDateFilter===c.key }" @click="setBkDateFilter(c.key)">{{ c.label }}</button>
                  </template>
                  <el-button @click="openBkCreate">代客预约</el-button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="bkSel.length">
                    <span>已选 {{ bkSel.length }} 条</span>
                    <el-button size="small" @click="batchDeleteByUrl('/api/v1/admin/bookings/batch-delete', 'bk', loadBookings)">删除所选</el-button>
                  </div>
                  <div v-if="bkLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!bkList.length" class="empty-board"><b>没有预约</b></div>
                  <template v-else>
                    <div v-for="sec in bkGroupedSections" :key="'bksec-'+sec.key" style="margin-bottom:14px">
                      <div v-if="bkGroupMode==='byDate'" style="padding:10px 16px;font-weight:700;color:#1A1A1A;background:#F5F7FB;border-bottom:1px solid #E5E7EB">{{ sec.title }} · {{ sec.count }} 单</div>
                      <div v-if="bkGroupMode==='byDate' && bkDateFilter && !sec.items.length" class="empty-board"><b>该日没有预约</b><div class="sub" style="margin-top:6px">清除日期筛选可查看全部分组</div></div>
                      <table class="grid" v-if="sec.items.length || bkGroupMode!=='byDate'">
                        <thead><tr>
                          <th class="check"><el-checkbox :model-value="selAllOn('bk', sec.items)" :indeterminate="selSome('bk', sec.items)" @change="(v)=>toggleSelAll('bk', sec.items, v)" @click.stop /></th>
                          <th>学员</th><th>项目</th><th>状态</th><th>金额</th><th>行程</th><th>交通</th><th>司机</th><th>下单</th><th></th>
                        </tr></thead>
                        <tbody>
                          <tr class="row" :class="{ picked: selHas('bk', b.id) }" v-for="b in sec.items" :key="b.id" @click="openBooking(b)">
                            <td class="check" @click.stop>
                              <el-checkbox :model-value="selHas('bk', b.id)" @change="(v)=>toggleSelOne('bk', b.id, v)" />
                            </td>
                            <td>
                              <div class="name">{{ (b.user && (b.user.realName || b.user.nickname)) || b.participantName }} <span v-if="multiDayBadge(b)" class="tag warn" style="margin-left:4px">{{ multiDayBadge(b) }}</span></div>
                              <div class="sub">{{ (b.user && b.user.studyNo) || b.participantPhone }}</div>
                            </td>
                            <td>{{ (b.project && b.project.title) || '—' }}</td>
                            <td><span class="tag" :class="String(b.status).toLowerCase()==='completed' ? 'ok' : (String(b.status).toLowerCase().indexOf('cancel')>=0 ? 'off' : 'warn')">{{ bookingLabel(b.status) }}</span></td>
                            <td>{{ moneyText(b.amount) }}</td>
                            <td>{{ tripLabel(b) }}</td>
                            <td>{{ rideLabel(b) }}</td>
                            <td>{{ driverLabel(b) }}</td>
                            <td>{{ fmtTime(b.createdAt) }}</td>
                            <td><span class="link-btn">打开</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </template>
                  <div style="padding:12px 16px" v-if="bkTotal > 20">
                    <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="bkPage" :total="bkTotal" @current-change="(n)=>{ bkPage=n; loadBookings() }" />
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  batchDeleteByUrl,
  bkDateChips,
  bkDateFilter,
  bkFilter,
  bkGroupMode,
  bkGroupedSections,
  bkKeyword,
  bkList,
  bkLoading,
  bkPage,
  bkProjectId,
  bkSel,
  bkStats,
  bkTotal,
  bookingLabel,
  clearBkDateFilter,
  driverLabel,
  fmtTime,
  inProjWorkspace,
  loadBookings,
  moneyText,
  multiDayBadge,
  openBkCreate,
  openBooking,
  projList,
  rideLabel,
  selAllOn,
  selHas,
  selSome,
  setBkDateFilter,
  toggleSelAll,
  toggleSelOne,
  tripLabel
} = inject("console")
</script>
