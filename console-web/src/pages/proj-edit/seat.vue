<template>
                  <div class="edit-grid">
                    <div><label>已报名</label><el-input-number v-model="projForm.enrolled" :min="0" /></div>
                    <div><label>名额上限</label><el-input-number v-model="projForm.maxCapacity" :min="1" /></div>
                    <div class="full" style="margin-top:8px">
                      <label>可预约天数</label>
                      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:6px">
                        <el-input-number v-model="projForm.bookableDays" :min="1" :max="365" />
                        <span class="sub">天（含今天）</span>
                      </div>
                      <div class="sub" style="margin-top:6px">学员日历仅开放「今天起连续 N 天」。暂停某日请用「研学 Live」。</div>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  projForm
} = inject("console")
</script>
