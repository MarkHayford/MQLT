<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">PUBLISH</div>
                    <h3>资讯发布</h3>
                    <p>官方发稿与草稿。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ postTotal }}</b><span>本列表</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-button type="primary" @click="openPostCreate()">官方发稿</el-button>
                  <button class="chip" :class="{ on: postStatus==='draft' }" @click="postStatus='draft'; postPage=1; loadPosts()">草稿</button>
                  <button class="chip" :class="{ on: postStatus==='pending' }" @click="postStatus='pending'; postPage=1; loadPosts()">待审</button>
                  <button class="chip" :class="{ on: postStatus==='published' }" @click="postStatus='published'; postPage=1; loadPosts()">已通过</button>
                  <button class="chip" :class="{ on: postStatus==='rejected' }" @click="postStatus='rejected'; postPage=1; loadPosts()">已驳回</button>
                  <el-input class="users-search" v-model="postKeyword" clearable @keyup.enter="postPage=1; loadPosts()" />
                  <el-button :loading="postLoading" @click="postPage=1; loadPosts()">查询</el-button>
                </div>
                <div class="users-table">
                  <div v-if="postLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!postList.length" class="empty-board"><b>还没有稿件</b><p>点「官方发稿」写一篇。</p></div>
                  <table v-else class="grid">
                    <thead><tr><th>标题</th><th>状态</th><th>时间</th><th></th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="p in postList" :key="p.id" @click="openPost(p)">
                        <td><div class="name">{{ p.title }}</div></td>
                        <td><span class="tag" :class="p.status==='published' ? 'ok' : 'warn'">{{ postStatusLabel(p.status) }}</span></td>
                        <td>{{ prettyDate(p.createdAt) }}</td>
                        <td><span class="link-btn">编辑</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  loadPosts,
  openPost,
  openPostCreate,
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
