<template>
            <el-dialog v-model="mpStaffOpen" :title="mpStaffForm.id ? '平台管理员' : '开通平台账号'" width="520px" append-to-body>
              <div class="edit-grid">
                <div><label>姓名</label><el-input v-model="mpStaffForm.name" /></div>
                <div><label>手机</label><el-input v-model="mpStaffForm.phone" :disabled="!!mpStaffForm.id" maxlength="11" /></div>
                <div class="full">
                  <label>职位</label>
                  <el-select v-model="mpStaffForm.roleId" style="width:100%">
                    <el-option v-for="r in mpRoles" :key="'mpr-'+r.id" :label="r.name" :value="r.id" />
                  </el-select>
                </div>
                <div class="full"><label>密码{{ mpStaffForm.id ? '（留空则不改）' : '' }}</label><el-input v-model="mpStaffForm.password" type="password" show-password /></div>
                <div>
                  <label>状态</label>
                  <el-select v-model="mpStaffForm.status" style="width:100%">
                    <el-option label="可用" value="ACTIVE" />
                    <el-option label="停用" value="DISABLED" />
                  </el-select>
                </div>
              </div>
              <template #footer>
                <el-button v-if="mpStaffForm.id" @click="deleteMpStaff(mpStaffForm)">删除</el-button>
                <el-button @click="mpStaffOpen=false">取消</el-button>
                <el-button type="primary" :loading="mpSaving" @click="saveMpStaff">保存</el-button>
              </template>
            </el-dialog>
</template>

<script setup>
import { inject } from "vue"
const {
  deleteMpStaff,
  loading,
  mpRoles,
  mpSaving,
  mpStaffForm,
  mpStaffOpen,
  password,
  phone,
  saveMpStaff,
  title
} = inject("console")
</script>
