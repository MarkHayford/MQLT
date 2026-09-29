<template>
            <div class="mask" @click.self="closeInvoice">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div>
                    <div class="kicker">INVOICE</div>
                    <h3>{{ invSelected ? (invSelected.titleName || '发票申请') : '发票详情' }}</h3>
                    <div class="sub" v-if="invSelected">{{ invoiceLabel(invSelected.status) }} · {{ fmtTime(invSelected.createdAt) }}</div>
                  </div>
                  <el-button @click="closeInvoice">关闭</el-button>
                </div>
                <div class="drawer-body" v-if="invSelected">
                  <div class="block">
                    <div class="kicker">申请信息</div>
                    <div class="kv">
                      <div><label>开票方</label><b>{{ invIssuerLabel(invSelected) }}</b></div>
                      <div><label>抬头类型</label><b>{{ invSelected.titleType === 'company' ? '企业' : '个人' }}</b></div>
                      <div><label>抬头名称</label><b>{{ invSelected.titleName || '—' }}</b></div>
                      <div><label>税号</label><b>{{ invSelected.taxNo || '—' }}</b></div>
                      <div><label>金额</label><b>¥{{ invSelected.amount }}</b></div>
                      <div><label>邮箱</label><b>{{ invSelected.email || '—' }}</b></div>
                      <div><label>电话</label><b>{{ invSelected.phone || '—' }}</b></div>
                      <div><label>发票号</label><b>{{ invSelected.invoiceNo || '—' }}</b></div>
                      <div><label>邮件状态</label><b>{{ invSelected.emailStatus || '—' }}</b></div>
                      <div class="full" v-if="invSelected.pdfUrl"><label>PDF</label><b><a :href="invSelected.pdfUrl" target="_blank" rel="noopener">{{ invSelected.pdfUrl }}</a></b></div>
                      <div class="full" v-if="invSelected.rejectReason"><label>驳回原因</label><b>{{ invSelected.rejectReason }}</b></div>
                    </div>
                  </div>
                  <div class="block">
                    <div class="kicker">用户</div>
                    <div class="kv">
                      <div><label>昵称</label><b>{{ (invSelected.user && invSelected.user.nickname) || '—' }}</b></div>
                      <div><label>研学号</label><b>{{ (invSelected.user && invSelected.user.studyNo) || '—' }}</b></div>
                      <div><label>手机</label><b>{{ (invSelected.user && invSelected.user.phone) ? maskPhone(invSelected.user.phone) : '—' }}</b></div>
                    </div>
                  </div>
                  <div class="block">
                    <div class="kicker">开票明细</div>
                    <div class="kv" v-for="it in (invSelected.items || [])" :key="it.id">
                      <div class="full"><label>{{ invSourceLabel(it) }}</label><b>{{ it.title }} · ¥{{ it.amount }} · {{ it.sourceNo || it.sourceId }}</b></div>
                    </div>
                  </div>
                  <div class="block" v-if="canInvoiceManage && String(invSelected.status).toUpperCase()==='PENDING'">
                    <div class="kicker">开具 / 驳回</div>
                    <div class="edit-grid">
                      <div class="full"><label>PDF 链接</label><el-input v-model="invForm.pdfUrl" placeholder="https://... 发票 PDF" /></div>
                      <div><label>发票号码</label><el-input v-model="invForm.invoiceNo" placeholder="可选" /></div>
                      <div class="full"><label>驳回原因</label><el-input v-model="invForm.rejectReason" type="textarea" :rows="3" placeholder="驳回时必填" /></div>
                      <div class="full"><label>备注</label><el-input v-model="invForm.adminRemark" placeholder="内部备注（可选）" /></div>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot" v-if="invSelected && canInvoiceManage && String(invSelected.status).toUpperCase()==='PENDING'">
                  <el-button type="primary" :loading="invSaving" @click="saveInvoiceStatus('ISSUED')">开具</el-button>
                  <el-button type="danger" plain :loading="invSaving" @click="saveInvoiceStatus('REJECTED')">驳回</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  canInvoiceManage,
  closeInvoice,
  detailDrawerPx,
  fmtTime,
  invForm,
  invIssuerLabel,
  invSaving,
  invSelected,
  invSourceLabel,
  invoiceLabel,
  loading,
  maskPhone,
  phone,
  saveInvoiceStatus,
  startDetailDrawerResize,
  title
} = inject("console")
</script>
