<template>
            <div class="mask" @click.self="closeDriver">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }">
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div>
                    <div class="kicker">DRIVER</div>
                    <h3>{{ drvCreating ? '录入司机' : (drvForm.realName || '司机档案') }}</h3>
                  </div>
                  <el-button @click="closeDriver">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="block">
                    <div class="kicker">档案</div>
                    <div class="edit-grid">
                      <div><label>绑定手机</label><el-input v-model="drvForm.phone" maxlength="11" :disabled="!drvCreating" /></div>
                      <div><label>姓名</label><el-input v-model="drvForm.realName" /></div>
                      <div><label>微信</label><el-input v-model="drvForm.wechat" /></div>
                      <div class="full">
                        <label>常驻城市</label>
                        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                          <b style="min-width:72px">{{ drvForm.city || '未选择' }}</b>
                          <el-input v-model="drvMapQuery" placeholder="输入城市名搜索" style="flex:1;min-width:140px" @keyup.enter="searchDrvCity" />
                          <el-button type="primary" plain @click="searchDrvCity">地图选市</el-button>
                        </div>
                        <div id="drv-city-map" class="proj-map proj-spot-map"></div>
                        <div class="proj-map-meta">搜索或点选地图确定常驻城市{{ drvForm.baseLatitude != null ? (' · ' + drvForm.baseLatitude + ', ' + drvForm.baseLongitude) : '' }}</div>
                      </div>
                      <div><label>车型</label><el-input v-model="drvForm.vehicleName" placeholder="如：别克GL8 / 丰田柯斯达" /></div>
                      <div><label>车牌</label><el-input v-model="drvForm.plateNo" /></div>
                      <div><label>座位数</label><el-input v-model="drvForm.seatCount" /></div>
                      <div><label>抽成 %</label><el-input v-model="drvForm.commissionRate" placeholder="空则用系统默认" /></div>
                      <div>
                        <label>状态</label>
                        <el-select v-model="drvForm.status" style="width:100%">
                          <el-option label="收车" value="OFFLINE" />
                          <el-option label="出车中" value="ONLINE" />
                          <el-option label="服务中" value="BUSY" />
                        </el-select>
                      </div>
                    </div>
                    <div class="verify-row" style="margin-top:12px">
                      <span>接单</span>
                      <el-switch v-model="drvForm.acceptOrders" />
                    </div>
                  </div>
                  <div class="block" v-if="drvSelected">
                    <div class="kicker">钱包</div>
                    <div class="kv">
                      <div><label>可提现</label><b>{{ moneyYuan(drvSelected.availableBalance) }}</b></div>
                      <div><label>审核中</label><b>{{ moneyYuan(drvSelected.pendingAmount) }}</b></div>
                      <div><label>已提现</label><b>{{ moneyYuan(drvSelected.withdrawnAmount) }}</b></div>
                      <div><label>累计完成</label><b>{{ drvSelected.completedJobs }} 单</b></div>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button type="primary" :loading="drvSaving" @click="saveDriver">保存</el-button>
                  <el-button v-if="!drvCreating" @click="deleteDriver()">删除</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  closeDriver,
  deleteDriver,
  detailDrawerPx,
  drvCreating,
  drvForm,
  drvMapQuery,
  drvSaving,
  drvSelected,
  loading,
  moneyYuan,
  phone,
  saveDriver,
  searchDrvCity,
  startDetailDrawerResize
} = inject("console")
</script>
