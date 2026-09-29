<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">FLEET</div>
                    <h3>司机档案</h3>
                    <p>人车一体，预约时按城市和座位数匹配。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ drvStats.online }}</b><span>出车中</span></div>
                    <div><b>{{ drvStats.busy }}</b><span>服务中</span></div>
                    <div><b>{{ drvStats.offline }}</b><span>收车</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="drvKeyword" placeholder="姓名 / 手机 / 车牌" clearable @keyup.enter="drvPage=1; loadDrivers()" />
                  <el-button type="primary" :loading="drvLoading" @click="drvPage=1; loadDrivers()">查询</el-button>
                  <button class="chip" :class="{ on: drvStatus==='all' }" @click="drvStatus='all'; drvPage=1; loadDrivers()">全部</button>
                  <button class="chip" :class="{ on: drvStatus==='ONLINE' }" @click="drvStatus='ONLINE'; drvPage=1; loadDrivers()">出车中</button>
                  <button class="chip" :class="{ on: drvStatus==='BUSY' }" @click="drvStatus='BUSY'; drvPage=1; loadDrivers()">服务中</button>
                  <button class="chip" :class="{ on: drvStatus==='OFFLINE' }" @click="drvStatus='OFFLINE'; drvPage=1; loadDrivers()">收车</button>
                  <el-button @click="openDriverCreate">录入司机</el-button>
                </div>
                <div class="users-table">
                  <div v-if="drvLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!drvList.length" class="empty-board"><b>还没有司机</b></div>
                  <table v-else class="grid">
                    <thead><tr><th>司机</th><th>车辆</th><th>城市</th><th>状态</th><th>余额</th><th></th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="d in drvList" :key="d.id" @click="openDriver(d)">
                        <td>
                          <div class="name">{{ d.realName }}</div>
                          <div class="sub">{{ d.phone }} · {{ d.studyNo || '未绑定研学号' }}</div>
                        </td>
                        <td>{{ d.vehicleName }} · {{ d.plateNo }} · {{ d.seatCount }}座</td>
                        <td>{{ d.city || '—' }}</td>
                        <td><span class="tag" :class="d.status==='ONLINE' ? 'ok' : (d.status==='OFFLINE' ? 'off' : 'warn')">{{ d.statusLabel }}</span></td>
                        <td>{{ moneyYuan(d.availableBalance) }}</td>
                        <td><span class="link-btn">打开</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <div style="padding:12px 16px" v-if="drvTotal > 20">
                    <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="drvPage" :total="drvTotal" @current-change="(n)=>{ drvPage=n; loadDrivers() }" />
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  drvKeyword,
  drvList,
  drvLoading,
  drvPage,
  drvStats,
  drvStatus,
  drvTotal,
  loadDrivers,
  moneyYuan,
  openDriver,
  openDriverCreate,
  statusLabel
} = inject("console")
</script>
