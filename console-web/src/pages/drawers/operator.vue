<template>
            <el-dialog v-model="opOpen" :title="opForm.id ? '控制台账号' : '新增控制台账号'" width="520px" append-to-body>
              <div class="edit-grid">
                <div><label>姓名</label><el-input v-model="opForm.name" /></div>
                <div><label>手机</label><el-input v-model="opForm.phone" :disabled="!!opForm.id" maxlength="11" /></div>
                <div class="full">
                  <label>职位</label>
                  <el-select v-model="opForm.mpRole" style="width:100%">
                    <el-option v-for="r in opRoles" :key="r.value" :label="r.label" :value="r.value" />
                  </el-select>
                </div>
                <div class="full"><label>密码{{ opForm.id ? '（留空则不改）' : '' }}</label><el-input v-model="opForm.password" type="password" show-password /></div>
                <div>
                  <label>状态</label>
                  <el-select v-model="opForm.status" style="width:100%">
                    <el-option label="可用" value="ACTIVE" />
                    <el-option label="停用" value="DISABLED" />
                  </el-select>
                </div>
                <div class="full" style="display:flex;gap:16px">
                  <el-checkbox v-model="opForm.mpAccess">运维管理</el-checkbox>
                  <el-checkbox v-model="opForm.merchantAccess">入驻企业</el-checkbox>
                </div>
                <div class="full" v-if="opForm.merchantAccess">
                  <label>绑定企业</label>
                  <el-select v-model="opForm.enterpriseId" filterable style="width:100%" placeholder="选择入驻企业">
                    <el-option v-for="e in projEnterprises" :key="'op-'+e.id" :label="(e.shortName || e.name)" :value="e.id" />
                  </el-select>
                </div>
              </div>
              <template #footer>
                <el-button @click="opOpen=false">取消</el-button>
                <el-button type="primary" :loading="opSaving" @click="saveOperator">保存</el-button>
              </template>
            </el-dialog>
</template>

<script setup>
import { inject } from "vue"
const {
  loading,
  opForm,
  opOpen,
  opRoles,
  opSaving,
  password,
  phone,
  projEnterprises,
  saveOperator,
  title
} = inject("console")
</script>
