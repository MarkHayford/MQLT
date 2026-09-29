<template>
            <div class="mask" @click.self="closeMallOrder">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div>
                      <h3>{{ orderGoods(moSelected) }}</h3>
                      <div class="sub">{{ moSelected.orderNo }} · {{ orderLabel(moSelected.status) }}</div>
                    </div>
                  </div>
                  <el-button @click="closeMallOrder">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="block">
                    <div class="kicker">学员</div>
                    <div class="kv">
                      <div><label>昵称</label><b>{{ (moSelected.user && moSelected.user.nickname) || '—' }}</b></div>
                      <div><label>研学号</label><b>{{ (moSelected.user && moSelected.user.studyNo) || '—' }}</b></div>
                      <div><label>手机</label><b>{{ (moSelected.user && moSelected.user.phone) || (moSelected.address && moSelected.address.phone) || '—' }}</b></div>
                    </div>
                  </div>
                  <div class="block">
                    <div class="kicker">商品</div>
                    <div class="shop-row" v-for="it in (moSelected.items || [])" :key="it.id">
                      <span>{{ (it.product && it.product.name) || '商品' }} × {{ it.quantity }}</span>
                      <span>{{ moneyText(it.price) }}</span>
                    </div>
                    <div class="meta-row"><span class="k">合计</span><span class="v">{{ moneyText(moSelected.amount) }}</span></div>
                  </div>
                  <div class="block">
                    <div class="kicker">收货</div>
                    <div class="kv">
                      <div class="full"><label>地址</label><b>{{ [moSelected.address && moSelected.address.province, moSelected.address && moSelected.address.city, moSelected.address && moSelected.address.district, moSelected.address && moSelected.address.detail].filter(Boolean).join(' ') || '—' }}</b></div>
                      <div><label>收件人</label><b>{{ (moSelected.address && moSelected.address.receiver) || '—' }}</b></div>
                    </div>
                  </div>
                  <div class="block" v-if="String(moSelected.status).toUpperCase()==='PAID' || String(moSelected.status).toUpperCase()==='UNRECEIVED'">
                    <div class="kicker">发货</div>
                    <div class="edit-grid">
                      <div><label>快递公司</label><el-input v-model="moShip.shippingCompany" /></div>
                      <div><label>运单号</label><el-input v-model="moShip.trackingNo" /></div>
                    </div>
                  </div>
                  <div class="block" v-else-if="moSelected.trackingNo">
                    <div class="kicker">物流</div>
                    <div class="meta-row"><span class="k">快递</span><span class="v">{{ moSelected.shippingCompany }} {{ moSelected.trackingNo }}</span></div>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button v-if="String(moSelected.status).toUpperCase()==='UNPAID'" :loading="moSaving" @click="mallOrderAct('pay')">标记已付</el-button>
                  <el-button v-if="String(moSelected.status).toUpperCase()==='PAID'" type="primary" :loading="moSaving" @click="mallOrderAct('ship')">发货</el-button>
                  <el-button v-if="!isMerchant && String(moSelected.status).toUpperCase()==='UNRECEIVED'" type="primary" :loading="moSaving" @click="mallOrderAct('complete')">完成</el-button>
                  <el-button v-if="String(moSelected.status).toUpperCase()==='UNPAID' || String(moSelected.status).toUpperCase()==='PAID' || String(moSelected.status).toUpperCase()==='UNRECEIVED'" :loading="moSaving" @click="mallOrderAct('cancel')">取消</el-button>
                  <el-button :loading="moSaving" @click="mallOrderAct('delete')">删除</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  closeMallOrder,
  detailDrawerPx,
  isMerchant,
  loading,
  mallOrderAct,
  moSaving,
  moSelected,
  moShip,
  moneyText,
  orderGoods,
  orderLabel,
  phone,
  startDetailDrawerResize
} = inject("console")
</script>
