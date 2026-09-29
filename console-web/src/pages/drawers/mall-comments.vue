<template>
            <div class="mask" @click.self="closeMallComments">
              <aside class="drawer drawer-mall drawer-post" :style="{ width: Math.min(postDrawerPx, 880) + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startPostDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div class="thumb">
                      <img v-if="productImg(mallSelected)" :src="productImg(mallSelected)" alt="" />
                      <span v-else>{{ productInitial(mallSelected) }}</span>
                    </div>
                    <div>
                      <h3>{{ mallSelected.name }}</h3>
                      <div class="sub">评价回复 · {{ mallCommentTotal }} 条</div>
                    </div>
                  </div>
                  <el-button @click="closeMallComments">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="rv-head">
                    <div class="rv-score">{{ mallRatingAvg || '—' }}<span>{{ mallRatingCount }} 人评分</span></div>
                  </div>
                  <div class="rv-filters">
                    <el-input v-model="mallCommentKeyword" clearable placeholder="搜评价" style="width:180px" @keyup.enter="mallCommentPage=1; loadMallComments(mallSelected.id)" />
                    <el-date-picker v-model="mallCommentDate" type="date" value-format="YYYY-MM-DD" placeholder="日期" style="width:140px" @change="mallCommentPage=1; loadMallComments(mallSelected.id)" />
                    <button class="chip" :class="{ on: mallCommentRating==='' }" @click="mallCommentRating=''; mallCommentPage=1; loadMallComments(mallSelected.id)">全部</button>
                    <button class="chip" v-for="s in [5,4,3,2,1]" :key="'rs'+s" :class="{ on: mallCommentRating===String(s) }" @click="mallCommentRating=String(s); mallCommentPage=1; loadMallComments(mallSelected.id)">{{ s }} 星</button>
                  </div>
                  <div v-if="!mallCommentGroups.length" class="empty-board"><b>还没有评价</b></div>
                  <div v-for="g in mallCommentGroups" :key="'rvg-'+g.date">
                    <div class="cmt-date">{{ g.date }}</div>
                    <div class="rv-item" v-for="entry in walkComments(g.items)" :key="entry.row.id" :class="{ reply: entry.depth }">
                      <div class="rv-meta">
                        <div class="rv-ava">{{ (entry.row.authorName || '评').slice(0,1) }}</div>
                        <div>
                          <div class="rv-name">{{ entry.row.authorName || '学员' }}</div>
                          <div v-if="entry.row.rating" class="rv-stars">{{ starText(entry.row.rating) }}</div>
                        </div>
                        <span class="tag" :class="entry.row.status==='HIDDEN' ? 'off' : 'ok'">{{ entry.row.status==='HIDDEN' ? '已隐藏' : '显示' }}</span>
                        <span class="rv-time">{{ prettyDate(entry.row.createdAt) }}</span>
                      </div>
                      <div v-if="entry.row.replyToName" class="rv-to">回复 {{ entry.row.replyToName }}</div>
                      <div class="rv-txt">{{ entry.row.content }}</div>
                      <div class="rv-ops">
                        <span class="link-btn" @click="mallReplyFor=entry.row.id">回复</span>
                        <span class="link-btn" @click="hideMallComment(entry.row)">{{ entry.row.status==='HIDDEN' ? '显示' : '隐藏' }}</span>
                        <span class="link-btn" @click="deleteMallComment(entry.row)">删除</span>
                      </div>
                    </div>
                  </div>
                  <div style="margin:8px 0 12px" v-if="mallCommentTotal > mallCommentPageSize">
                    <el-pagination layout="prev, pager, next, total" :page-size="mallCommentPageSize" :current-page="mallCommentPage" :total="mallCommentTotal" @current-change="changeMallCommentPage" />
                  </div>
                </div>
                <div class="rv-dock">
                  <div class="rv-hint" v-if="mallReplyTarget">
                    <span>回复 {{ mallReplyTarget.authorName }}：{{ mallReplyTarget.content }}</span>
                    <span class="link-btn" @click="mallReplyFor=''">取消回复</span>
                  </div>
                  <div class="rv-bar">
                    <input v-model="mallReplyText" maxlength="200" :placeholder="mallReplyFor ? '写回复…' : '官方回复…'" @keyup.enter="replyMallComment" />
                    <button class="rv-send" type="button" :disabled="mallSaving || !mallReplyText.trim()" @click="replyMallComment">发送</button>
                  </div>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  changeMallCommentPage,
  closeMallComments,
  deleteMallComment,
  hideMallComment,
  loadMallComments,
  mallCommentDate,
  mallCommentGroups,
  mallCommentKeyword,
  mallCommentPage,
  mallCommentPageSize,
  mallCommentRating,
  mallCommentTotal,
  mallRatingAvg,
  mallRatingCount,
  mallReplyFor,
  mallReplyTarget,
  mallReplyText,
  mallSaving,
  mallSelected,
  postDrawerPx,
  prettyDate,
  productImg,
  productInitial,
  replyMallComment,
  starText,
  startPostDrawerResize,
  walkComments
} = inject("console")
</script>
