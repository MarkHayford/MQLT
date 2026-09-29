<template>
              <div class="users-page">
                <div class="hq">
                  <div class="hq-banner">
                    <div class="kicker">OVERVIEW</div>
                    <h3>{{ (opsEnt && (opsEnt.shortName || opsEnt.name)) || (account && (account.enterpriseName || account.enterpriseFullName)) || "入驻企业" }}</h3>
                    <p>{{ prettyDate(new Date()) }}</p>
                    <div class="hq-banner-right">
                      <b>{{ projStats.open }} / {{ projStats.total }}</b>
                      <span>可预约项目</span>
                    </div>
                  </div>
                  <div class="hq-schematic">
                    <div class="hq-col">
                      <button class="hq-node" type="button" @click="openPage('projects')">
                        <div class="fin-ico"><svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="12.5" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 10h17" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ projStats.total }}</b><span>项目</span></div>
                        <em>{{ projStats.live }} 进行中</em>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('staff-roles')">
                        <div class="fin-ico moss"><svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M3.8 18.5c.7-2.6 3-4.2 5.2-4.2s4.5 1.6 5.2 4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></div>
                        <div><b>{{ staffRoles.length }}</b><span>职位</span></div>
                        <em>{{ staffList.length }} 个账号</em>
                      </button>
                    </div>
                    <div class="hq-hub">
                      <div class="hq-core">
                        <b>{{ (opsEnt && (opsEnt.shortName || opsEnt.name)) || (account && account.enterpriseName) || "企业" }}</b>
                        <span>企业总览</span>
                      </div>
                    </div>
                    <div class="hq-col">
                      <button class="hq-node" type="button" @click="openPage('finance')">
                        <div class="fin-ico gold"><svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h14v11.2A1.8 1.8 0 0 1 17.2 20.5H6.8A1.8 1.8 0 0 1 5 18.7V7.5Z" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ moneyYuan(finSummary.enterpriseNet) }}</b><span>本月应收</span></div>
                        <em>企业流水</em>
                      </button>
                      <button class="hq-node" type="button" @click="openPage('finance-withdraw')">
                        <div class="fin-ico clay"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8.5 9.5l2.2 2.2 4.8-5" stroke="currentColor" stroke-width="1.7"/></svg></div>
                        <div><b>{{ moneyYuan(finWallet.pending) }}</b><span>提现审批中</span></div>
                        <em>可提现 {{ moneyYuan(finWallet.available) }}</em>
                      </button>
                    </div>
                  </div>
                  <div class="hq-bottom">
                    <div class="hq-panel">
                      <h4>快捷</h4>
                      <div class="hq-todo" @click="openPage('projects')"><span>进入项目管理</span><i class="go">›</i></div>
                      <div class="hq-todo" @click="openPage('finance')"><span>企业流水</span><i class="go">›</i></div>
                      <div class="hq-todo" @click="openPage('finance-withdraw')"><span>提现申请</span><i class="go">›</i></div>
                      <div class="hq-todo" v-if="merchantCan('staff')" @click="openPage('staff-roles')"><span>自定义职位</span><i class="go">›</i></div>
                      <div class="hq-todo" v-if="area==='mp'" @click="openPage('ent-archive')"><span>企业档案</span><i class="go">›</i></div>
                      <div class="hq-todo" @click="openPage('personal')"><span>个人中心</span><i class="go">›</i></div>
                    </div>
                    <div class="hq-panel">
                      <h4>最近预约</h4>
                      <div v-if="!(bkList || []).length" class="quiet">暂无预约</div>
                      <div class="hq-feed" v-for="b in (bkList || []).slice(0,5)" :key="'eh-'+b.id" @click="openPage('projects')">
                        <div class="name">{{ (b.user && (b.user.realName || b.user.nickname)) || b.participantName || "学员" }} · {{ (b.project && b.project.title) || "研学" }}</div>
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
  account,
  area,
  bkList,
  bookingLabel,
  finSummary,
  finWallet,
  merchantCan,
  moneyText,
  moneyYuan,
  openPage,
  opsEnt,
  prettyDate,
  projStats,
  staffList,
  staffRoles
} = inject("console")
</script>
