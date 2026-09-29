<template>
            <div class="mask" @click.self="closeBooking">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div>
                      <h3>{{ (bkSelected.project && bkSelected.project.title) || '预约' }}</h3>
                      <div class="sub">{{ bookingLabel(bkSelected.status) }} · {{ moneyText(bkSelected.amount) }}</div>
                    </div>
                  </div>
                  <el-button @click="closeBooking">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="block">
                    <div class="kicker">学员</div>
                    <div class="kv">
                      <div><label>姓名</label><b>{{ (bkSelected.user && (bkSelected.user.realName || bkSelected.user.nickname)) || bkSelected.participantName }}</b></div>
                      <div><label>研学号</label><b>{{ (bkSelected.user && bkSelected.user.studyNo) || '—' }}</b></div>
                      <div><label>手机</label><b>{{ (bkSelected.user && bkSelected.user.phone) || bkSelected.participantPhone }}</b></div>
                    </div>
                    <div class="record-ops">
                      <span class="link-btn" v-if="bkSelected.user && bkSelected.user.id" @click.stop="openBookingUser">打开档案</span>
                    </div>
                  </div>
                  <div class="block">
                    <div class="kicker">行程</div>
                    <div class="trip-day" v-for="day in bkTrip" :key="day.dayKey">
                      <div class="trip-day-hd">
                        <b>{{ prettyDay(day.dayKey) }}</b>
                        <span class="tag" :class="bkDayRedeemed(day.dayKey) ? 'ok' : 'warn'">{{ bkDayRedeemed(day.dayKey) ? '已核销' : '未核销' }}</span>
                        <span class="link-btn" v-if="!bkDayRedeemed(day.dayKey) && (bkSelected.status==='BOOKED' || bkSelected.status==='COMPLETED')" @click="redeemBkDay(day.dayKey, false)">核销</span>
                        <span class="link-btn" v-if="bkDayRedeemed(day.dayKey)" @click="redeemBkDay(day.dayKey, true)">撤销</span>
                        <span class="link-btn" @click="removeBkTripDay(day.dayKey)">移除</span>
                      </div>
                      <div class="spot-grid">
                        <el-checkbox-group v-model="day.spotIds">
                          <el-checkbox v-for="s in ROUTE_SPOTS" :key="day.dayKey + '-' + s.id" :label="s.id">{{ s.title }}</el-checkbox>
                        </el-checkbox-group>
                      </div>
                    </div>
                    <div v-if="!bkTrip.length" class="quiet">
                      未填写出行日期和路线点位
                      <span class="link-btn" style="margin-left:8px" v-if="bkSelected.status==='BOOKED'" @click="redeemBkDay('', false)">核销今日</span>
                    </div>
                    <div class="edit-grid" style="margin-top:8px">
                      <div>
                        <label>增加日期</label>
                        <el-date-picker v-model="bkTripAddDate" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="addBkTripDay" />
                      </div>
                    </div>
                    <el-button type="primary" style="margin-top:10px" @click="saveBkTrip">保存行程</el-button>
                  </div>
                  <div class="block">
                    <div class="kicker">交通</div>
                    <div class="edit-grid">
                      <div class="full">
                        <label>交通方式</label>
                        <el-select v-model="bkRide.optionId" style="width:100%">
                          <el-option v-for="o in RIDE_OPTIONS" :key="o.id" :label="o.label" :value="o.id" />
                        </el-select>
                      </div>
                      <template v-if="bkRide.optionId !== 'none'">
                        <div><label>司机姓名</label><el-input v-model="bkRide.driverName" /></div>
                        <div><label>司机电话</label><el-input v-model="bkRide.driverPhone" /></div>
                        <div><label>司机微信</label><el-input v-model="bkRide.driverWechat" /></div>
                        <div><label>车辆</label><el-input v-model="bkRide.vehicleName" /></div>
                        <div><label>车牌</label><el-input v-model="bkRide.plateNo" /></div>
                        <div><label>司机报价</label><el-input v-model="bkRide.fee" /></div>
                        <div class="full"><label>上车点</label><el-input v-model="bkRide.pickupAddress" /></div>
                      </template>
                    </div>
                    <el-button type="primary" style="margin-top:10px" @click="saveBkRide">保存交通</el-button>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button v-if="canCancelRecord('bookings', bkSelected)" @click="mutateBooking('cancel').then(()=>ElementPlus.ElMessage.success('已取消')).catch(e=>ElementPlus.ElMessage.error(e.message||'失败'))">取消预约</el-button>
                  <el-button @click="mutateBooking('update', { status: 'COMPLETED' }).then(()=>ElementPlus.ElMessage.success('已完成')).catch(e=>ElementPlus.ElMessage.error(e.message||'失败'))">完成</el-button>
                  <el-button @click="mutateBooking('delete').then(()=>ElementPlus.ElMessage.success('已删除')).catch(e=>ElementPlus.ElMessage.error(e.message||'失败'))">删除</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  RIDE_OPTIONS,
  ROUTE_SPOTS,
  addBkTripDay,
  bkDayRedeemed,
  bkRide,
  bkSelected,
  bkTrip,
  bkTripAddDate,
  bookingLabel,
  canCancelRecord,
  closeBooking,
  detailDrawerPx,
  moneyText,
  mutateBooking,
  openBookingUser,
  phone,
  prettyDay,
  redeemBkDay,
  removeBkTripDay,
  saveBkRide,
  saveBkTrip,
  startDetailDrawerResize,
  title
} = inject("console")
</script>
