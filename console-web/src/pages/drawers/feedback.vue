<template>
            <div class="mask" @click.self="closeFeedback">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div>
                    <div class="kicker">FEEDBACK</div>
                    <h3>{{ fbSelected ? feedbackTypeLabel(fbSelected.type) : '反馈详情' }}</h3>
                    <div class="sub" v-if="fbSelected">{{ feedbackLabel(fbSelected.status) }} · {{ fmtTime(fbSelected.createdAt) }}</div>
                  </div>
                  <el-button @click="closeFeedback">关闭</el-button>
                </div>
                <div class="drawer-body" v-if="fbSelected">
                  <div class="block">
                    <div class="kicker">内容</div>
                    <div class="kv">
                      <div class="full"><label>正文</label><b style="white-space:pre-wrap;font-weight:600">{{ fbSelected.content || '—' }}</b></div>
                      <div class="full" v-if="fbTagsText(fbSelected)"><label>标签</label><b>{{ fbTagsText(fbSelected) }}</b></div>
                      <div><label>类型</label><b>{{ feedbackTypeLabel(fbSelected.type) }}</b></div>
                      <div><label>状态</label><b>{{ feedbackLabel(fbSelected.status) }}</b></div>
                    </div>
                  </div>
                  <div class="block">
                    <div class="kicker">用户</div>
                    <div class="kv">
                      <div><label>昵称</label><b>{{ (fbSelected.user && fbSelected.user.nickname) || '—' }}</b></div>
                      <div><label>研学号</label><b>{{ (fbSelected.user && fbSelected.user.studyNo) || '—' }}</b></div>
                      <div><label>手机</label><b>{{ (fbSelected.user && fbSelected.user.phone) ? maskPhone(fbSelected.user.phone) : '—' }}</b></div>
                      <div class="full"><label>联系方式</label><b>{{ fbContactLine(fbSelected) }}</b></div>
                    </div>
                  </div>
                  <div class="block">
                    <div class="kicker">回复</div>
                    <div v-if="!canFeedbackManage" class="kv">
                      <div class="full"><label>回复内容</label><b style="white-space:pre-wrap;font-weight:600">{{ fbSelected.reply || '暂无回复' }}</b></div>
                    </div>
                    <div v-else class="edit-grid">
                      <div class="full">
                        <label>回复内容</label>
                        <el-input v-model="fbReply" type="textarea" :rows="5" placeholder="填写回复给用户的内容" maxlength="2000" show-word-limit />
                      </div>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot" v-if="fbSelected && canFeedbackManage">
                  <el-button type="primary" :loading="fbSaving" @click="saveFeedbackStatus('replied')">标记已回复</el-button>
                  <el-button :loading="fbSaving" @click="saveFeedbackStatus('closed')">关闭</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  canFeedbackManage,
  closeFeedback,
  detailDrawerPx,
  fbContactLine,
  fbReply,
  fbSaving,
  fbSelected,
  fbTagsText,
  feedbackLabel,
  feedbackTypeLabel,
  fmtTime,
  loading,
  maskPhone,
  phone,
  saveFeedbackStatus,
  startDetailDrawerResize
} = inject("console")
</script>
