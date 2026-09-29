<template>
            <div class="mask" @click.self="closeProjNotices">
              <aside class="drawer drawer-mall drawer-post" :style="{ width: Math.min(postDrawerPx, 760) + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startPostDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div class="thumb"><img v-if="projCover(projSelected)" :src="projCover(projSelected)" alt="" /><span v-else>研</span></div>
                    <div>
                      <h3>{{ projSelected.title }}</h3>
                      <div class="sub">项目动态 · {{ projNotices.length }} 条</div>
                    </div>
                  </div>
                  <el-button @click="closeProjNotices">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="rv-filters">
                    <el-button type="primary" @click="enterProjWorkspace(projSelected); openPage('dynamics'); openNoticeCreate(projSelected.id)">写动态</el-button>
                    <el-button @click="enterProjWorkspace(projSelected); openPage('dynamics')">打开项目动态</el-button>
                  </div>
                  <div v-if="!projNotices.length" class="empty-board"><b>还没有项目动态</b></div>
                  <div class="rv-item" v-for="n in projNotices" :key="'pnw-'+n.id">
                    <div class="rv-meta">
                      <span class="nv-type">{{ n.type || '测试分类' }}</span>
                      <div class="rv-name">{{ n.title }}</div>
                      <span class="rv-time">{{ prettyDate(n.publishedAt) }}</span>
                    </div>
                    <div class="rv-txt">{{ n.content }}</div>
                    <div class="rv-ops">
                      <span class="link-btn" @click="openNotice(n)">打开</span>
                      <span class="link-btn" @click="deleteNotice(n)">删除</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  closeProjNotices,
  deleteNotice,
  enterProjWorkspace,
  openNotice,
  openNoticeCreate,
  openPage,
  postDrawerPx,
  prettyDate,
  projCover,
  projNotices,
  projSelected,
  startPostDrawerResize,
  title
} = inject("console")
</script>
