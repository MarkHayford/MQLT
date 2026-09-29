<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">SYSTEM</div>
                    <h3>系统设置</h3>
                    <p>平台对外信息和协议文案。</p>
                  </div>
                </div>
                <div class="users-bar">
                  <button class="chip" :class="{ on: settingsTab==='contact' }" @click="settingsTab='contact'">平台信息</button>
                  <button class="chip" :class="{ on: settingsTab==='legal' }" @click="settingsTab='legal'">协议文案</button>
                </div>
                <div v-if="settingsLoading" class="empty-board"><b>正在载入</b></div>
                <div v-else-if="settingsTab==='contact'" class="sheet">
                  <div class="sheet-hd">
                    <div>
                      <h4>平台对外信息</h4>
                      <p>出现在小程序客服入口和关于页。抽成请到「抽成」里改。</p>
                    </div>
                    <el-button type="primary" :loading="settingsSaving" @click="saveSettingsPart('contact')">保存</el-button>
                  </div>
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div><label>平台名称</label><el-input v-model="settingsContact.name" /></div>
                      <div><label>客服热线</label><el-input v-model="settingsContact.phone" /></div>
                      <div><label>客服时段</label><el-input v-model="settingsContact.hours" /></div>
                      <div><label>邮箱</label><el-input v-model="settingsContact.email" /></div>
                      <div class="full" style="display:flex;gap:16px;align-items:center">
                        <el-checkbox v-model="settingsFeatures.rental">租车服务</el-checkbox>
                        <el-checkbox v-model="settingsFeatures.aiPlan">AI 行程</el-checkbox>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else-if="settingsTab==='legal'">
                  <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
                    <el-button type="primary" :loading="settingsSaving" @click="saveSettingsPart('legal')">保存两份文案</el-button>
                  </div>
                  <div class="legal-grid" :style="{ '--legal-right-w': legalRightWidth + 'px' }">
                    <template v-for="(kind, ki) in ['agreement','privacy']" :key="kind">
                    <div v-if="ki===1" class="mqlt-vsplit" :class="{ on: mqltSplitHover==='legal' }" title="拖动调整列宽" @mousedown="startLegalRightResize"></div>
                    <div class="legal-doc">
                      <div class="legal-doc-hd">
                        <h4>{{ kind==='privacy' ? '隐私政策' : '用户协议' }}</h4>
                        <p>展示在小程序登录与设置里，章节顺序即阅读顺序。</p>
                      </div>
                      <div class="legal-doc-bd">
                        <div class="edit-grid">
                          <div><label>文案标题</label><el-input v-model="settingsLegal[kind].title" /></div>
                          <div><label>更新日期</label><el-input v-model="settingsLegal[kind].updatedAt" placeholder="2026年9月10日" /></div>
                          <div class="full"><label>导语</label><el-input v-model="settingsLegal[kind].intro" type="textarea" :rows="3" /></div>
                        </div>
                        <div class="legal-sec" v-for="(sec, si) in settingsLegal[kind].sections" :key="kind+si">
                          <div class="legal-sec-hd">
                            <span>第 {{ si+1 }} 节</span>
                            <span class="link-btn" @click="removeLegalSection(kind, si)">删除本节</span>
                          </div>
                          <div class="full" style="margin-bottom:8px"><el-input v-model="sec.heading" placeholder="章节标题，如：一、服务内容" /></div>
                          <el-input v-model="sec.body" type="textarea" :rows="5" placeholder="章节正文" />
                        </div>
                        <el-button style="margin-top:12px" @click="addLegalSection(kind)">增加章节</el-button>
                      </div>
                    </div>
                    </template>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addLegalSection,
  legalRightWidth,
  mqltSplitHover,
  removeLegalSection,
  saveSettingsPart,
  settingsContact,
  settingsFeatures,
  settingsLegal,
  settingsLoading,
  settingsSaving,
  settingsTab,
  startLegalRightResize
} = inject("console")
</script>
