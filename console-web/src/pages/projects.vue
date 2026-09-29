<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">STUDY</div>
                    <h3>项目</h3>
                    <p>管理本企业研学项目。编辑资料后需平台审批通过，才会替换学员端展示。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ projStats.total }}</b><span>全部</span></div>
                    <div><b>{{ projStats.open }}</b><span>可预约</span></div>
                    <div><b>{{ projStats.full }}</b><span>满员</span></div>
                    <div><b>{{ projStats.live }}</b><span>进行中</span></div>
                  </div>
                </div>
                <div class="users-toolbar">
                  <div class="users-bar">
                    <el-input class="users-search" v-model="projKeyword" clearable placeholder="搜索项目名称 / 地点" @keyup.enter="projPage=1; loadProjects()" />
                    <el-button :loading="projLoading" @click="projPage=1; loadProjects()">查询</el-button>
                    <button class="chip" :class="{ on: projStatus==='all' }" @click="projStatus='all'; projPage=1; loadProjects()">全部</button>
                    <button class="chip" :class="{ on: projStatus==='可预约' }" @click="projStatus='可预约'; projPage=1; loadProjects()">可预约</button>
                    <button class="chip" :class="{ on: projStatus==='预约满员' }" @click="projStatus='预约满员'; projPage=1; loadProjects()">满员</button>
                    <button class="chip" :class="{ on: projStatus==='正在进行中' }" @click="projStatus='正在进行中'; projPage=1; loadProjects()">进行中</button>
                    <button class="chip" :class="{ on: projStatus==='已结束' }" @click="projStatus='已结束'; projPage=1; loadProjects()">已结束</button>
                    <button class="chip" :class="{ on: projStatus==='暂未开放' }" @click="projStatus='暂未开放'; projPage=1; loadProjects()">未开放</button>
                  </div>
                  <el-button type="primary" @click="openProjCreate">上架项目</el-button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="projSel.length">
                    <span>已选 {{ projSel.length }} 个</span>
                    <el-button size="small" @click="batchDeleteProjects">删除所选</el-button>
                  </div>
                  <div v-if="projLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!projList.length" class="empty-board"><b>还没有研学项目</b><p>点右上角上架项目，提交后由平台审批。</p></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('proj', projList)" :indeterminate="selSome('proj', projList)" @change="(v)=>toggleSelAll('proj', projList, v)" @click.stop /></th>
                      <th>项目</th><th>状态</th><th>名额</th><th>价格</th><th>预约</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ picked: selHas('proj', p.id) }" v-for="p in projList" :key="p.id">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('proj', p.id)" @change="(v)=>toggleSelOne('proj', p.id, v)" />
                        </td>
                        <td>
                          <div class="who">
                            <div class="thumb"><img v-if="projCover(p)" :src="projCover(p)" alt="" /><span v-else>研</span></div>
                            <div>
                              <div class="name">{{ p.title }}</div>
                              <div class="sub">{{ p.location || p.category || '未填地点' }}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="tag" :class="p.status==='可预约' ? 'ok' : (p.status==='已结束' ? 'off' : '')">{{ p.status }}</span>
                          <div class="sub" v-if="false && p.hasPendingRevision" style="margin-top:6px">修改待审（已停用）</div>
                        </td>
                        <td>{{ p.enrolled }}/{{ p.maxCapacity }}</td>
                        <td>{{ moneyText(p.price) }}</td>
                        <td>{{ p.bookingCount }}</td>
                        <td>
                          <div class="row-actions" @click.stop>
                            <button class="ghost-btn" type="button" @click.stop="openProj(p)">编辑</button>
                            <button class="ghost-btn primary" type="button" @click.stop="enterProjWorkspace(p)">进入</button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div style="padding:12px 16px" v-if="projTotal > 20">
                    <el-pagination layout="prev, pager, next, total" :page-size="20" :current-page="projPage" :total="projTotal" @current-change="(n)=>{ projPage=n; loadProjects() }" />
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  batchDeleteProjects,
  enterProjWorkspace,
  loadProjects,
  moneyText,
  openProj,
  openProjCreate,
  projCover,
  projKeyword,
  projList,
  projLoading,
  projPage,
  projSel,
  projStats,
  projStatus,
  projTotal,
  selAllOn,
  selHas,
  selSome,
  toggleSelAll,
  toggleSelOne
} = inject("console")
</script>
