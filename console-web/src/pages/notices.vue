<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">BULLETIN</div>
                    <h3>{{ active==='dynamics' ? (inProjWorkspace ? '项目动态' : '企业动态') : (inProjWorkspace ? '项目资讯' : '企业资讯') }}</h3>
                    <p v-if="active==='dynamics' && inProjWorkspace">本项目动态，发布后立即展示在小程序「相关动态」，发布单位为项目组。</p>
                    <p v-else-if="active==='dynamics'">本企业下各项目动态；写动态时需选择研学项目，发布单位为对应项目组。</p>
                    <p v-else-if="inProjWorkspace">本项目资讯，提交后需平台审批；通过后进入小程序资讯流，发布单位为项目组。</p>
                    <p v-else>企业级资讯，发布单位为企业发布单位名；提交后需平台审批。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ noticeTotal }}</b><span>{{ active==='dynamics' ? '动态' : '资讯' }}</span></div>
                  </div>
                </div>
                <div>
                  <div class="users-bar">
                    <el-input class="users-search" v-model="noticeKeyword" clearable @keyup.enter="noticePage=1; loadNotices()" />
                    <el-select v-if="!inProjWorkspace" v-model="noticeProjectId" :clearable="active!=='dynamics'" :placeholder="active==='dynamics' ? '选择项目（动态必选）' : '全部项目（可选）'" style="width:220px" @change="noticePage=1; loadNotices()">
                      <el-option v-for="p in projList" :key="'np-'+p.id" :label="p.title" :value="p.id" />
                    </el-select>
                    <el-button type="primary" :loading="noticeLoading" @click="noticePage=1; loadNotices()">查询</el-button>
                    <el-button @click="openNoticeCreate()">{{ active==='dynamics' ? '写动态' : '写资讯' }}</el-button>
                  </div>
                  <div class="tax-card solo">
                    <div class="tax-card-hd">
                      <h4>{{ active==='dynamics' ? '动态话题与分类' : '资讯话题与分类' }}</h4>
                      <p v-if="active==='dynamics'">话题标签由企业/项目自填（最多 4 个）；分类由平台指定，动态内容发布后立即展示，无需等待分类。</p>
                      <p v-else>话题标签由企业/项目自填；分类由平台统一管理，运维在审批通过时指定。</p>
                    </div>
                  </div>
                  <div class="users-table">
                    <div class="batch-bar" v-if="noticeSel.length">
                      <span>已选 {{ noticeSel.length }} 条</span>
                      <el-button size="small" @click="batchDeleteByUrl('/api/v1/admin/notices/batch-delete', 'notice', loadNotices)">删除所选</el-button>
                    </div>
                    <div v-if="noticeLoading" class="empty-board"><b>正在载入</b></div>
                    <div v-else-if="!noticeList.length" class="empty-board"><b>{{ active==='dynamics' ? '还没有动态' : '还没有资讯' }}</b></div>
                    <table v-else class="grid">
                      <thead><tr>
                        <th class="check"><el-checkbox :model-value="selAllOn('notice', noticeList)" :indeterminate="selSome('notice', noticeList)" @change="(v)=>toggleSelAll('notice', noticeList, v)" @click.stop /></th>
                        <th>标题</th><th>分类</th><th>项目</th><th>状态</th><th>提交</th><th></th>
                      </tr></thead>
                      <tbody>
                        <tr class="row" :class="{ picked: selHas('notice', n.id) }" v-for="n in noticeList" :key="n.id" @click="openNotice(n)">
                          <td class="check" @click.stop>
                            <el-checkbox :model-value="selHas('notice', n.id)" @change="(v)=>toggleSelOne('notice', n.id, v)" />
                          </td>
                          <td><div class="name">{{ n.title }}</div><div class="sub" v-if="n.status==='rejected' && n.reviewNote">原因：{{ n.reviewNote }}</div></td>
                          <td>{{ (n.status==='published' ? (n.category || n.type) : (n.category || n.type || '待分类')) || '待分类' }}</td>
                          <td>{{ n.projectTitle || (n.projectId ? '—' : '企业级') }}</td>
                          <td><span class="tag" :class="n.status==='published' ? 'ok' : (n.status==='rejected' ? 'off' : 'warn')">{{ noticeStatusLabel(n.status) }}</span></td>
                          <td>{{ prettyDate(n.publishedAt) }}</td>
                          <td><span class="link-btn">{{ n.status==='rejected' ? '修改重提' : '打开' }}</span></td>
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
  active,
  batchDeleteByUrl,
  inProjWorkspace,
  loadNotices,
  noticeKeyword,
  noticeList,
  noticeLoading,
  noticePage,
  noticeProjectId,
  noticeSel,
  noticeStatusLabel,
  noticeTotal,
  openNotice,
  openNoticeCreate,
  prettyDate,
  projList,
  projectTitle,
  selAllOn,
  selHas,
  selSome,
  toggleSelAll,
  toggleSelOne
} = inject("console")
</script>
