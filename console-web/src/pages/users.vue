<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">USERS</div>
                    <h3>用户管理</h3>
                    <p>核验身份、查看研学档案与往来记录。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ userStats.total }}</b><span>全部</span></div>
                    <div><b>{{ userStats.verified }}</b><span>已实名</span></div>
                    <div><b>{{ userStats.disabled }}</b><span>已停用</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="userKeyword" placeholder="研学号 / 手机号 / 姓名" clearable @keyup.enter="loadUsers" />
                  <el-button type="primary" :loading="userLoading" @click="userPage=1; loadUsers()">查询</el-button>
                  <button class="chip" :class="{ on: userFilter==='all' }" @click="userFilter='all'; userPage=1; loadUsers()">全部</button>
                  <button class="chip" :class="{ on: userFilter==='verified' }" @click="userFilter='verified'; userPage=1; loadUsers()">已实名</button>
                  <button class="chip" :class="{ on: userFilter==='unverified' }" @click="userFilter='unverified'; userPage=1; loadUsers()">未实名</button>
                  <button class="chip" :class="{ on: userFilter==='disabled' }" @click="userFilter='disabled'; userPage=1; loadUsers()">已停用</button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="userSel.length">
                    <span>已选 {{ userSel.length }} 人</span>
                    <el-button size="small" @click="batchDeleteByUrl('/api/v1/admin/users/batch-delete', 'user', loadUsers)">删除所选</el-button>
                  </div>
                  <div v-if="userLoading" class="empty-board"><b>正在载入</b>请稍候</div>
                  <div v-else-if="!userList.length" class="empty-board"><b>没有符合条件的用户</b>换个关键词或筛选项再试</div>
                  <table v-else class="grid">
                    <thead>
                      <tr>
                        <th class="check"><el-checkbox :model-value="selAllOn('user', userList)" :indeterminate="selSome('user', userList)" @change="(v)=>toggleSelAll('user', userList, v)" @click.stop /></th>
                        <th>学员</th>
                        <th>研学号</th>
                        <th>手机</th>
                        <th>核验</th>
                        <th>状态</th>
                        <th>预约</th>
                        <th>注册</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="row" :class="{ picked: selHas('user', u.id) }" v-for="u in userList" :key="u.id" @click="openUser(u)">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('user', u.id)" @change="(v)=>toggleSelOne('user', u.id, v)" />
                        </td>
                        <td>
                          <div class="name-cell">
                            <div class="avatar">
                              <img v-if="avatarSrc(u)" :src="avatarSrc(u)" alt="" />
                              <span v-else>{{ initialOf(u) }}</span>
                            </div>
                            <div>
                              <div>{{ displayName(u) }}</div>
                            </div>
                          </div>
                        </td>
                        <td>{{ u.studyNo || '—' }}</td>
                        <td>{{ maskPhone(u.phone) }}</td>
                        <td><span class="tag" :class="u.realNameVerified ? 'ok' : 'warn'">{{ u.realNameVerified ? '已实名' : '未实名' }}</span></td>
                        <td><span class="tag" :class="String(u.status).toUpperCase()==='DISABLED' ? 'off' : 'ok'">{{ statusLabel(u.status) }}</span></td>
                        <td>{{ (u._count && u._count.bookings != null) ? u._count.bookings : (u.bookingsCount || 0) }}</td>
                        <td class="sub">{{ fmtTime(u.createdAt) }}</td>
                        <td><span class="link-btn">档案</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <div style="padding:12px 16px" v-if="userTotal > userPageSize">
                    <el-pagination layout="prev, pager, next, total" :page-size="userPageSize" :current-page="userPage" :total="userTotal" @current-change="(p)=>{ userPage=p; loadUsers() }" />
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  avatarSrc,
  batchDeleteByUrl,
  displayName,
  fmtTime,
  initialOf,
  loadUsers,
  maskPhone,
  openUser,
  selAllOn,
  selHas,
  selSome,
  statusLabel,
  toggleSelAll,
  toggleSelOne,
  userFilter,
  userKeyword,
  userList,
  userLoading,
  userPage,
  userPageSize,
  userSel,
  userStats,
  userTotal
} = inject("console")
</script>
