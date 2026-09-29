<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">TAKE RATE</div>
                    <h3>抽成</h3>
                    <p>默认比例给新建企业用；每家企业、每位司机仍可单独改。</p>
                  </div>
                </div>
                <div v-if="cutLoading" class="empty-board"><b>正在载入</b></div>
                <template v-else>
                  <div class="cut-grid">
                    <div class="cut-card">
                      <div class="cut-card-hd">
                        <div class="fin-kicker">STUDY</div>
                        <h4>默认研学抽成</h4>
                        <p>新建企业沿用此比例，可在下表单独改。</p>
                      </div>
                      <div class="cut-card-bd">
                        <el-input v-model="cutDefaults.studyCommission" />
                        <span class="cut-unit">%</span>
                      </div>
                    </div>
                    <div class="cut-card">
                      <div class="cut-card-hd">
                        <div class="fin-kicker">MALL</div>
                        <h4>默认文创抽成</h4>
                        <p>文创货款按此比例留给平台。</p>
                      </div>
                      <div class="cut-card-bd">
                        <el-input v-model="cutDefaults.mallCommission" />
                        <span class="cut-unit">%</span>
                      </div>
                    </div>
                    <div class="cut-card">
                      <div class="cut-card-hd">
                        <div class="fin-kicker">FLEET</div>
                        <h4>默认司机抽成</h4>
                        <p>出车完成后，司机入账 = 车费 × (1 − 抽成)。</p>
                      </div>
                      <div class="cut-card-bd">
                        <el-input v-model="cutDefaults.driverCommission" />
                        <span class="cut-unit">%</span>
                      </div>
                    </div>
                  </div>
                  <div style="margin:0 0 16px">
                    <el-button type="primary" :loading="cutSaving" @click="saveCutDefaults">保存默认抽成</el-button>
                  </div>
                  <div class="users-bar">
                    <button class="chip" :class="{ on: cutTab==='enterprise' }" @click="cutTab='enterprise'">企业抽成</button>
                    <button class="chip" :class="{ on: cutTab==='driver' }" @click="cutTab='driver'">司机抽成</button>
                  </div>
                  <div class="users-table">
                    <table v-if="cutTab==='enterprise'" class="grid">
                      <thead><tr><th>企业</th><th>研学 %</th><th>文创 %</th><th></th></tr></thead>
                      <tbody>
                        <tr class="row" v-for="e in cutEnterprises" :key="'cut-'+e.id">
                          <td>
                            <div class="name">{{ e.shortName || e.name }}</div>
                            <div class="sub">{{ e.name }}</div>
                          </td>
                          <td @click.stop><el-input v-model="e.studyCommission" style="width:90px" /></td>
                          <td @click.stop><el-input v-model="e.mallCommission" style="width:90px" /></td>
                          <td><span class="link-btn" @click.stop="saveCutEnterprise(e)">保存</span></td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-if="cutTab==='enterprise' && !cutEnterprises.length" class="empty-board"><b>还没有入驻企业</b></div>
                    <table v-if="cutTab==='driver'" class="grid">
                      <thead><tr><th>司机</th><th>抽成 %（空=默认 {{ cutDefaults.driverCommission }}%）</th><th></th></tr></thead>
                      <tbody>
                        <tr class="row" v-for="d in cutDrivers" :key="'cd-'+d.id">
                          <td>
                            <div class="name">{{ d.realName }}</div>
                            <div class="sub">{{ d.phone }} · {{ d.plateNo }}</div>
                          </td>
                          <td @click.stop><el-input v-model="d.commissionRate" placeholder="默认" style="width:120px" /></td>
                          <td><span class="link-btn" @click.stop="saveCutDriver(d)">保存</span></td>
                        </tr>
                      </tbody>
                    </table>
                    <div v-if="cutTab==='driver' && !cutDrivers.length" class="empty-board"><b>还没有司机</b></div>
                  </div>
                </template>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  cutDefaults,
  cutDrivers,
  cutEnterprises,
  cutLoading,
  cutSaving,
  cutTab,
  saveCutDefaults,
  saveCutDriver,
  saveCutEnterprise
} = inject("console")
</script>
