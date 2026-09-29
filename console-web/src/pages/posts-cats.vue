<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">TAXONOMY</div>
                    <h3>资讯分类</h3>
                    <p>分类由平台统一管理，审批通过时指定；标签给投稿选题，频道是资讯页分栏。</p>
                  </div>
                  <el-button type="primary" :loading="settingsSaving" @click="saveSettingsPart('dicts')">保存分类</el-button>
                </div>
                <div class="tax-grid">
                  <div class="tax-card">
                    <div class="tax-card-hd">
                      <h4>平台资讯分类</h4>
                      <p>企业和官方发稿都不能自选分类；运维审批通过时从这里选。</p>
                    </div>
                    <div class="tax-card-bd">
                      <div>
                        <span class="tax-chip" v-for="(t, i) in (settingsDicts.noticeTypes || [])" :key="'pnt'+i">
                          {{ t }}
                          <button type="button" @click="removeDictItem('noticeTypes', i)">×</button>
                        </span>
                        <span v-if="!(settingsDicts.noticeTypes || []).length" class="sub">还没有分类</span>
                      </div>
                      <div class="tax-add">
                        <el-input v-model="dictDraft.noticeTypes" placeholder="新分类，回车添加" @keyup.enter="addDictItem('noticeTypes')" />
                        <el-button @click="addDictItem('noticeTypes')">添加</el-button>
                      </div>
                    </div>
                  </div>
                  <div class="tax-card">
                    <div class="tax-card-hd">
                      <h4>资讯标签</h4>
                      <p>出现在发稿选题里，点标签可删除。</p>
                    </div>
                    <div class="tax-card-bd">
                      <div>
                        <span class="tax-chip" v-for="(t, i) in settingsDicts.articleTags" :key="'pat'+i">
                          {{ t }}
                          <button type="button" @click="removeDictItem('articleTags', i)">×</button>
                        </span>
                        <span v-if="!(settingsDicts.articleTags || []).length" class="sub">还没有标签</span>
                      </div>
                      <div class="tax-add">
                        <el-input v-model="dictDraft.articleTags" placeholder="新标签，回车添加" @keyup.enter="addDictItem('articleTags')" />
                        <el-button @click="addDictItem('articleTags')">添加</el-button>
                      </div>
                    </div>
                  </div>
                  <div class="tax-card">
                    <div class="tax-card-hd">
                      <h4>资讯频道</h4>
                      <p>小程序资讯页的分栏，填写分类名称即可。</p>
                    </div>
                    <div class="tax-card-bd">
                      <div>
                        <span class="tax-chip" v-for="(c, i) in settingsDicts.contentChannels" :key="'ch'+i">
                          {{ c.label }}
                          <button type="button" @click="removeDictPair('contentChannels', i)">×</button>
                        </span>
                        <span v-if="!(settingsDicts.contentChannels || []).length" class="sub">还没有频道</span>
                      </div>
                      <div class="tax-add">
                        <el-input v-model="dictDraft.channelLabel" placeholder="分类名称，回车添加" @keyup.enter="addDictPair('contentChannels','channelKey','channelLabel')" />
                        <el-button @click="addDictPair('contentChannels','channelKey','channelLabel')">添加</el-button>
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
  addDictPair,
  dictDraft,
  removeDictItem,
  removeDictPair,
  saveSettingsPart,
  settingsDicts,
  settingsSaving
} = inject("console")
</script>
