<template>
                  <div class="studio-fill">
                    <div class="res-lib-top">
                      <div>
                        <div class="res-kicker">AUDIENCE</div>
                        <h3>分层人群点位模板</h3>
                        <p>给亲子、高校、商务，或你自己命名的人群各配一套推荐点位。学员在小程序「分层点位」页选用。</p>
                      </div>
                      <div style="display:flex;gap:8px;flex-shrink:0">
                        <el-button @click="addAudienceTpl">添加模板</el-button>
                        <el-button type="primary" :loading="projAudienceSaving" @click="saveAudienceTemplates">保存模板</el-button>
                      </div>
                    </div>
                    <div v-loading="projAudienceLoading">
                      <div v-if="!(projAudienceTemplates||[]).length" class="route-foot-hint" style="padding:18px;background:#fff;border:1px solid #E5E7EB;border-radius:14px">还没有模板。点「添加模板」新建。自定义人群必须填写人群名称，启用前至少勾选 1 个点位。</div>
                      <div v-for="(tpl, tIdx) in (projAudienceTemplates||[])" :key="tpl.id || tIdx" style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px;margin-bottom:12px">
                        <div class="edit-grid">
                          <div><label>模板名称</label><el-input v-model="tpl.name" maxlength="40" placeholder="如 亲子轻松" /></div>
                          <div><label>人群</label>
                            <el-select v-model="tpl.audience" style="width:100%">
                              <el-option label="亲子" value="family" />
                              <el-option label="高校" value="college" />
                              <el-option label="商务" value="business" />
                              <el-option label="自定义" value="custom" />
                            </el-select>
                          </div>
                          <div v-if="tpl.audience==='custom'"><label>人群名称</label>
                            <el-input v-model="tpl.audienceLabel" maxlength="20" placeholder="必填，如 银发团、冬令营" />
                          </div>
                          <div><label>节奏</label>
                            <el-select v-model="tpl.pace" style="width:100%">
                              <el-option label="轻松少选" value="light" />
                              <el-option label="适中" value="balanced" />
                              <el-option label="紧凑" value="full" />
                            </el-select>
                          </div>
                          <div class="full"><label>给学员看的说明</label><el-input v-model="tpl.description" maxlength="240" placeholder="一句话说明这套点位适合谁" /></div>
                          <div><label>启用</label><el-switch v-model="tpl.enabled" /></div>
                          <div><el-button link type="danger" @click="removeAudienceTpl(tIdx)">删除模板</el-button></div>
                        </div>
                        <div style="margin-top:10px"><label>推荐点位（{{ (tpl.spotIds||[]).length }} 个）</label></div>
                        <div v-if="!(projRoutePoints||[]).length" class="route-foot-hint">请先在「路径」里配置点位。</div>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                          <button
                            v-for="rp in (projRoutePoints||[])"
                            :key="(tpl.id||tIdx)+'-'+rp.id"
                            type="button"
                            class="aud-spot"
                            :class="{ on: (tpl.spotIds||[]).indexOf(rp.id)>=0 }"
                            @click="toggleAudienceSpot(tpl, rp.id)"
                          >{{ rp.title }}</button>
                        </div>
                      </div>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addAudienceTpl,
  projAudienceLoading,
  projAudienceSaving,
  projAudienceTemplates,
  projRoutePoints,
  removeAudienceTpl,
  saveAudienceTemplates,
  toggleAudienceSpot
} = inject("console")
</script>
