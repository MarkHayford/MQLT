<template>
                  <div class="edit-grid">
                    <div class="full"><label>名称</label><el-input v-model="projForm.title" maxlength="40" /></div>
                    <div class="full"><label>副标题</label><el-input v-model="projForm.subtitle" maxlength="80" /></div>
                    <div v-if="!isMerchant"><label>分类</label><el-input v-model="projForm.category" /></div>
                    <div v-else><label>分类</label><el-input :model-value="projForm.category || '由平台审批时填写'" disabled /></div>
                    <div><label>售价</label><el-input v-model="projForm.price" /></div>
                    <div class="full" v-if="isMerchant && (projForm.status==='待审批' || projForm.status==='已驳回')">
                      <label>状态</label>
                      <el-input :model-value="projForm.status" disabled />
                    </div>
                    <div class="full" v-else>
                      <label>状态</label>
                      <el-select v-model="projForm.status" style="width:100%">
                        <el-option label="暂未开放" value="暂未开放" />
                        <el-option label="可预约" value="可预约" />
                        <el-option label="预约满员" value="预约满员" />
                        <el-option label="正在进行中" value="正在进行中" />
                        <el-option label="已结束" value="已结束" />
                      </el-select>
                    </div>
                    <div class="full">
                      <label>隶属企业</label>
                      <el-select v-model="projForm.enterpriseId" :disabled="inEntWorkspace" clearable style="width:100%">
                        <el-option v-for="e in projEnterprises" :key="e.id" :label="e.shortName || e.name" :value="e.id" />
                      </el-select>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  inEntWorkspace,
  isMerchant,
  projEnterprises,
  projForm
} = inject("console")
</script>
