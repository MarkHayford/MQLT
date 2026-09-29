<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">REVIEW</div>
                    <h3>项目审批</h3>
                    <p>仅审核首次上架。已通过项目的后续修改会立即生效，不再进入待审。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ projStats.pending || projList.filter(p=>p.status==='待审批').length }}</b><span>待审批</span></div>
                  </div>
                </div>
                <div class="tax-grid split2" :style="{ '--tax-right-w': taxRightWidth + 'px' }">
                  <div class="tax-card solo">
                    <div class="tax-card-hd"><h4>研学分类</h4><p>审批时给项目归类。</p></div>
                    <div class="tax-card-bd">
                      <span class="tax-chip" v-for="(t, i) in (settingsDicts.studyCategories || [])" :key="'sc'+i">
                        {{ t }}
                        <button type="button" @click="removeDictItem('studyCategories', i)">×</button>
                      </span>
                      <div class="tax-add">
                        <el-input v-model="dictDraft.studyCategories" placeholder="新分类，回车添加" @keyup.enter="addDictItem('studyCategories')" />
                        <el-button @click="addDictItem('studyCategories')">添加</el-button>
                      </div>
                    </div>
                  </div>
                  <div class="mqlt-vsplit" :class="{ on: mqltSplitHover==='tax' }" title="拖动调整列宽" @mousedown="startTaxRightResize"></div>
                  <div class="tax-card solo">
                    <div class="tax-card-hd"><h4>研学标签</h4><p>审批时给项目打标签。</p></div>
                    <div class="tax-card-bd">
                      <span class="tax-chip" v-for="(t, i) in (settingsDicts.studyTags || [])" :key="'st'+i">
                        {{ t }}
                        <button type="button" @click="removeDictItem('studyTags', i)">×</button>
                      </span>
                      <div class="tax-add">
                        <el-input v-model="dictDraft.studyTags" placeholder="新标签，回车添加" @keyup.enter="addDictItem('studyTags')" />
                        <el-button @click="addDictItem('studyTags')">添加</el-button>
                      </div>
                    </div>
                  </div>
                </div>
                <div style="margin:12px 0"><el-button type="primary" :loading="settingsSaving" @click="saveSettingsPart('dicts')">保存分类标签</el-button></div>
                <div class="users-bar">
                  <button class="chip" :class="{ on: projStatus==='all' }" @click="projStatus='all'; projPage=1; loadProjects()">全部待办</button>
                  <button class="chip" :class="{ on: projStatus==='待审批' }" @click="projStatus='待审批'; projPage=1; loadProjects()">新上架</button>
                  <button class="chip" :class="{ on: projStatus==='已驳回' }" @click="projStatus='已驳回'; projPage=1; loadProjects()">已驳回</button>
                </div>
                <div class="users-table">
                  <div v-if="projLoading" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!projList.length" class="empty-board"><b>没有待审项目</b></div>
                  <table v-else class="grid">
                    <thead><tr><th>项目</th><th>企业</th><th>状态</th><th></th></tr></thead>
                    <tbody>
                      <tr class="row" v-for="p in projList" :key="'pr'+p.id" @click="openProjReview(p)">
                        <td>
                          <div class="name">{{ p.title }}</div>
                          <div class="sub">{{ p.subtitle || p.location || '—' }}</div>
                        </td>
                        <td>{{ p.enterpriseName || '—' }}</td>
                        <td><span class="tag" :class="(p.status==='已驳回' || (p.pendingRevision && p.pendingRevision.rejected)) ? 'off' : 'warn'">{{ projReviewKindLabel(p) }}</span></td>
                        <td><span class="link-btn">审批</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="sheet" v-if="projReviewOpen && projReview.id" style="margin-top:16px">
                  <div class="sheet-hd">
                    <div>
                      <h4>{{ projSelected && projSelected.title }}</h4>
                      <p>{{ projSelected && (projSelected.enterpriseName || '') }} · 首次上架审批：通过时请归类并打标签</p>
                    </div>
                    <div style="display:flex;gap:10px">
                      <el-button @click="submitProjReview('reject')">驳回</el-button>
                      <el-button type="primary" :loading="projSaving" @click="submitProjReview('approve')">通过</el-button>
                      <el-button @click="projReviewOpen=false">收起</el-button>
                    </div>
                  </div>
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div>
                        <label>分类</label>
                        <el-select v-model="projReview.category" style="width:100%" placeholder="选择分类">
                          <el-option v-for="c in (settingsDicts.studyCategories || [])" :key="'rc'+c" :label="c" :value="c" />
                        </el-select>
                      </div>
                      <div>
                        <label>上架状态</label>
                        <el-select v-model="projReview.status" style="width:100%">
                          <el-option label="暂未开放" value="暂未开放" />
                          <el-option label="可预约" value="可预约" />
                        </el-select>
                      </div>
                      <div class="full">
                        <label>标签</label>
                        <div>
                          <el-checkbox v-for="t in (settingsDicts.studyTags || [])" :key="'rt'+t" :model-value="(projReview.tags||[]).indexOf(t)>=0" @change="(v)=>toggleReviewTag(t, v)" style="margin-right:12px">{{ t }}</el-checkbox>
                        </div>
                      </div>
                      <div class="full"><label>驳回说明</label><el-input v-model="projReview.note" type="textarea" :rows="2" placeholder="驳回时填写" /></div>
                      <div class="full" v-if="projSelected && projSelected.hasPendingRevision && projSelected.pendingRevision">
                        <label>本次修改</label>
                        <div class="sub">名称 {{ projSelected.pendingRevision.title || '—' }} · 售价 {{ projSelected.pendingRevision.price || '—' }} · 名额 {{ projSelected.pendingRevision.maxCapacity || '—' }} · 地点 {{ projSelected.pendingRevision.location || '—' }}</div>
                        <div class="sub">学员端当前仍为：{{ projSelected.title }} · {{ moneyText(projSelected.price) }} · {{ projSelected.status }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addDictItem,
  dictDraft,
  loadProjects,
  moneyText,
  mqltSplitHover,
  openProjReview,
  projList,
  projLoading,
  projPage,
  projReview,
  projReviewKindLabel,
  projReviewOpen,
  projSaving,
  projSelected,
  projStats,
  projStatus,
  removeDictItem,
  saveSettingsPart,
  settingsDicts,
  settingsSaving,
  startTaxRightResize,
  submitProjReview,
  taxRightWidth,
  toggleReviewTag
} = inject("console")
</script>
