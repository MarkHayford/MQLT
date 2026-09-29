<template>
            <div class="mask" @click.self="closeFinDetail">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div>
                      <div class="kicker">LEDGER</div>
                      <h3>{{ (finDetail && finDetail.item && (finDetail.item.entityLabel || finDetail.item.title)) || '流水详情' }}</h3>
                      <div class="sub" v-if="finDetail && finDetail.item">{{ finDetail.item.kindLabel }} · {{ finDetail.item.statusLabel }} · {{ moneyYuan(finDetail.item.amount) }}</div>
                    </div>
                  </div>
                  <el-button @click="closeFinDetail">关闭</el-button>
                </div>
                <div class="drawer-body" v-if="finDetailLoading"><div class="empty-board"><b>正在载入详情</b></div></div>
                <div class="drawer-body" v-else-if="finDetail && finDetail.item">
                  <div class="fin-hero-cover" v-if="finCoverSrc((finDetail.entity && finDetail.entity.project && finDetail.entity.project.coverUrl) || (finDetail.entity && finDetail.entity.lines && finDetail.entity.lines[0] && finDetail.entity.lines[0].coverUrl) || finDetail.item.coverUrl)">
                    <img :src="finCoverSrc((finDetail.entity && finDetail.entity.project && finDetail.entity.project.coverUrl) || (finDetail.entity && finDetail.entity.lines && finDetail.entity.lines[0] && finDetail.entity.lines[0].coverUrl) || finDetail.item.coverUrl)" alt="" />
                  </div>
                  <div class="block">
                    <div class="kicker">账目</div>
                    <div class="fin-split">
                      <div><b>{{ moneyYuan(finDetail.item.amount) }}</b><span>入账金额</span></div>
                      <div><b>{{ moneyYuan(finDetail.item.platformCut) }}</b><span>平台抽成 {{ finDetail.item.commissionRate }}%</span></div>
                      <div><b>{{ moneyYuan(finDetail.item.enterpriseNet) }}</b><span>企业应收</span></div>
                    </div>
                    <div class="kv" style="margin-top:12px">
                      <div><label>类型</label><b>{{ finDetail.item.entityLabel || finDetail.item.kindLabel }}</b></div>
                      <div><label>状态</label><b>{{ finDetail.item.statusLabel }}</b></div>
                      <div><label>单号</label><b>{{ finDetail.item.refNo }}</b></div>
                      <div><label>入账时间</label><b>{{ fmtTime(finDetail.item.paidAt) }}</b></div>
                      <div><label>支付渠道</label><b>{{ (finDetail.entity && finDetail.entity.payChannel) || '—' }}</b></div>
                      <div><label>对方</label><b>{{ (finDetail.entity && finDetail.entity.counterparty) || finDetail.item.userName || '—' }}</b></div>
                    </div>
                  </div>
                  <div class="block" v-if="finDetail.entity && finDetail.entity.type==='booking'">
                    <div class="kicker">研学预约</div>
                    <div class="kv">
                      <div><label>项目</label><b>{{ finDetail.entity.project && finDetail.entity.project.title }}</b></div>
                      <div><label>地点</label><b>{{ (finDetail.entity.project && finDetail.entity.project.location) || '—' }}</b></div>
                      <div><label>学员</label><b>{{ finDetail.entity.participant && finDetail.entity.participant.name }}</b></div>
                      <div><label>手机</label><b>{{ finDetail.entity.participant && finDetail.entity.participant.phone }}</b></div>
                      <div><label>研学号</label><b>{{ (finDetail.entity.participant && finDetail.entity.participant.studyNo) || '—' }}</b></div>
                      <div><label>人数</label><b>{{ (finDetail.entity.participants || []).length || 1 }}</b></div>
                    </div>
                    <div v-if="finDetail.entity.rental && finDetail.entity.rental.fee" class="kv" style="margin-top:10px">
                      <div><label>租车费</label><b>{{ moneyYuan(finDetail.entity.rental.fee) }}</b></div>
                      <div><label>司机</label><b>{{ finDetail.entity.rental.driverName || '—' }} {{ finDetail.entity.rental.driverPhone || '' }}</b></div>
                      <div><label>车辆</label><b>{{ finDetail.entity.rental.vehicleName || '—' }} {{ finDetail.entity.rental.plateNo || '' }}</b></div>
                      <div class="full"><label>上车点</label><b>{{ finDetail.entity.rental.pickupAddress || '—' }}</b></div>
                    </div>
                    <div v-if="finDetail.entity.participants && finDetail.entity.participants.length" style="margin-top:12px">
                      <div class="sub" style="margin-bottom:6px">同行人</div>
                      <div class="fin-line" v-for="p in finDetail.entity.participants" :key="p.id">
                        <div class="thumb"><span>{{ String(p.name||'学').slice(0,1) }}</span></div>
                        <div class="meta">
                          <div class="name">{{ p.name || '学员' }}</div>
                          <div class="sub">{{ p.phone }} · {{ p.role || '成员' }} · {{ p.status }}</div>
                        </div>
                        <div class="amt"><b>{{ moneyYuan(p.amount) }}</b></div>
                      </div>
                    </div>
                  </div>
                  <div class="block" v-if="finDetail.entity && finDetail.entity.type==='order'">
                    <div class="kicker">文创订单</div>
                    <div class="kv">
                      <div><label>订单号</label><b>{{ finDetail.entity.orderNo }}</b></div>
                      <div><label>买家</label><b>{{ (finDetail.entity.user && (finDetail.entity.user.realName || finDetail.entity.user.nickname)) || '—' }}</b></div>
                      <div><label>手机</label><b>{{ (finDetail.entity.user && finDetail.entity.user.phone) || '—' }}</b></div>
                      <div><label>收件人</label><b>{{ (finDetail.entity.address && finDetail.entity.address.receiver) || '—' }} {{ (finDetail.entity.address && finDetail.entity.address.phone) || '' }}</b></div>
                      <div class="full"><label>地址</label><b>{{ (finDetail.entity.address && finDetail.entity.address.full) || '—' }}</b></div>
                      <div><label>物流</label><b>{{ (finDetail.entity.shipping && (finDetail.entity.shipping.company || finDetail.entity.shipping.trackingNo)) ? ((finDetail.entity.shipping.company||'') + ' ' + (finDetail.entity.shipping.trackingNo||'')) : '—' }}</b></div>
                    </div>
                    <div style="margin-top:12px">
                      <div class="sub" style="margin-bottom:6px">商品明细</div>
                      <div class="fin-line" v-for="line in (finDetail.entity.lines || [])" :key="line.id">
                        <div class="thumb">
                          <img v-if="finCoverSrc(line.coverUrl)" :src="finCoverSrc(line.coverUrl)" alt="" />
                          <span v-else>品</span>
                        </div>
                        <div class="meta">
                          <div class="name">{{ line.productName }}</div>
                          <div class="sub">×{{ line.quantity }} · {{ moneyYuan(line.price) }} {{ line.sku ? '· ' + line.sku : '' }}</div>
                        </div>
                        <div class="amt"><b>{{ moneyYuan(line.amount) }}</b></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button @click="closeFinDetail">关闭</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  closeFinDetail,
  detailDrawerPx,
  finCoverSrc,
  finDetail,
  finDetailLoading,
  fmtTime,
  moneyYuan,
  phone,
  startDetailDrawerResize,
  statusLabel,
  title
} = inject("console")
</script>
