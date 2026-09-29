<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">ACCOUNTS</div>
                    <h3>用户创建</h3>
                    <p>用手机号登录企业控制台，权限跟所选职位走。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ staffList.length }}</b><span>账号</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-button type="primary" @click="openStaffCreate">开通账号</el-button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="staffSel.length">
                    <span>已选 {{ staffSel.length }} 个</span>
                    <el-button size="small" @click="batchDeleteStaff">删除所选</el-button>
                  </div>
                  <div v-if="staffLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!staffList.length" class="empty-board"><b>还没有管理账号</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('staff', staffList)" :indeterminate="selSome('staff', staffList)" @change="(v)=>toggleSelAll('staff', staffList, v)" @click.stop /></th>
                      <th>姓名</th><th>手机</th><th>职位</th><th>状态</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ picked: selHas('staff', s.id) }" v-for="s in staffList" :key="s.id" @click="openStaff(s)">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('staff', s.id)" @change="(v)=>toggleSelOne('staff', s.id, v)" />
                        </td>
                        <td><div class="name">{{ s.name || '—' }}</div></td>
                        <td>{{ s.phone }}</td>
                        <td>{{ s.merchantRoleName || '—' }}</td>
                        <td><span class="tag" :class="s.status==='ACTIVE' ? 'ok' : 'off'">{{ s.status==='ACTIVE' ? '可用' : '停用' }}</span></td>
                        <td>
                          <span class="link-btn">打开</span>
                          <span class="link-btn" style="margin-left:8px" @click.stop="deleteStaff(s)">删除</span>
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
  batchDeleteStaff,
  deleteStaff,
  openStaff,
  openStaffCreate,
  selAllOn,
  selHas,
  selSome,
  staffList,
  staffLoading,
  staffSel,
  toggleSelAll,
  toggleSelOne
} = inject("console")
</script>
