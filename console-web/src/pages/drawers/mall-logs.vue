<template>
            <div class="mask" @click.self="closeMallLogs">
              <aside class="drawer drawer-mall drawer-post" :style="{ width: Math.min(postDrawerPx, 760) + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startPostDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div class="thumb">
                      <img v-if="productImg(mallSelected)" :src="productImg(mallSelected)" alt="" />
                      <span v-else>{{ productInitial(mallSelected) }}</span>
                    </div>
                    <div>
                      <h3>{{ mallSelected.name }}</h3>
                      <div class="sub">操作日志 · {{ mallLogTotal }} 条</div>
                    </div>
                  </div>
                  <el-button @click="closeMallLogs">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="rv-filters">
                    <el-button @click="clearLogs({ productId: mallSelected && mallSelected.id }, ()=>{ mallLogPage=1; return loadMallLogs(mallSelected.id) })">清理本商品日志</el-button>
                  </div>
                  <div v-if="!mallLogs.length" class="empty-board"><b>还没有操作记录</b></div>
                  <div v-else>
                    <div class="lg-item" v-for="row in mallLogs" :key="row.id">
                      <div class="lg-dot"></div>
                      <div class="lg-body">
                        <div class="lg-sum">{{ row.summary }}</div>
                        <div class="lg-meta">{{ row.actorName || '运维' }} · {{ fmtTime(row.createdAt) }} · {{ logModuleLabel(row.module) }}</div>
                        <div class="rv-ops">
                          <span class="link-btn" @click="deleteLog(row.id, ()=>loadMallLogs(mallSelected.id))">删除这条</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style="margin:12px 0" v-if="mallLogTotal > mallLogPageSize">
                    <el-pagination layout="prev, pager, next, total" :page-size="mallLogPageSize" :current-page="mallLogPage" :total="mallLogTotal" @current-change="changeMallLogPage" />
                  </div>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  changeMallLogPage,
  clearLogs,
  closeMallLogs,
  deleteLog,
  fmtTime,
  loadMallLogs,
  logModuleLabel,
  mallLogPage,
  mallLogPageSize,
  mallLogTotal,
  mallLogs,
  mallSelected,
  postDrawerPx,
  productImg,
  productInitial,
  startPostDrawerResize
} = inject("console")
</script>
