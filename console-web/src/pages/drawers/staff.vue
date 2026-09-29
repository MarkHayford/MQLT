<template>
            <el-dialog v-model="staffOpen" :title="staffForm.id ? '企业管理员' : '开通管理账号'" width="520px" append-to-body>
              <div class="edit-grid">
                <div><label>姓名</label><el-input v-model="staffForm.name" /></div>
                <div><label>手机</label><el-input v-model="staffForm.phone" :disabled="!!staffForm.id" maxlength="11" /></div>
                <div class="full">
                  <label>职位</label>
                  <el-select v-model="staffForm.roleId" style="width:100%">
                    <el-option v-for="r in staffRoles" :key="'sr-'+r.id" :label="r.name" :value="r.id" />
                  </el-select>
                </div>
                <div class="full"><label>密码{{ staffForm.id ? '（留空则不改）' : '' }}</label><el-input v-model="staffForm.password" type="password" show-password /></div>
                <div>
                  <label>状态</label>
                  <el-select v-model="staffForm.status" style="width:100%">
                    <el-option label="可用" value="ACTIVE" />
                    <el-option label="停用" value="DISABLED" />
                  </el-select>
                </div>
              </div>
              <template #footer>
                <el-button v-if="staffForm.id" @click="deleteStaff(staffForm)">删除</el-button>
                <el-button @click="staffOpen=false">取消</el-button>
                <el-button type="primary" :loading="staffSaving" @click="saveStaff">保存</el-button>
              </template>
            </el-dialog>
</template>

<script setup>
import { inject } from "vue"
const {
  deleteStaff,
  loading,
  password,
  phone,
  saveStaff,
  staffForm,
  staffOpen,
  staffRoles,
  staffSaving,
  title
} = inject("console")
</script>
