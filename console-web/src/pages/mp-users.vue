<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">ACCOUNTS</div>
                    <h3>用户创建</h3>
                    <p>开通后用手机号登录平台控制台，权限跟所选职位走。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ mpStaffList.length }}</b><span>账号</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-button type="primary" @click="openMpStaffCreate">开通账号</el-button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="mpUserSel.length">
                    <span>已选 {{ mpUserSel.length }} 个</span>
                    <el-button size="small" @click="batchDeleteMpStaff">删除所选</el-button>
                  </div>
                  <div v-if="mpLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!mpStaffList.length" class="empty-board"><b>还没有平台账号</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('mpUser', mpStaffList)" :indeterminate="selSome('mpUser', mpStaffList)" @change="(v)=>toggleSelAll('mpUser', mpStaffList, v)" @click.stop /></th>
                      <th>姓名</th><th>手机</th><th>职位</th><th>状态</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ picked: selHas('mpUser', s.id) }" v-for="s in mpStaffList" :key="s.id" @click="openMpStaff(s)">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('mpUser', s.id)" @change="(v)=>toggleSelOne('mpUser', s.id, v)" />
                        </td>
                        <td><div class="name">{{ s.name || '—' }}</div></td>
                        <td>{{ s.phone }}</td>
                        <td>{{ s.mpRoleName || s.mpRole || '—' }}</td>
                        <td><span class="tag" :class="s.status==='ACTIVE' ? 'ok' : 'off'">{{ s.status==='ACTIVE' ? '可用' : '停用' }}</span></td>
                        <td>
                          <span class="link-btn">打开</span>
                          <span class="link-btn" style="margin-left:8px" @click.stop="deleteMpStaff(s)">删除</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  batchDeleteMpStaff,
  deleteMpStaff,
  mpLoading,
  mpStaffList,
  mpUserSel,
  openMpStaff,
  openMpStaffCreate,
  selAllOn,
  selHas,
  selSome,
  toggleSelAll,
  toggleSelOne
} = inject("console")
</script>
