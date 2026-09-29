<template>
            <div class="mask approve-mask" @click.self="contentReviewForm.open=false">
              <div class="approve-card" @click.stop>
                <div class="approve-hd">
                  <div class="approve-hd-main">
                    <div class="kicker">APPROVE</div>
                    <h3>通过并上架</h3>
                    <p>为所选稿件指定平台分类后发布到小程序</p>
                  </div>
                  <div class="approve-count">
                    <b>{{ contentReviewForm.count || (contentReviewForm.ids || []).length }}</b>
                    <span>条待审</span>
                  </div>
                </div>
                <div class="approve-bd">
                  <div class="approve-block">
                    <div class="approve-label">平台分类 <em>必选</em></div>
                    <div class="approve-chips" v-if="NOTICE_TYPES.length">
                      <button
                        v-for="t in NOTICE_TYPES"
                        :key="'cr-chip-'+t"
                        type="button"
                        class="approve-chip"
                        :class="{ on: contentReviewForm.category === t }"
                        @click="contentReviewForm.category = t"
                      >{{ t }}</button>
                    </div>
                    <div v-else class="approve-empty">暂无分类，请先到「资讯 → 分类」配置</div>
                  </div>
                  <div class="approve-block">
                    <div class="approve-label">审批备注 <em>可选</em></div>
                    <el-input
                      v-model="contentReviewForm.note"
                      type="textarea"
                      :rows="3"
                      maxlength="200"
                      show-word-limit
                      placeholder="可填写上架说明，仅后台可见"
                    />
                  </div>
                  <div class="approve-tip">通过后稿件将按所选分类出现在小程序资讯流；动态类内容不走此审批。</div>
                </div>
                <div class="approve-ft">
                  <el-button @click="contentReviewForm.open=false">取消</el-button>
                  <el-button type="primary" :loading="contentReviewSaving" :disabled="!NOTICE_TYPES.length" @click="submitContentReview">确认通过上架</el-button>
                </div>
              </div>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  NOTICE_TYPES,
  contentReviewForm,
  contentReviewSaving,
  loading,
  submitContentReview
} = inject("console")
</script>
