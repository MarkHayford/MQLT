<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">ENTERPRISE</div>
                    <h3>入驻企业</h3>
                    <p>点进企业即进入该企业管理。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ entList.length }}</b><span>企业</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="entKeyword" placeholder="企业名称 / 联系人" clearable @keyup.enter="loadEntList()" />
                  <el-button type="primary" :loading="entLoading" @click="loadEntList()">查询</el-button>
                  <el-button @click="openEntCreate">新增企业</el-button>
                </div>
                <div class="users-table">
                  <div v-if="entLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!entList.length" class="empty-board"><b>还没有入驻企业</b></div>
                  <table v-else class="grid">
                    <thead><tr><th>企业</th><th>联系人</th><th>项目</th><th>账号</th><th>状态</th><th></th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="e in entList" :key="e.id" @click="enterEntWorkspace(e)">
                        <td>
                          <div class="name">{{ e.shortName || e.name }}</div>
                          <div class="sub">{{ e.name }}</div>
                        </td>
                        <td>{{ e.contactName || '—' }} {{ e.contactPhone || '' }}</td>
                        <td>{{ e.projectCount || 0 }}</td>
                        <td>{{ e.operatorCount || 0 }}</td>
                        <td><span class="tag" :class="e.status==='ACTIVE' ? 'ok' : 'off'">{{ entStatusLabel(e.status) }}</span></td>
                        <td><span class="link-btn">进入</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  entKeyword,
  entList,
  entLoading,
  entStatusLabel,
  enterEntWorkspace,
  loadEntList,
  openEntCreate
} = inject("console")
</script>
