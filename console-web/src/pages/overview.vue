<template>
              <div class="users-page">
                <div class="hq">
                  <div class="hq-banner">
                    <div class="kicker">PLATFORM COMMAND</div>
                    <h3>平台总控</h3>
                    <p>蒙企链探运营中枢 · {{ prettyDate(new Date()) }}</p>
                    <div class="hq-banner-right">
                      <b>{{ moneyYuan((ov.metrics && ov.metrics.revenue) || 0) }}</b>
                      <span>文创累计成交</span>
                    </div>
                  </div>
                  <div class="hq-schematic">
                    <div class="hq-col">
                      <button class="hq-node" type="button" @click="openPage('users')">
                        <div class="fin-ico"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.7"/><path d="M5.2 18.5c.8-3 3.4-4.7 6.8-4.7s6 1.7 6.8 4.7" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ (ov.metrics && ov.metrics.users) || 0 }}</b><span>用户管理</span></div>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('enterprises')">
                        <div class="fin-ico moss"><svg viewBox="0 0 24 24" fill="none"><path d="M5 20.5V6.8L12 3.6l7 3.2v13.7" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ entList.length }}</b><span>入驻企业</span></div>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('commission')">
                        <div class="fin-ico gold"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>抽成</b><span>默认比例</span></div>
                      </button>
                    </div>
                    <div class="hq-hub">
                      <div class="hq-core">
                        <b>蒙企链探</b>
                        <span>运营中枢</span>
                      </div>
                    </div>
                    <div class="hq-col">
                      <button class="hq-node" type="button" @click="openPage('finance')">
                        <div class="fin-ico gold"><svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h14v11.2A1.8 1.8 0 0 1 17.2 20.5H6.8A1.8 1.8 0 0 1 5 18.7V7.5Z" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ moneyYuan((platFin.summary && platFin.summary.platformTotal) || 0) }}</b><span>本月平台收入</span></div>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('drivers')">
                        <div class="fin-ico clay"><svg viewBox="0 0 24 24" fill="none"><path d="M4.5 16.5h15l.8-4.2H4.7l.8 4.2Z" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ (ov.metrics && ov.metrics.bookings) || 0 }}</b><span>预约总量</span></div>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('posts-overview')">
                        <div class="fin-ico"><svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9V19.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ (ov.metrics && ov.metrics.products) || 0 }}</b><span>文创商品</span></div>
                      </button>
                    </div>
                  </div>
                  <div class="hq-bottom">
                    <div class="hq-panel">
                      <h4>快捷入口</h4>
                      <div class="hq-todo" @click="openPage('enterprises')"><span>进入企业管理</span><b style="color:#1A1A1A;font-size:13px">企业</b></div>
                      <div class="hq-todo" @click="openPage('finance')"><span>财务</span><b style="color:#1A1A1A;font-size:13px">账本</b></div>
                      <div class="hq-todo" @click="openPage('withdraw-review')"><span>提现审批</span><b style="color:#DC2626;font-size:13px">审</b></div>
                      <div class="hq-todo" @click="openPage('rental-orders')"><span>租车</span><b style="color:#1A1A1A;font-size:13px">租车</b></div>
                      <div class="hq-todo" @click="openPage('settings')"><span>系统设置</span><b style="color:#1A1A1A;font-size:13px">配置</b></div>
                    </div>
                    <div class="hq-panel">
                      <h4>最近文创订单</h4>
                      <div v-if="!(ov.recentOrders || []).length" class="quiet">暂无订单</div>
                      <div class="hq-feed" v-for="o in (ov.recentOrders || []).slice(0,5)" :key="'ov-'+o.id">
                        <div class="name">{{ o.orderNo || o.id }}</div>
                        <div class="sub">{{ orderLabel(o.status) }} · {{ moneyYuan(o.amount) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  entList,
  moneyYuan,
  openPage,
  orderLabel,
  ov,
  platFin,
  prettyDate
} = inject("console")
</script>
