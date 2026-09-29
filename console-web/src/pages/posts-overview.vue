<template>
              <div class="users-page">
                <div class="hq">
                  <div class="hq-banner">
                    <div class="kicker">MEDIA</div>
                    <h3>资讯总览</h3>
                    <p>小程序资讯页内容，不绑定企业。</p>
                    <div class="hq-banner-right">
                      <b>{{ postTotal }}</b>
                      <span>当前列表</span>
                    </div>
                  </div>
                  <div class="hq-bottom">
                    <div class="hq-panel">
                      <h4>快捷</h4>
                      <div class="quick-grid">
                        <button class="quick-card" type="button" @click="openPage('posts-review')"><b>去审批</b><span>平台/企业/项目</span></button>
                        <button class="quick-card" type="button" @click="openPage('posts-publish')"><b>去发布</b><span>官方发稿（需审批）</span></button>
                        <button class="quick-card" type="button" @click="openPage('posts-cats')"><b>改分类</b><span>平台分类 / 标签 / 频道</span></button>
                        <button class="quick-card" type="button" @click="openPage('posts-dynamics')"><b>项目动态</b><span>全平台动态（免审）</span></button>
                        <button class="quick-card" type="button" @click="openPage('posts-units')"><b>发布单位</b><span>企业/项目各一个发布单位名</span></button>
                      </div>
                    </div>
                    <div class="hq-panel">
                      <h4>最近稿件</h4>
                      <div v-if="!postList.length" class="quiet">暂无文章</div>
                      <div class="hq-feed" v-for="p in (postList || []).slice(0,6)" :key="'po-'+p.id" @click="openReviewItem(p)">
                        <div class="name">{{ p.title }}</div>
                        <div class="sub">{{ postStatusLabel(p.status) }} · {{ prettyDate(p.createdAt) }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="postKeyword" clearable @keyup.enter="postPage=1; loadPosts()" />
                  <el-button type="primary" :loading="postLoading" @click="postPage=1; loadPosts()">查询</el-button>
                  <button class="chip" :class="{ on: postStatus==='all' }" @click="postStatus='all'; postPage=1; loadPosts()">全部</button>
                  <button class="chip" :class="{ on: postStatus==='published' }" @click="postStatus='published'; postPage=1; loadPosts()">已上架</button>
                  <button class="chip" :class="{ on: postStatus==='private' }" @click="postStatus='private'; postPage=1; loadPosts()">已下架</button>
                </div>
                <div class="users-table">
                  <div v-if="postLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!postList.length" class="empty-board"><b>还没有资讯文章</b></div>
                  <table v-else class="grid">
                    <thead><tr><th>标题</th><th>作者</th><th>状态</th><th>时间</th><th></th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="p in postList" :key="p.id" @click="openReviewItem(p)">
                        <td><div class="name">{{ p.title }}</div><div class="sub" v-if="isStudyNoticeRow(p)">企业资讯</div></td>
                        <td>{{ p.authorName || p.publisher || '—' }}</td>
                        <td><span class="tag" :class="p.status==='published' ? 'ok' : (p.status==='pending' ? 'warn' : 'off')">{{ postStatusLabel(p.status) }}</span></td>
                        <td>{{ prettyDate(p.createdAt || p.publishedAt) }}</td>
                        <td><span class="link-btn">打开</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <div style="padding:12px 16px" v-if="postTotal > 20">
                    <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="postPage" :total="postTotal" @current-change="(p)=>{ postPage=p; loadPosts() }" />
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  isStudyNoticeRow,
  loadPosts,
  openPage,
  openReviewItem,
  postKeyword,
  postList,
  postLoading,
  postPage,
  postStatus,
  postStatusLabel,
  postTotal,
  prettyDate
} = inject("console")
</script>
