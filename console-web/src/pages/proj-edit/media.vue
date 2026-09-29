<template>
                  <div>
                    <div class="gallery-row">
                      <div class="gallery-item" v-for="(url, i) in (projForm.mediaColors || [])" :key="'pm-'+i">
                        <img :src="url" alt="" />
                        <button class="gallery-del" type="button" @click="removeProjMedia(i)">×</button>
                      </div>
                      <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="uploadProjMedia">
                        <div class="gallery-add">+</div>
                      </el-upload>
                    </div>
                    <div class="full" style="margin-top:12px" v-if="!isMerchant"><label>标签（逗号分隔）</label>
                      <el-input :model-value="(projForm.tags || []).join(',')" @change="(v)=>projForm.tags=String(v||'').split(/[,，]/).map(s=>s.trim()).filter(Boolean)" />
                    </div>
                    <div class="full" style="margin-top:12px" v-else>
                      <label>标签</label>
                      <div class="sub">{{ (projForm.tags || []).length ? projForm.tags.join('、') : '由平台审批时填写' }}</div>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  isMerchant,
  projForm,
  removeProjMedia,
  uploadProjMedia
} = inject("console")
</script>
