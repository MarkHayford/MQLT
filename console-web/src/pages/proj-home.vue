<template>
              <div class="users-page">
                <div class="hq">
                  <div class="hq-banner">
                    <div class="kicker">PROJECT</div>
                    <h3>{{ (opsProj && opsProj.title) || "研学项目" }}</h3>
                    <p>{{ (opsProj && opsProj.status) || "" }} · {{ prettyDate(new Date()) }}</p>
                    <div class="hq-banner-right">
                      <b>{{ (opsProj && opsProj.enrolled) || 0 }} / {{ (opsProj && opsProj.maxCapacity) || 0 }}</b>
                      <span>已报名 / 名额</span>
                    </div>
                  </div>
                  <div class="hq-schematic">
                    <div class="hq-col">
                      <button class="hq-node" type="button" @click="openPage('dynamics')">
                        <div class="fin-ico moss"><svg viewBox="0 0 24 24" fill="none"><path d="M7 4.5h7.2L19.5 9v10.5A1.5 1.5 0 0 1 18 21H7a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 7 4.5Z" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ noticeTotal }}</b><span>动态</span></div>
                        <em>项目动态</em>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('mall')">
                        <div class="fin-ico gold"><svg viewBox="0 0 24 24" fill="none"><path d="M5 8h14l-1.2 11.2A1.8 1.8 0 0 1 16 21H8a1.8 1.8 0 0 1-1.8-1.8L5 8Z" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ mallStats.onSale }}</b><span>文创在售</span></div>
                        <em>{{ mallStats.low }} 低库存</em>
                      </button>
                    </div>
                    <div class="hq-hub">
                      <div class="hq-core">
                        <b>{{ (opsProj && opsProj.title) || "项目" }}</b>
                        <span>项目管理</span>
                      </div>
                    </div>
                    <div class="hq-col">
                      <button class="hq-node" type="button" @click="openPage('bookings')">
                        <div class="fin-ico clay"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M4 9.5h16" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ bkStats.booked }}</b><span>待出行</span></div>
                        <em>{{ bkStats.unpaid }} 待支付</em>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('mall-orders')">
                        <div class="fin-ico"><svg viewBox="0 0 24 24" fill="none"><path d="M4 18h16M7 18V8h10v10" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ moStats.paid }}</b><span>待发货</span></div>
                        <em>{{ moStats.total }} 订单</em>
                      </button>
                    </div>
                  </div>
                  <div class="hq-bottom">
                    <div class="hq-panel">
                      <h4>本项目待办</h4>
                      <div class="hq-todo" @click="openPage('proj-live')"><span>研学 Live</span><b style="color:#1A1A1A;font-size:13px;font-weight:700">现场</b></div>
                      <div class="hq-todo" @click="openPage('bookings')"><span>待支付预约</span><b>{{ bkStats.unpaid }}</b></div>
                      <div class="hq-todo" @click="openPage('bookings')"><span>待出行</span><b>{{ bkStats.booked }}</b></div>
                      <div class="hq-todo" @click="openPage('mall-orders')"><span>待发货文创</span><b>{{ moStats.paid }}</b></div>
                      <div class="hq-todo" @click="openPage('mall')"><span>低库存商品</span><b>{{ mallStats.low }}</b></div>
                      <div class="hq-todo" @click="openPage('proj-edit')"><span>编辑项目资料</span><b style="color:#1A1A1A;font-size:13px;font-weight:700">编辑</b></div>
                    </div>
                    <div class="hq-panel">
                      <h4>最近预约</h4>
                      <div v-if="!(bkList || []).length" class="quiet">暂无预约</div>
                      <div class="hq-feed" v-for="b in (bkList || []).slice(0,5)" :key="'ph-'+b.id" @click="openPage('bookings')">
                        <div class="name">{{ (b.user && (b.user.realName || b.user.nickname)) || b.participantName || "学员" }}</div>
                        <div class="sub">{{ bookingLabel(b.status) }} · {{ moneyText(b.amount) }} · {{ prettyDate(b.createdAt) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  bkList,
  bkStats,
  bookingLabel,
  mallStats,
  moStats,
  moneyText,
  noticeTotal,
  openPage,
  opsProj,
  prettyDate
} = inject("console")
</script>
