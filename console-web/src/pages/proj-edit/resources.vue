<template>
                  <div class="res-lib">
                    <div class="res-lib-top">
                      <div>
                        <div class="res-kicker">PROJECT LIBRARY</div>
                        <h3>研学资源</h3>
                        <p>只属于当前项目。站点路径从这里选用；更新文件会替换旧存储，删除也会从存储里清掉。正在被站点使用的不能删。</p>
                      </div>
                      <div class="res-lib-stats">
                        <div><b>{{ (projectResources || []).length }}</b><span>全部资源</span></div>
                        <div><b>{{ projectResourcesOf(projResourceTab).length }}</b><span>本组</span></div>
                        <div><b>{{ projResourceSel.length }}</b><span>已选</span></div>
                      </div>
                    </div>
                    <div class="res-types">
                      <button class="res-type" type="button" v-for="t in resourceTypes" :key="t.key" :class="{ on: projResourceTab===t.key }" @click="projResourceTab=t.key; projResourceForm=null">
                        <div class="res-type-ico">{{ t.mark }}</div>
                        <b>{{ t.name }}</b>
                        <em>{{ projectResourcesOf(t.key).length }} 份 · {{ t.hint }}</em>
                      </button>
                    </div>
                    <div class="res-lib-bar">
                      <div class="hint">{{ projResourceHint || resourceTypeOf(projResourceTab).hint }}</div>
                      <div style="display:flex;gap:8px;flex-wrap:wrap">
                        <el-upload v-if="projResourceTab==='video' || projResourceTab==='game'" :show-file-list="false" :accept="projResourceTab==='game' ? '.html,.htm,text/html' : 'video/*,audio/*,.mp4,.m4v,.mov,.3gp,.webm,.mp3,.m4a,.aac,.wav'" :http-request="uploadProjectResource" :disabled="projResourceUploading">
                          <el-button type="primary" :loading="projResourceUploading">{{ resourceTypeOf(projResourceTab).action }}</el-button>
                        </el-upload>
                        <el-button v-else type="primary" @click="startNewProjectResource">{{ resourceTypeOf(projResourceTab).action }}</el-button>
                        <el-button @click="loadProjectResources">刷新</el-button>
                        <el-button :disabled="!projResourceSel.length" @click="batchDeleteProjectResources">删除所选</el-button>
                      </div>
                    </div>
                    <!-- resource create/edit moved to el-dialog modal -->
                    <div class="res-grid" v-if="projResourceLoading">
                      <div class="res-empty"><b>正在读取本项目资源</b><p>稍等一下。</p></div>
                    </div>
                    <div class="res-grid" v-else-if="!projectResourcesOf(projResourceTab).length">
                      <div class="res-empty">
                        <b>还没有{{ resourceTypeOf(projResourceTab).name }}</b>
                        <p>{{ resourceTypeOf(projResourceTab).hint }}。做好后，研学路径里就可以直接选用。</p>
                        <el-upload v-if="projResourceTab==='video' || projResourceTab==='game'" :show-file-list="false" :accept="projResourceTab==='game' ? '.html,.htm,text/html' : 'video/*,audio/*'" :http-request="uploadProjectResource">
                          <el-button type="primary">{{ resourceTypeOf(projResourceTab).action }}</el-button>
                        </el-upload>
                        <el-button v-else type="primary" @click="startNewProjectResource">{{ resourceTypeOf(projResourceTab).action }}</el-button>
                      </div>
                    </div>
                    <div class="res-grid" v-else>
                      <div class="res-card" v-for="r in projectResourcesOf(projResourceTab)" :key="r.id" :class="{ on: projResourceSel.indexOf(r.id) >= 0 }">
                        <div class="res-card-media">
                          <video v-if="r.type==='video' && r.videoUrl" :src="r.videoUrl" muted></video>
                          <div class="res-ph" v-else>
                            <b>{{ resourceTypeOf(r.type).mark }}</b>
                            <span>{{ r.type==='quiz' ? ((r.questions||[]).length + ' 道题') : (r.type==='task' ? '现场任务' : 'H5 小游戏') }}</span>
                          </div>
                          <label class="res-check" @click.stop>
                            <el-checkbox :model-value="projResourceSel.indexOf(r.id) >= 0" @change="(v)=>toggleProjectResourceSel(r.id, v)" />
                          </label>
                          <span class="res-flag" :class="{ off: !r.usedCount }">{{ r.usedCount ? ('站点在用 ' + r.usedCount) : '未选用' }}</span>
                        </div>
                        <div class="res-card-bd">
                          <div class="res-card-name">{{ r.title || '未命名' }}</div>
                          <div class="res-card-meta">{{ [r.sizeLabel, r.originalName, resourceTimeOf(r.updatedAt || r.createdAt)].filter(Boolean).join(' · ') }}</div>
                          <div class="res-card-meta" v-if="r.type==='task' && r.taskBody">{{ r.taskBody }}</div>
                          <div class="res-card-meta" v-if="r.type==='quiz'">{{ (r.questions||[]).length }} 题 · 支持多选/部分分</div>
                          <div class="res-card-meta" v-if="r.type==='game'">{{ r.maxRetries == null ? '次数不限' : ('最多 ' + r.maxRetries + ' 次') }} · {{ (r.scoreTiers||[]).length }} 档积分</div>
                          <div class="res-card-ops">
                            <el-upload v-if="r.type==='video' || r.type==='game'" :show-file-list="false" :accept="r.type==='game' ? '.html,.htm,text/html' : 'video/*,audio/*'" :http-request="(opt)=>uploadProjectResource(opt, r.id)">
                              <span class="link-btn">换文件</span>
                            </el-upload>
                            <span class="link-btn" v-if="r.type==='quiz' || r.type==='task' || r.type==='game'" @click="editProjectResource(r)">编辑</span>
                            <span class="link-btn" v-if="r.gameUrl || r.videoUrl" @click="openResourceUrl(r)">打开看看</span>
                            <span class="link-btn" @click="deleteProjectResource(r)">删除</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="res-guide" v-if="projResourceTab==='game'">
                      小游戏通关时调用下面方法，分数会写回这个学员的研学记录。可配置次数上限与分数档积分；次数用尽仍可浏览，成绩不再升高，且本项算完成，可继续后续关卡；全部关卡完成后自动结算本站。
                      <code>MQLT.complete({ score: 86, passed: true, payload: { stars: 2 } })</code>
                    </div>
                    <el-dialog
                      class="res-dialog"
                      :model-value="!!projResourceForm"
                      :title="projResourceForm && projResourceForm.id ? ('编辑' + resourceTypeOf(projResourceForm.type).name) : ('新建' + resourceTypeOf((projResourceForm && projResourceForm.type) || projResourceTab).name)"
                      width="720px"
                      align-center
                      append-to-body
                      destroy-on-close
                      @close="closeResourceDialog"
                    >
                      <template v-if="projResourceForm">
                        <el-input v-model="projResourceForm.title" maxlength="40" placeholder="给资源起个名字，方便站点选用" style="margin-bottom:12px" />
                        <el-input v-if="projResourceForm.type==='task'" v-model="projResourceForm.taskBody" type="textarea" :rows="5" maxlength="400" placeholder="现场要做什么，工作人员如何确认完成" />
                        <div v-if="projResourceForm.type==='quiz'">
                          <div class="quiz-item" v-for="(q, qi) in (projResourceForm.questions || [])" :key="'rq'+qi">
                            <div class="quiz-hd"><b>第 {{ qi + 1 }} 题</b><span class="link-btn" @click="removeResourceQuiz(qi)">删除此题</span></div>
                            <el-input v-model="q.question" maxlength="160" placeholder="题目" style="margin-bottom:8px" />
                            <div class="form-row">
                              <el-checkbox v-model="q.multiSelect">多选题</el-checkbox>
                              <span class="hint">部分得分</span>
                              <el-select v-model="q.partialMode" style="width:160px">
                                <el-option label="不计部分分" value="none" />
                                <el-option label="按比例" value="ratio" />
                                <el-option label="固定半分" value="fixed" />
                              </el-select>
                              <template v-if="q.partialMode==='fixed'">
                                <span class="hint">半分值</span>
                                <el-input-number v-model="q.halfScore" :min="0" :max="999" size="small" />
                              </template>
                              <span class="hint">本题分</span>
                              <el-input-number v-model="q.points" :min="0" :max="999" size="small" placeholder="可空" />
                            </div>
                            <div class="quiz-opts">
                              <div class="quiz-opt-row" v-for="(opt, oi) in q.options" :key="'ro'+qi+oi">
                                <el-checkbox
                                  :model-value="(q.answerIndexes || []).indexOf(oi) >= 0"
                                  @change="(v)=>toggleResourceAnswer(qi, oi, v)"
                                />
                                <el-input v-model="q.options[oi]" maxlength="40" :placeholder="'选项 ' + (oi + 1)" />
                                <span class="link-btn" @click="removeResourceQuizOption(qi, oi)">删</span>
                              </div>
                            </div>
                            <div style="margin-top:8px">
                              <el-button size="small" @click="addResourceQuizOption(qi)">加选项</el-button>
                              <span class="hint" style="margin-left:8px">勾选为正确答案；多选可勾多项</span>
                            </div>
                          </div>
                          <el-button @click="addResourceQuiz">再加一题</el-button>
                        </div>
                        <div v-if="projResourceForm.type==='game'">
                          <div class="form-row">
                            <el-checkbox v-model="projResourceForm.retriesUnlimited" @change="(v)=>{ if(v) projResourceForm.maxRetries=null }">次数不限</el-checkbox>
                            <template v-if="!projResourceForm.retriesUnlimited">
                              <span class="hint">最多可玩</span>
                              <el-input-number v-model="projResourceForm.maxRetries" :min="1" :max="99" size="small" />
                              <span class="hint">次</span>
                            </template>
                            <el-checkbox v-model="projResourceForm.skippable">允许跳过</el-checkbox>
                          </div>
                          <p class="hint">游戏分数 → 本站积分档（按最高分匹配最高档）。次数用尽后仍可浏览，成绩不再升高。</p>
                          <table class="tier-table">
                            <thead><tr><th>最低分</th><th>本站积分</th><th>档名</th><th></th></tr></thead>
                            <tbody>
                              <tr v-for="(t, ti) in (projResourceForm.scoreTiers || [])" :key="'tier'+ti">
                                <td><el-input-number v-model="t.minScore" :min="0" :max="9999" size="small" /></td>
                                <td><el-input-number v-model="t.points" :min="0" :max="999" size="small" /></td>
                                <td><el-input v-model="t.title" maxlength="20" placeholder="如及格/优秀" /></td>
                                <td><span class="link-btn" @click="removeResourceScoreTier(ti)">删除</span></td>
                              </tr>
                            </tbody>
                          </table>
                          <el-button style="margin-top:8px" @click="addResourceScoreTier">增加分数档</el-button>
                          <p class="hint" style="margin-top:10px" v-if="projResourceForm.gameUrl || true">上传后可在卡片「打开看看」预览 H5。选用到站点步骤时会复制次数与积分档。</p>
                        </div>
                      </template>
                      <template #footer>
                        <el-button @click="closeResourceDialog">取消</el-button>
                        <el-button type="primary" :loading="projResourceSaving" @click="saveProjectResource">保存到本项目</el-button>
                      </template>
                    </el-dialog>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addResourceQuiz,
  addResourceQuizOption,
  addResourceScoreTier,
  batchDeleteProjectResources,
  closeResourceDialog,
  deleteProjectResource,
  editProjectResource,
  loadProjectResources,
  openResourceUrl,
  projResourceForm,
  projResourceHint,
  projResourceLoading,
  projResourceSaving,
  projResourceSel,
  projResourceTab,
  projResourceUploading,
  projectResources,
  projectResourcesOf,
  removeResourceQuiz,
  removeResourceQuizOption,
  removeResourceScoreTier,
  resourceTimeOf,
  resourceTypeOf,
  resourceTypes,
  saveProjectResource,
  startNewProjectResource,
  toggleProjectResourceSel,
  toggleResourceAnswer,
  uploadProjectResource
} = inject("console")
</script>
