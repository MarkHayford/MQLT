<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">DYNAMICS</div>
                    <h3>项目动态</h3>
                    <p>管理全平台各企业/项目动态（免审；话题企业自填，分类由平台指定）</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ noticeTotal }}</b><span>动态</span></div>
                  </div>
                </div>
                <div>
                  <div class="users-bar">
                    <el-select v-model="noticeEnterpriseId" clearable placeholder="全部企业" style="width:200px" @change="onNoticeEnterpriseChange">
                      <el-option v-for="e in (projEnterprises.length ? projEnterprises : entList)" :key="'nde-'+e.id" :label="(e.shortName || e.name)" :value="e.id" />
                    </el-select>
                    <el-select v-model="noticeProjectId" clearable placeholder="全部项目" style="width:220px" @change="noticePage=1; loadNotices()">
                      <el-option v-for="p in noticeProjectOptions" :key="'ndp-'+p.id" :label="p.title" :value="p.id" />
                    </el-select>
                    <el-input class="users-search" v-model="noticeKeyword" clearable placeholder="关键词" @keyup.enter="noticePage=1; loadNotices()" />
                    <el-button type="primary" :loading="noticeLoading" @click="noticePage=1; loadNotices()">查询</el-button>
                    <el-button @click="loadSettings(); loadEnterprises(); loadProjectsForNoticeFilter(); noticePage=1; loadNotices()">刷新</el-button>
                    <el-button @click="openNoticeCreate()">写动态</el-button>
                  </div>
                  <div class="tax-card solo">
                    <div class="tax-card-hd">
                      <h4>动态话题与分类</h4>
                      <p>话题标签由企业/项目自填；分类由平台在此指定（可后续补设），不影响动态已发布状态。</p>
                    </div>
                  </div>
                  <div class="users-table">
                    <div class="batch-bar" v-if="noticeSel.length">
                      <span>已选 {{ noticeSel.length }} 条</span>
                      <el-button size="small" @click="batchDeleteByUrl('/api/v1/admin/notices/batch-delete', 'notice', loadNotices)">删除所选</el-button>
                    </div>
                    <div v-if="noticeLoading" class="empty-board"><b>正在载入</b></div>
                    <div v-else-if="!noticeList.length" class="empty-board"><b>还没有项目动态</b></div>
                    <table v-else class="grid">
                      <thead><tr>
                        <th class="check"><el-checkbox :model-value="selAllOn('notice', noticeList)" :indeterminate="selSome('notice', noticeList)" @change="(v)=>toggleSelAll('notice', noticeList, v)" @click.stop /></th>
                        <th>企业</th><th>项目</th><th>标题</th><th>分类</th><th>发布单位</th><th>时间</th><th>操作</th>
                      </tr></thead>
                      <tbody>
                        <tr class="row" :class="{ picked: selHas('notice', n.id) }" v-for="n in noticeList" :key="n.id">
                          <td class="check" @click.stop>
                            <el-checkbox :model-value="selHas('notice', n.id)" @change="(v)=>toggleSelOne('notice', n.id, v)" />
                          </td>
                          <td>{{ n.enterpriseName || '—' }}</td>
                          <td>{{ n.projectTitle || n.projectName || '—' }}</td>
                          <td><div class="name">{{ n.title }}</div></td>
                          <td>{{ n.category || n.type || '待分类' }}</td>
                          <td>{{ n.publisher || '—' }}</td>
                          <td>{{ prettyDate(n.publishedAt) }}</td>
                          <td @click.stop>
                            <span class="link-btn" @click="openNotice(n)">查看</span>
                            <span class="link-btn" @click="openNotice(n)">编辑</span>
                            <span class="link-btn" @click="deleteNotice(n)">删除</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div style="padding:12px 16px" v-if="noticeTotal > 20">
                      <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="noticePage" :total="noticeTotal" @current-change="(p)=>{ noticePage=p; loadNotices() }" />
                    </div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  batchDeleteByUrl,
  deleteNotice,
  entList,
  loadEnterprises,
  loadNotices,
  loadProjectsForNoticeFilter,
  loadSettings,
  noticeEnterpriseId,
  noticeKeyword,
  noticeList,
  noticeLoading,
  noticePage,
  noticeProjectId,
  noticeProjectOptions,
  noticeSel,
  noticeTotal,
  onNoticeEnterpriseChange,
  openNotice,
  openNoticeCreate,
  prettyDate,
  projEnterprises,
  projectTitle,
  selAllOn,
  selHas,
  selSome,
  toggleSelAll,
  toggleSelOne
} = inject("console")
</script>
