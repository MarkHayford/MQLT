<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">PAYOUT</div>
                    <h3>提现申请</h3>
                    <p>选择打款账户后提交，由平台审批打款。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ moneyYuan(finWallet.available) }}</b><span>可提现</span></div>
                    <div><b>{{ moneyYuan(finWallet.pending) }}</b><span>审批中</span></div>
                    <div><b>{{ moneyYuan(finWallet.withdrawn) }}</b><span>已打款</span></div>
                  </div>
                </div>
                <div class="sheet" style="margin-bottom:16px">
                  <div class="sheet-hd">
                    <div>
                      <h4>申请提现</h4>
                      <p>累计应收 {{ moneyYuan(finWallet.earned) }}，可提现 {{ moneyYuan(finWallet.available) }}。</p>
                    </div>
                    <el-button type="primary" @click="applyEntWithdraw">提交申请</el-button>
                  </div>
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div>
                        <label>打款账户</label>
                        <el-select v-model="ewdForm.accountId" style="width:100%" placeholder="选择打款信息">
                          <el-option v-for="a in payAccounts" :key="a.id" :label="(a.label || a.bankName) + ' ' + a.accountNo" :value="a.id" />
                        </el-select>
                      </div>
                      <div><label>金额</label><el-input v-model="ewdForm.amount" placeholder="不超过可提现" /></div>
                      <div class="full"><label>备注</label><el-input v-model="ewdForm.note" /></div>
                    </div>
                  </div>
                </div>
                <div class="sheet" style="margin-bottom:16px">
                  <div class="sheet-hd">
                    <div>
                      <h4>打款信息</h4>
                      <p>对公账户，平台打款时按这里显示的户名和账号转。</p>
                    </div>
                    <el-button @click="savePayAccount">保存打款账户</el-button>
                  </div>
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div><label>账户备注</label><el-input v-model="accForm.label" placeholder="对公账户" /></div>
                      <div><label>开户银行</label><el-input v-model="accForm.bankName" /></div>
                      <div><label>户名</label><el-input v-model="accForm.accountName" /></div>
                      <div><label>账号</label><el-input v-model="accForm.accountNo" /></div>
                    </div>
                    <div class="acct-row" v-for="a in payAccounts" :key="a.id">
                      <span>{{ a.bankName }} · {{ a.accountName }} · {{ a.accountNo }} {{ a.isDefault ? '（默认）' : '' }}</span>
                      <span class="link-btn" @click="deletePayAccount(a)">删除</span>
                    </div>
                    <div v-if="!payAccounts.length" class="sub" style="margin-top:8px">还没有打款账户</div>
                  </div>
                </div>
                <div class="users-table">
                  <div v-if="!ewdList.length" class="empty-board"><b>还没有提现申请</b></div>
                  <table v-else class="grid">
                    <thead><tr><th>金额</th><th>打款账户</th><th>状态</th><th>申请时间</th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="w in ewdList" :key="w.id">
                        <td>{{ moneyYuan(w.amount) }}</td>
                        <td>
                          <div class="name">{{ w.bankName }} {{ w.accountNo }}</div>
                          <div class="sub">{{ w.accountName }} {{ w.note }}</div>
                        </td>
                        <td><span class="tag" :class="w.status==='PAID' ? 'ok' : (w.status==='REJECTED' ? 'off' : 'warn')">{{ w.statusLabel }}</span></td>
                        <td>{{ fmtTime(w.createdAt) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  accForm,
  applyEntWithdraw,
  deletePayAccount,
  ewdForm,
  ewdList,
  finWallet,
  fmtTime,
  moneyYuan,
  payAccounts,
  savePayAccount,
  statusLabel
} = inject("console")
</script>
