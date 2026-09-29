<template>
            <el-dialog v-model="bkCreateOpen" title="代客预约" width="560px" append-to-body>
              <div class="edit-grid">
                <div class="full"><label>搜索学员</label><el-input v-model="bkCreate.userKeyword" @keyup.enter="searchBkUser" /></div>
                <div class="full">
                  <div class="shop-row" v-for="u in bkCreate.hits" :key="u.id">
                    <span>{{ u.realName || u.nickname }} · {{ u.studyNo }}</span>
                    <span class="link-btn" @click="bkCreate.userId=u.id">{{ bkCreate.userId===u.id ? '已选' : '选择' }}</span>
                  </div>
                </div>
                <div class="full">
                  <label>项目</label>
                  <el-select v-model="bkCreate.projectId" style="width:100%">
                    <el-option v-for="p in projList" :key="'bkp-'+p.id" :label="p.title" :value="p.id" />
                  </el-select>
                </div>
                <div class="full">
                  <label>出行日期</label>
                  <el-date-picker v-model="bkCreate.dayKeys" type="dates" value-format="YYYY-MM-DD" placeholder="可多选" style="width:100%" />
                </div>
                <div class="full">
                  <label>路线点位</label>
                  <el-checkbox-group v-model="bkCreate.spotIds">
                    <el-checkbox v-for="s in ROUTE_SPOTS" :key="'c-'+s.id" :label="s.id">{{ s.title }}</el-checkbox>
                  </el-checkbox-group>
                </div>
                <div class="full">
                  <label>交通方式</label>
                  <el-select v-model="bkCreate.ride.optionId" style="width:100%">
                    <el-option v-for="o in RIDE_OPTIONS" :key="'cr-'+o.id" :label="o.label" :value="o.id" />
                  </el-select>
                </div>
                <template v-if="bkCreate.ride.optionId !== 'none'">
                  <div><label>司机姓名</label><el-input v-model="bkCreate.ride.driverName" /></div>
                  <div><label>司机电话</label><el-input v-model="bkCreate.ride.driverPhone" /></div>
                  <div><label>车辆</label><el-input v-model="bkCreate.ride.vehicleName" /></div>
                  <div><label>车牌</label><el-input v-model="bkCreate.ride.plateNo" /></div>
                  <div class="full"><label>上车点</label><el-input v-model="bkCreate.ride.pickupAddress" /></div>
                </template>
                <div class="full">
                  <label>状态</label>
                  <el-select v-model="bkCreate.status" style="width:100%">
                    <el-option label="待出行" value="BOOKED" />
                    <el-option label="待支付" value="UNPAID" />
                    <el-option label="已完成" value="COMPLETED" />
                  </el-select>
                </div>
              </div>
              <template #footer>
                <el-button @click="bkCreateOpen=false">取消</el-button>
                <el-button type="primary" @click="createBooking">创建</el-button>
              </template>
            </el-dialog>
</template>

<script setup>
import { inject } from "vue"
const {
  RIDE_OPTIONS,
  ROUTE_SPOTS,
  bkCreate,
  bkCreateOpen,
  createBooking,
  projList,
  searchBkUser,
  title,
  userKeyword
} = inject("console")
</script>
