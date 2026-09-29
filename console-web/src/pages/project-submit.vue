<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">SUBMIT</div>
                    <h3>上架项目</h3>
                    <p>仅首次上架需要平台审批；已通过的项目可直接修改并立即生效。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ projStats.pending || 0 }}</b><span>待审批</span></div>
                    <div><b>{{ projStats.rejected || 0 }}</b><span>已驳回</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-button type="primary" @click="openProjCreate">提交上架</el-button>
                  <button class="chip" :class="{ on: projStatus==='all' }" @click="projStatus='all'; projPage=1; loadProjects()">全部</button>
                  <button class="chip" :class="{ on: projStatus==='待审批' }" @click="projStatus='待审批'; projPage=1; loadProjects()">待审批</button>
                  <button class="chip" :class="{ on: projStatus==='已驳回' }" @click="projStatus='已驳回'; projPage=1; loadProjects()">已驳回</button>
                </div>
                <div class="users-table">
                  <div v-if="projLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!projList.length" class="empty-board"><b>还没有待审项目</b></div>
                  <table v-else class="grid">
                    <thead><tr><th>项目</th><th>状态</th><th></th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="p in projList" :key="'ps'+p.id" @click="openProj(p)">
                        <td>
                          <div class="name">{{ p.title }}</div>
                          <div class="sub">{{ p.reviewNote || p.subtitle || p.location || '—' }}</div>
                        </td>
                        <td><span class="tag" :class="(p.status==='已驳回' || (p.pendingRevision && p.pendingRevision.rejected)) ? 'off' : 'warn'">{{ projReviewKindLabel(p) }}</span></td>
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
  loadProjects,
  openProj,
  openProjCreate,
  projList,
  projLoading,
  projPage,
  projReviewKindLabel,
  projStats,
  projStatus
} = inject("console")
</script>
