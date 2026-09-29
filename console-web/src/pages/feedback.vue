<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">FEEDBACK</div>
                    <h3>反馈与建议</h3>
                    <p>小程序用户提交的意见与建议</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ fbStats.pending }}</b><span>待处理</span></div>
                    <div><b>{{ fbStats.replied }}</b><span>已回复</span></div>
                    <div><b>{{ fbStats.closed }}</b><span>已关闭</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <button class="chip" :class="{ on: fbFilter==='all' }" @click="fbFilter='all'; loadFeedback()">全部</button>
                  <button class="chip" :class="{ on: fbFilter==='pending' }" @click="fbFilter='pending'; loadFeedback()">待处理</button>
                  <button class="chip" :class="{ on: fbFilter==='replied' }" @click="fbFilter='replied'; loadFeedback()">已回复</button>
                  <button class="chip" :class="{ on: fbFilter==='closed' }" @click="fbFilter='closed'; loadFeedback()">已关闭</button>
                  <button class="chip" :class="{ on: fbFilter==='withdrawn' }" @click="fbFilter='withdrawn'; loadFeedback()">已撤回</button>
                  <el-button type="primary" :loading="fbLoading" @click="loadFeedback()">刷新</el-button>
                </div>
                <div class="users-table">
                  <div v-if="fbLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!fbList.length" class="empty-board"><b>暂无反馈</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th>类型</th><th>内容摘要</th><th>用户</th><th>联系方式</th><th>状态</th><th>提交时间</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" v-for="f in fbList" :key="f.id" @click="openFeedback(f)">
                        <td>{{ feedbackTypeLabel(f.type) }}</td>
                        <td>
                          <div class="name">{{ fbContentBrief(f.content) }}</div>
                          <div class="sub" v-if="fbTagsText(f)">{{ fbTagsText(f) }}</div>
                        </td>
                        <td>
                          <div class="name">{{ (f.user && f.user.nickname) || '—' }}</div>
                          <div class="sub">{{ fbUserLine(f) }}</div>
                        </td>
                        <td>{{ fbContactLine(f) }}</td>
                        <td>
                          <span class="tag" :class="isPendingFbStatus(f.status) ? 'warn' : (String(f.status).toLowerCase()==='withdrawn' ? 'off' : 'ok')">{{ feedbackLabel(f.status) }}</span>
                        </td>
                        <td>{{ fmtTime(f.createdAt) }}</td>
                        <td><span class="link-btn">查看</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  fbContactLine,
  fbContentBrief,
  fbFilter,
  fbList,
  fbLoading,
  fbStats,
  fbTagsText,
  fbUserLine,
  feedbackLabel,
  feedbackTypeLabel,
  fmtTime,
  isPendingFbStatus,
  loadFeedback,
  openFeedback
} = inject("console")
</script>
