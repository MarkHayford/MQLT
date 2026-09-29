<template>
            <div class="mask" @click.self="closeUser">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div class="avatar">
                      <img v-if="userDetail && avatarSrc(userDetail)" :src="avatarSrc(userDetail)" alt="" />
                      <span v-else>{{ userDetail ? initialOf(userDetail) : '' }}</span>
                    </div>
                    <div>
                      <h3>{{ userDetail ? displayName(userDetail) : '' }}</h3>
                      <div class="sub">{{ userDetail && userDetail.studyNo }} · {{ userDetail ? (userEditing ? userDetail.phone : maskPhone(userDetail.phone)) : '' }}</div>
                    </div>
                  </div>
                  <el-button @click="closeUser">关闭</el-button>
                </div>
                <div class="drawer-body" v-if="userDetail">
                  <div v-if="userPanel==='home'">
                    <div class="block">
                      <div class="kicker">IDENTITY</div>
                      <div class="kv" v-if="!userEditing">
                        <div><label>姓名</label><b>{{ userDetail.realName || '未填写' }}</b></div>
                        <div><label>研学号</label><b>{{ userDetail.studyNo || '—' }}</b></div>
                        <div><label>核验</label><b>{{ userDetail.realNameVerified ? '已实名' : '未实名' }}</b></div>
                        <div><label>手机</label><b>{{ maskPhone(userDetail.phone) }}</b></div>
                        <div class="full"><label>证件号</label><b>{{ maskId(userDetail.realNameIdCard) }}</b></div>
                        <div><label>状态</label><b>{{ statusLabel(userDetail.status) }}</b></div>
                        <div class="full"><label>注册时间</label><b>{{ fmtTime(userDetail.createdAt) }}</b></div>
                      </div>
                      <div class="edit-grid" v-else>
                        <div>
                          <label>姓名</label>
                          <el-input v-model="userForm.realName" maxlength="30" placeholder="真实姓名" />
                        </div>
                        <div>
                          <label>手机号</label>
                          <el-input v-model="userForm.phone" maxlength="11" placeholder="11位手机号" />
                        </div>
                        <div>
                          <div class="verify-row">
                            <span>实名核验</span>
                            <el-switch v-model="userForm.realNameVerified" />
                          </div>
                        </div>
                        <div class="full">
                          <label>证件号</label>
                          <el-input v-model="userForm.realNameIdCard" maxlength="18" placeholder="18位身份证号" />
                        </div>
                        <div class="full sub">研学号 {{ userDetail.studyNo }} 不可修改</div>
                      </div>
                    </div>
                    <div class="block">
                      <div class="kicker">STUDY</div>
                      <div v-if="!userRecords.length" class="quiet">暂无研学预约</div>
                      <div class="dossier" v-for="b in userRecords" :key="b.id">
                        <div class="dossier-hd">
                          <div class="dossier-title">{{ projectTitle(b) }}</div>
                          <span class="tag" :class="String(b.status).toLowerCase()==='completed' ? 'ok' : (String(b.status).toLowerCase()==='cancelled' || String(b.status).toLowerCase()==='canceled' ? 'off' : 'warn')">{{ bookingLabel(b.status) }}</span>
                        </div>
                        <div class="dossier-meta">
                          <div class="meta-row" v-if="b.project && b.project.enterpriseName"><span class="k">隶属企业</span><span class="v">{{ b.project.enterpriseName }}</span></div>
                          <div class="meta-row" v-if="b.project && b.project.location"><span class="k">地点</span><span class="v">{{ b.project.location }}</span></div>
                          <div class="meta-row"><span class="k">金额</span><span class="v">{{ moneyText(b.amount) }}</span></div>
                          <div class="meta-row"><span class="k">下单</span><span class="v">{{ fmtTime(b.createdAt) }}</span></div>
                        </div>
                        <div class="day-list" v-if="b.days && b.days.length">
                          <div class="day-row" v-for="d in b.days" :key="d.dayKey">
                            <span>{{ prettyDay(d.dayKey) }} · {{ spotNames(d) }}</span>
                            <span class="tag" :class="d.redeemed ? 'ok' : 'warn'">{{ d.redeemed ? '已核销' : '未核销' }}</span>
                          </div>
                        </div>
                        <div class="dossier-meta" style="margin-top:10px">
                          <div class="meta-row"><span class="k">交通</span><span class="v">{{ rideLabel(b) }}</span></div>
                          <div class="meta-row" v-if="b.rental && b.rental.optionId !== 'none'"><span class="k">司机</span><span class="v">{{ driverLabel(b) }}</span></div>
                          <div class="meta-row" v-if="b.rental && b.rental.vehicleName"><span class="k">车辆</span><span class="v">{{ b.rental.vehicleName }}{{ b.rental.plateNo ? ' · ' + b.rental.plateNo : '' }}</span></div>
                          <div class="meta-row" v-if="b.rental && b.rental.pickupAddress"><span class="k">上车点</span><span class="v">{{ b.rental.pickupAddress }}</span></div>
                        </div>
                        <div class="record-ops">
                          <span class="link-btn" @click.stop="openRecordEdit('bookings', b)">修改</span>
                          <span class="link-btn" v-if="canCancelRecord('bookings', b)" @click.stop="cancelRecord('bookings', b)">取消</span>
                          <span class="link-btn" v-if="canDeleteRecord('bookings', b)" @click.stop="deleteRecord('bookings', b)">删除</span>
                        </div>
                      </div>
                      <div style="margin-top:10px" v-if="userRecordsTotal > 8">
                        <el-pagination layout="prev, pager, next, total" :page-size="8" :current-page="userRecordsPage" :total="userRecordsTotal" @current-change="(p)=>loadUserRecords('bookings', p)" />
                      </div>
                    </div>
                    <div class="block">
                      <div class="kicker">ACTIVITY</div>
                      <div class="traffic">
                        <div class="traffic-cell" :class="{ zero: !userSummary(userDetail).orders }" @click="openPanel('orders')">
                          <b>{{ userSummary(userDetail).orders }}</b>
                          <span>文创</span>
                        </div>
                        <div class="traffic-cell" :class="{ zero: !userSummary(userDetail).coupons }" @click="openPanel('coupons')">
                          <b>{{ userSummary(userDetail).unusedCoupons }}</b>
                          <span>卡券</span>
                        </div>
                        <div class="traffic-cell" :class="{ zero: !userSummary(userDetail).certificates }" @click="openPanel('achievements')">
                          <b>{{ userSummary(userDetail).certificates }}</b>
                          <span>成果</span>
                        </div>
                        <div class="traffic-cell" :class="{ zero: !userSummary(userDetail).posts }" @click="openPanel('posts')">
                          <b>{{ userSummary(userDetail).publishedPosts }}</b>
                          <span>文章</span>
                        </div>
                      </div>
                      <div class="note-line" v-if="userSummary(userDetail).pendingFeedbacks" @click="openPanel('feedbacks')">
                        有 {{ userSummary(userDetail).pendingFeedbacks }} 条未处理反馈
                      </div>
                      <div class="note-line" @click="openPanel('logs')">操作日志 {{ userLogTotal }}</div>
                    </div>
                  </div>

                  <div v-else>
                    <div class="subhead">
                      <button class="back-link" @click="openPanel('home')">← 返回档案</button>
                      <b v-if="userPanel==='orders'">文创订单</b>
                      <b v-else-if="userPanel==='coupons'">卡券</b>
                      <b v-else-if="userPanel==='achievements'">成果</b>
                      <b v-else-if="userPanel==='posts'">文章</b>
                      <b v-else-if="userPanel==='logs'">操作日志</b>
                      <b v-else>反馈</b>
                    </div>
                    <div v-if="userPanel==='orders'">
                      <div v-if="!userRecords.length" class="quiet">暂无文创订单</div>
                      <div class="line-item" v-for="o in userRecords" :key="o.id">
                        <div class="top">
                          <span class="ttl">{{ orderGoods(o) }}</span>
                          <span class="tag warn">{{ orderLabel(o.status) }}</span>
                        </div>
                        <div class="sub">{{ o.orderNo }} · {{ moneyText(o.amount) }} · {{ fmtTime(o.createdAt) }}</div>
                        <div class="record-ops">
                          <span class="link-btn" @click="openRecordEdit('orders', o)">修改</span>
                          <span class="link-btn" v-if="canCancelRecord('orders', o)" @click="cancelRecord('orders', o)">取消</span>
                          <span class="link-btn" v-if="canDeleteRecord('orders', o)" @click="deleteRecord('orders', o)">删除</span>
                        </div>
                      </div>
                      <div style="margin-top:12px" v-if="userRecordsTotal > 20">
                        <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="userRecordsPage" :total="userRecordsTotal" @current-change="(p)=>loadUserRecords('orders', p)" />
                      </div>
                    </div>
                    <div v-else-if="userPanel==='coupons'">
                      <div v-if="!userRecords.length" class="quiet">暂无卡券</div>
                      <div class="line-item" v-for="c in userRecords" :key="c.id">
                        <div class="top">
                          <span class="ttl">{{ c.title }}{{ couponFace(c) ? ' · ' + couponFace(c) : '' }}</span>
                          <span class="tag" :class="String(c.status).toLowerCase()==='unused' ? 'ok' : 'off'">{{ couponLabel(c.status) }}</span>
                        </div>
                        <div class="sub">{{ c.scope || '文创商城' }}{{ c.expireAt ? ' · 至 ' + fmtTime(c.expireAt) : '' }}</div>
                        <div class="record-ops">
                          <span class="link-btn" @click="openRecordEdit('coupons', c)">修改</span>
                          <span class="link-btn" v-if="canCancelRecord('coupons', c)" @click="cancelRecord('coupons', c)">作废</span>
                          <span class="link-btn" @click="deleteRecord('coupons', c)">删除</span>
                        </div>
                      </div>
                      <div style="margin-top:12px" v-if="userRecordsTotal > 20">
                        <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="userRecordsPage" :total="userRecordsTotal" @current-change="(p)=>loadUserRecords('coupons', p)" />
                      </div>
                    </div>
                    <div v-else-if="userPanel==='achievements'">
                      <div v-if="!userRecords.length" class="quiet">暂无结业证书</div>
                      <div class="line-item" v-for="c in userRecords" :key="c.id">
                        <div class="top">
                          <span class="ttl">{{ c.projectTitle }}</span>
                          <span class="tag gold">证书</span>
                        </div>
                        <div class="sub">{{ c.certificateNo }} · {{ c.holderName }} · {{ fmtTime(c.issuedAt) }}</div>
                        <div class="record-ops">
                          <span class="link-btn" @click="openRecordEdit('certificates', c)">修改</span>
                          <span class="link-btn" @click="deleteRecord('certificates', c)">删除</span>
                        </div>
                      </div>
                      <div style="margin-top:12px" v-if="userRecordsTotal > 20">
                        <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="userRecordsPage" :total="userRecordsTotal" @current-change="(p)=>loadUserRecords('certificates', p)" />
                      </div>
                    </div>
                    <div v-else-if="userPanel==='posts'">
                      <div v-if="!userRecords.length" class="quiet">暂无发布文章</div>
                      <div class="line-item" v-for="p in userRecords" :key="p.id">
                        <div class="top">
                          <span class="ttl">{{ p.title }}</span>
                          <span class="tag warn">{{ postLabel(p.status) }}</span>
                        </div>
                        <div class="sub">{{ p.category || p.type }} · {{ fmtTime(p.createdAt) }}</div>
                        <div class="record-ops">
                          <span class="link-btn" @click="openRecordEdit('posts', p)">修改</span>
                          <span class="link-btn" v-if="canCancelRecord('posts', p)" @click="cancelRecord('posts', p)">下架</span>
                          <span class="link-btn" @click="deleteRecord('posts', p)">删除</span>
                        </div>
                      </div>
                      <div style="margin-top:12px" v-if="userRecordsTotal > 20">
                        <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="userRecordsPage" :total="userRecordsTotal" @current-change="(p)=>loadUserRecords('posts', p)" />
                      </div>
                    </div>
                    <div v-else-if="userPanel==='logs'">
                      <div style="margin-bottom:10px">
                        <el-button size="small" @click="clearLogs({ targetType: 'User', targetId: userDetail.id }, ()=>{ userLogPage=1; return loadUserLogs(userDetail.id) })">清理</el-button>
                      </div>
                      <div v-if="!userLogs.length" class="quiet">暂无操作记录</div>
                      <div class="log-item" v-for="row in userLogs" :key="row.id">
                        <div class="top">
                          <span class="ttl">{{ row.summary }}</span>
                          <span>
                            <span class="tag">{{ logModuleLabel(row.module) }}</span>
                            <span class="link-btn" @click="deleteLog(row.id, ()=>loadUserLogs(userDetail.id))">清理</span>
                          </span>
                        </div>
                        <div class="meta">{{ row.actorName || '运维' }} · {{ fmtTime(row.createdAt) }}</div>
                      </div>
                      <div style="margin-top:12px" v-if="userLogTotal > 20">
                        <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="userLogPage" :total="userLogTotal" @current-change="(p)=>{ userLogPage=p; if(userDetail) loadUserLogs(userDetail.id) }" />
                      </div>
                    </div>
                    <div v-else>
                      <div v-if="!userRecords.length" class="quiet">暂无反馈</div>
                      <div class="line-item" v-for="f in userRecords" :key="f.id">
                        <div class="top">
                          <span class="ttl">{{ f.type || '反馈' }}</span>
                          <span class="tag warn">{{ feedbackLabel(f.status) }}</span>
                        </div>
                        <div class="sub">{{ f.content }}</div>
                      </div>
                      <div style="margin-top:12px" v-if="userRecordsTotal > 20">
                        <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="userRecordsPage" :total="userRecordsTotal" @current-change="(p)=>loadUserRecords('feedbacks', p)" />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot" v-if="userDetail && userPanel==='home'">
                  <template v-if="userEditing">
                    <el-button @click="cancelEdit">取消</el-button>
                    <el-button type="primary" :loading="userSaving" @click="saveUser">保存</el-button>
                  </template>
                  <template v-else>
                    <el-button @click="deleteUserAccount">删除用户</el-button>
                    <el-button @click="startEdit">编辑资料</el-button>
                    <el-button
                      :type="String(userDetail.status).toUpperCase()==='DISABLED' ? 'primary' : 'warning'"
                      :loading="userSaving"
                      @click="toggleStatus"
                    >{{ String(userDetail.status).toUpperCase()==='DISABLED' ? '恢复账号' : '停用账号' }}</el-button>
                  </template>
                </div>
                <el-dialog :model-value="!!userRecordEdit" title="修改记录" width="480px" append-to-body @close="closeRecordEdit">
                  <div class="edit-grid" v-if="userRecordEdit && userRecordEdit.kind==='bookings'">
                    <div class="full">
                      <label>状态</label>
                      <el-select v-model="userRecordForm.status" style="width:100%">
                        <el-option label="待出行" value="BOOKED" />
                        <el-option label="待支付" value="UNPAID" />
                        <el-option label="已完成" value="COMPLETED" />
                        <el-option label="已取消" value="CANCELLED" />
                      </el-select>
                    </div>
                  </div>
                  <div class="edit-grid" v-else-if="userRecordEdit && userRecordEdit.kind==='orders'">
                    <div class="full">
                      <label>状态</label>
                      <el-select v-model="userRecordForm.status" style="width:100%">
                        <el-option label="待支付" value="UNPAID" />
                        <el-option label="待发货" value="PAID" />
                        <el-option label="待收货" value="UNRECEIVED" />
                        <el-option label="已完成" value="COMPLETED" />
                        <el-option label="已取消" value="CANCELLED" />
                      </el-select>
                    </div>
                    <div>
                      <label>快递公司</label>
                      <el-input v-model="userRecordForm.shippingCompany" />
                    </div>
                    <div>
                      <label>运单号</label>
                      <el-input v-model="userRecordForm.trackingNo" />
                    </div>
                    <div class="full">
                      <label>备注</label>
                      <el-input v-model="userRecordForm.adminRemark" />
                    </div>
                  </div>
                  <div class="edit-grid" v-else-if="userRecordEdit && userRecordEdit.kind==='coupons'">
                    <div class="full">
                      <label>名称</label>
                      <el-input v-model="userRecordForm.title" />
                    </div>
                    <div>
                      <label>状态</label>
                      <el-select v-model="userRecordForm.status" style="width:100%">
                        <el-option label="未使用" value="unused" />
                        <el-option label="已使用" value="used" />
                        <el-option label="已过期" value="expired" />
                      </el-select>
                    </div>
                    <div>
                      <label>到期日</label>
                      <el-date-picker v-model="userRecordForm.expireAt" type="date" value-format="YYYY-MM-DD" clearable placeholder="清空=长期有效" style="width:100%" />
                    </div>
                    <div>
                      <label>或延长天数</label>
                      <el-input-number v-model="userRecordForm.extendDays" :min="-3650" :max="3650" />
                    </div>
                    <div class="full">
                      <span class="hint">可直接改到期日；或填「延长天数」在现有到期基础上顺延（已过期则从今天起算）。保存时若填写了延长天数将优先生效。已核销卡券请勿改期。</span>
                      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                        <el-button size="small" @click="userRecordForm.extendDays=7">+7天</el-button>
                        <el-button size="small" @click="userRecordForm.extendDays=30">+30天</el-button>
                        <el-button size="small" @click="userRecordForm.extendDays=90">+90天</el-button>
                        <el-button size="small" @click="userRecordForm.expireAt=''; userRecordForm.extendDays=null">长期有效</el-button>
                      </div>
                    </div>
                  </div>
                  <div class="edit-grid" v-else-if="userRecordEdit && userRecordEdit.kind==='certificates'">
                    <div class="full">
                      <label>持有人</label>
                      <el-input v-model="userRecordForm.holderName" />
                    </div>
                    <div class="full">
                      <label>项目</label>
                      <el-input v-model="userRecordForm.projectTitle" />
                    </div>
                    <div class="full">
                      <label>摘要</label>
                      <el-input v-model="userRecordForm.summary" type="textarea" :rows="3" />
                    </div>
                  </div>
                  <div class="edit-grid" v-else-if="userRecordEdit && userRecordEdit.kind==='posts'">
                    <div class="full">
                      <label>标题</label>
                      <el-input v-model="userRecordForm.title" />
                    </div>
                    <div class="full">
                      <label>状态</label>
                      <el-select v-model="userRecordForm.status" style="width:100%">
                        <el-option label="已发布" value="PUBLISHED" />
                        <el-option label="已下架" value="HIDDEN" />
                        <el-option label="草稿" value="DRAFT" />
                      </el-select>
                    </div>
                  </div>
                  <template #footer>
                    <el-button @click="closeRecordEdit">取消</el-button>
                    <el-button type="primary" @click="saveRecordEdit">保存</el-button>
                  </template>
                </el-dialog>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  avatarSrc,
  bookingLabel,
  canCancelRecord,
  canDeleteRecord,
  cancelEdit,
  cancelRecord,
  clearLogs,
  closeRecordEdit,
  closeUser,
  couponFace,
  couponLabel,
  deleteLog,
  deleteRecord,
  deleteUserAccount,
  detailDrawerPx,
  displayName,
  driverLabel,
  feedbackLabel,
  fmtTime,
  initialOf,
  loadUserLogs,
  loadUserRecords,
  loading,
  logModuleLabel,
  maskId,
  maskPhone,
  moneyText,
  openPanel,
  openRecordEdit,
  orderGoods,
  orderLabel,
  phone,
  postLabel,
  prettyDay,
  projectTitle,
  rideLabel,
  saveRecordEdit,
  saveUser,
  spotNames,
  startDetailDrawerResize,
  startEdit,
  statusLabel,
  title,
  toggleStatus,
  userDetail,
  userEditing,
  userForm,
  userLogPage,
  userLogTotal,
  userLogs,
  userPanel,
  userRecordEdit,
  userRecordForm,
  userRecords,
  userRecordsPage,
  userRecordsTotal,
  userSaving,
  userSummary
} = inject("console")
</script>
