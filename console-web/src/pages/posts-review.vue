<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">REVIEW</div>
                    <h3>资讯审批</h3>
                    <p>平台官方稿、学员投稿、企业/项目资讯统一在此审批；通过时须指定平台分类，通过后才会出现在小程序。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ postTotal }}</b><span>待审</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="postKeyword" clearable @keyup.enter="postPage=1; loadReviewQueue()" />
                  <el-button type="primary" :loading="postLoading" @click="postPage=1; loadReviewQueue()">查询</el-button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="postSel.length">
                    <span>已选 {{ postSel.length }} 条</span>
                    <el-button size="small" @click="batchPosts('approve')">通过上架</el-button>
                    <el-button size="small" @click="batchPosts('reject')">驳回</el-button>
                  </div>
                  <div v-if="postLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!postList.length" class="empty-board"><b>没有待审稿件</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('post', postList.map(x=>({...x, id: reviewKeyOf(x)})))" :indeterminate="selSome('post', postList.map(x=>({...x, id: reviewKeyOf(x)})))" @change="(v)=>toggleSelAll('post', postList.map(x=>({...x, id: reviewKeyOf(x)})), v)" @click.stop /></th>
                      <th>标题</th><th>来源</th><th>作者/发布方</th><th>状态</th><th>时间</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ picked: selHas('post', reviewKeyOf(p)) }" v-for="p in postList" :key="reviewKeyOf(p)" @click="openReviewItem(p)">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('post', reviewKeyOf(p))" @change="(v)=>toggleSelOne('post', reviewKeyOf(p), v)" />
                        </td>
                        <td><div class="name">{{ p.title }}</div></td>
                        <td><span class="tag">来源：{{ contentSourceLabel(p) }}</span></td>
                        <td>{{ p.authorName || p.publisher || '—' }}</td>
                        <td><span class="tag warn">{{ postStatusLabel(p.status) }}</span></td>
                        <td>{{ prettyDate(p.createdAt || p.publishedAt) }}</td>
                        <td>
                          <span class="link-btn" @click.stop="postSel=[reviewKeyOf(p)]; batchPosts('approve')">通过</span>
                          <span class="link-btn" style="margin-left:8px" @click.stop="postSel=[reviewKeyOf(p)]; batchPosts('reject')">驳回</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div style="padding:12px 16px" v-if="postTotal > 20">
                    <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="postPage" :total="postTotal" @current-change="(p)=>{ postPage=p; loadReviewQueue() }" />
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  batchPosts,
  contentSourceLabel,
  loadReviewQueue,
  openReviewItem,
  postKeyword,
  postList,
  postLoading,
  postPage,
  postSel,
  postStatusLabel,
  postTotal,
  prettyDate,
  reviewKeyOf,
  selAllOn,
  selHas,
  selSome,
  toggleSelAll,
  toggleSelOne
} = inject("console")
</script>
