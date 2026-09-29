<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">LOGS</div>
                    <h3>操作日志</h3>
                    <p>{{ inProjWorkspace ? '本项目相关的后台操作记录。' : (inEntWorkspace ? '本企业相关的后台操作记录。' : '用户、商品与评价的后台操作记录。') }}</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ logTotal }}</b><span>全部</span></div>
                    <div><b>{{ logList.length }}</b><span>本页</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="logKeyword" placeholder="摘要 / 操作人 / 对象" clearable @keyup.enter="loadLogs" />
                  <el-date-picker v-model="logFrom" type="date" value-format="YYYY-MM-DD" placeholder="从" style="width:140px" />
                  <el-date-picker v-model="logTo" type="date" value-format="YYYY-MM-DD" placeholder="到" style="width:140px" />
                  <el-button type="primary" :loading="logLoading" @click="logPage=1; loadLogs()">查询</el-button>
                  <button class="chip" :class="{ on: logModule==='all' }" @click="logModule='all'; logPage=1; loadLogs()">全部</button>
                  <template v-if="!inEntWorkspace">
                    <button class="chip" :class="{ on: logModule==='user' }" @click="logModule='user'; logPage=1; loadLogs()">用户</button>
                    <button class="chip" :class="{ on: logModule==='mall' }" @click="logModule='mall'; logPage=1; loadLogs()">商品</button>
                    <button class="chip" :class="{ on: logModule==='comment' }" @click="logModule='comment'; logPage=1; loadLogs()">评价</button>
                    <button class="chip" :class="{ on: logModule==='rental' }" @click="logModule='rental'; logPage=1; loadLogs()">租车</button>
                  </template>
                  <template v-else-if="inProjWorkspace">
                    <button class="chip" :class="{ on: logModule==='study' }" @click="logModule='study'; logPage=1; loadLogs()">研学</button>
                    <button class="chip" :class="{ on: logModule==='mall' }" @click="logModule='mall'; logPage=1; loadLogs()">商品</button>
                    <button class="chip" :class="{ on: logModule==='booking' }" @click="logModule='booking'; logPage=1; loadLogs()">预约</button>
                    <button class="chip" :class="{ on: logModule==='content' }" @click="logModule='content'; logPage=1; loadLogs()">动态</button>
                  </template>
                  <template v-else>
                    <button class="chip" :class="{ on: logModule==='study' }" @click="logModule='study'; logPage=1; loadLogs()">研学</button>
                    <button class="chip" :class="{ on: logModule==='mall' }" @click="logModule='mall'; logPage=1; loadLogs()">商品</button>
                    <button class="chip" :class="{ on: logModule==='finance' }" @click="logModule='finance'; logPage=1; loadLogs()">财务</button>
                    <button class="chip" :class="{ on: logModule==='settings' }" @click="logModule='settings'; logPage=1; loadLogs()">设置</button>
                  </template>
                  <el-button v-if="area==='mp'" @click="clearLogs({ module: logModule==='all' ? '' : logModule, keyword: logKeyword, from: logFrom, to: logTo, enterpriseId: inEntWorkspace ? scopeEid : undefined, projectId: inProjWorkspace ? scopePid : undefined }, ()=>{ logPage=1; return loadLogs() })">清理</el-button>
                </div>
                <div class="users-table" style="padding:16px">
                  <div v-if="logLoading" class="empty-board"><b>正在载入</b>请稍候</div>
                  <div v-else-if="!logList.length" class="empty-board"><b>没有操作记录</b></div>
                  <div v-else class="log-item" v-for="row in logList" :key="row.id">
                    <div class="top">
                      <span class="ttl">{{ row.summary }}</span>
                      <span>
                        <span class="tag">{{ logModuleLabel(row.module) }}</span>
                        <span class="link-btn" v-if="area==='mp'" @click="deleteLog(row.id, loadLogs)">清理</span>
                      </span>
                    </div>
                    <div class="meta">{{ row.actorName || '运维' }} · {{ fmtTime(row.createdAt) }}{{ row.targetLabel ? ' · ' + row.targetLabel : '' }}</div>
                  </div>
                  <div style="padding:8px 0 8px" v-if="logTotal > logPageSize">
                    <el-pagination layout="prev, pager, next, total" :page-size="logPageSize" :current-page="logPage" :total="logTotal" @current-change="(p)=>{ logPage=p; loadLogs() }" />
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  area,
  clearLogs,
  deleteLog,
  fmtTime,
  inEntWorkspace,
  inProjWorkspace,
  loadLogs,
  logFrom,
  logKeyword,
  logList,
  logLoading,
  logModule,
  logModuleLabel,
  logPage,
  logPageSize,
  logTo,
  logTotal,
  scopeEid,
  scopePid
} = inject("console")
</script>
