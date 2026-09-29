<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">PROFILE</div>
                    <h3>档案</h3>
                    <p>仅平台管理员可改企业资料和开通企业账号。</p>
                  </div>
                </div>
                <div class="sheet">
                  <div class="sheet-hd">
                    <div>
                      <h4>企业资料</h4>
                      <p>仅平台管理员可改。保存后企业账号看到的名称也会更新。</p>
                    </div>
                    <div style="display:flex;gap:10px">
                      <el-button type="primary" :loading="entSaving" @click="saveEnt">保存</el-button>
                      <el-button v-if="entForm.id" @click="deleteEnt">删除企业</el-button>
                    </div>
                  </div>
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div class="full"><label>企业名称</label><el-input v-model="entForm.name" maxlength="40" /></div>
                      <div><label>简称</label><el-input v-model="entForm.shortName" maxlength="20" /></div>
                      <div>
                        <label>状态</label>
                        <el-select v-model="entForm.status" style="width:100%">
                          <el-option label="合作中" value="ACTIVE" />
                          <el-option label="待审" value="PENDING" />
                          <el-option label="停用" value="SUSPENDED" />
                        </el-select>
                      </div>
                      <div><label>联系人</label><el-input v-model="entForm.contactName" /></div>
                      <div><label>电话</label><el-input v-model="entForm.contactPhone" maxlength="11" /></div>
                      <div class="full"><label>地址</label><el-input v-model="entForm.address" /></div>
                      <div class="full"><label>简介</label><el-input v-model="entForm.intro" type="textarea" :rows="3" /></div>
                    </div>
                    <div style="margin-top:16px" v-if="entSelected && (entSelected.projects || []).length">
                      <div class="kicker">隶属项目</div>
                      <div class="acct-row" v-for="p in entSelected.projects" :key="'epp-'+p.id">
                        <span>{{ p.title }}</span>
                        <span class="tag">{{ p.status }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="sheet">
                  <div class="sheet-hd">
                    <div>
                      <h4>控制台账号</h4>
                      <p>开通后该手机号可以登录入驻企业后台。</p>
                    </div>
                    <el-button @click="openEntOperator">开通企业账号</el-button>
                  </div>
                  <div class="sheet-bd">
                    <div class="acct-row" v-for="op in (entSelected && entSelected.operators) || []" :key="'eop-'+op.id" @click="openOp(op)" style="cursor:pointer">
                      <span>{{ op.name || op.phone }} · {{ op.phone }}</span>
                      <span class="tag" :class="op.status==='ACTIVE' ? 'ok' : 'off'">{{ op.status==='ACTIVE' ? '可用' : '停用' }}</span>
                    </div>
                    <div v-if="!(entSelected && (entSelected.operators || []).length)" class="sub">还没有企业账号</div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  deleteEnt,
  entForm,
  entSaving,
  entSelected,
  openEntOperator,
  openOp,
  saveEnt
} = inject("console")
</script>
