<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">PUBLISHER</div>
                    <h3>发布单位</h3>
                    <p>每个企业、每个项目各有一个发布单位名和头像。发资讯/动态时自动带上，表单里只读。头像走现有图片上传。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ pubUnitTotal }}</b><span>条</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <button class="chip" :class="{ on: pubUnitKind==='all' }" @click="pubUnitKind='all'; loadPublisherUnits()">全部</button>
                  <button class="chip" :class="{ on: pubUnitKind==='enterprise' }" @click="pubUnitKind='enterprise'; loadPublisherUnits()">企业</button>
                  <button class="chip" :class="{ on: pubUnitKind==='project' }" @click="pubUnitKind='project'; loadPublisherUnits()">项目</button>
                  <el-input class="users-search" v-model="pubUnitKeyword" clearable placeholder="搜索名称" @keyup.enter="loadPublisherUnits()" />
                  <el-button :loading="pubUnitLoading" @click="loadPublisherUnits()">查询</el-button>
                </div>
                <div class="users-table">
                  <div v-if="pubUnitLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!pubUnitList.length" class="empty-board"><b>没有发布单位</b><p>先有入驻企业或研学项目后才会出现在这里。</p></div>
                  <table v-else class="grid">
                    <thead>
                      <tr>
                        <th>类型</th>
                        <th>对象</th>
                        <th>头像</th>
                        <th>发布单位</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="row" v-for="u in pubUnitList" :key="u.kind+':'+u.id">
                        <td><span class="tag">{{ u.kind==='enterprise' ? '企业' : '项目' }}</span></td>
                        <td>
                          <div class="name">{{ u.name || u.baseName }}</div>
                          <div class="sub" v-if="u.kind==='project' && u.enterpriseName">{{ u.enterpriseName }}</div>
                        </td>
                        <td style="min-width:220px">
                          <div style="display:flex;align-items:center;gap:8px">
                            <img v-if="u.publisherAvatarUrl" :src="u.publisherAvatarUrl" alt="" style="width:36px;height:36px;border-radius:18px;object-fit:cover;background:#F5F7FB" />
                            <div v-else style="width:36px;height:36px;border-radius:18px;background:#F5F7FB"></div>
                            <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="(opt) => uploadPublisherAvatar(opt, u)">
                              <el-button size="small">{{ u.publisherAvatarUrl ? '更换' : '上传' }}</el-button>
                            </el-upload>
                          </div>
                          <el-input v-model="u.publisherAvatarUrl" placeholder="或粘贴头像 URL" style="margin-top:6px" @keyup.enter="savePublisherUnitRow(u)" />
                        </td>
                        <td style="min-width:260px">
                          <el-input v-model="u.publisherDisplayName" placeholder="发布单位名称" @keyup.enter="savePublisherUnitRow(u)" />
                        </td>
                        <td>
                          <span class="link-btn" @click="savePublisherUnitRow(u)">保存</span>
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
  loadPublisherUnits,
  pubUnitKeyword,
  pubUnitKind,
  pubUnitList,
  pubUnitLoading,
  pubUnitTotal,
  savePublisherUnitRow,
  uploadPublisherAvatar
} = inject("console")
</script>
