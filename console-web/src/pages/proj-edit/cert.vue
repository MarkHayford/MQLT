<template>
                  <div class="studio-fill">
                    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px">
                      <div>
                        <h3 style="margin:0;font-size:18px;color:#1A1A1A">结业证书模板</h3>
                        <div class="route-foot-hint" style="margin-top:6px">每个项目可维护多套模板；学员结业时按「启用/当前」模板渲染证书正文。</div>
                      </div>
                      <el-button @click="resetCertForm">新建模板</el-button>
                    </div>
                    <div v-loading="projCertLoading" class="cert-layout" :style="{ '--cert-list-w': certListWidth + 'px', '--cert-preview-w': certPreviewWidth + 'px' }">
                      <div class="cert-list-col" style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:12px;min-height:280px">
                        <div v-if="!(projCertTemplates||[]).length" class="route-foot-hint">还没有模板，右侧填写后保存即可。</div>
                        <div v-for="row in projCertTemplates" :key="row.id" @click="editCertTemplate(row)" style="border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:10px 12px;margin-bottom:8px;cursor:pointer;background:#FFFFFF" :style="projCertForm.id===row.id ? 'outline:2px solid #1A73E8' : ''">
                          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
                            <b style="color:#1A1A1A">{{ row.name || '未命名' }}</b>
                            <el-tag v-if="row.id===projCertActiveId" size="small" type="warning">当前</el-tag>
                          </div>
                          <div style="font-size:12px;color:#6B7280;margin-top:4px">{{ row.title || '结业证书' }} · {{ row.enabled===false ? '停用' : '启用' }}</div>
                          <div style="margin-top:8px"><el-button link type="danger" @click.stop="deleteCertTemplate(row)">删除</el-button></div>
                        </div>
                      </div>
                      <div class="mqlt-vsplit" :class="{ on: mqltSplitHover==='cert-list' }" title="拖动调整模板列表宽度" @mousedown="startCertListResize"></div>
                      <div class="cert-edit-col" style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px">
                        <div class="edit-grid">
                          <div><label>模板名称</label><el-input v-model="projCertForm.name" maxlength="40" /></div>
                          <div><label>证书标题</label><el-input v-model="projCertForm.title" maxlength="40" /></div>
                          <div class="full"><label>正文 HTML（占位符：holderName / projectTitle / certificateNo / issuedAt / summary，写成双花括号包裹）</label>
                            <el-input v-model="projCertForm.bodyHtml" type="textarea" :rows="8" /></div>
                          <div class="full"><label>背景图</label>
                            <div style="display:flex;gap:8px;align-items:center">
                              <el-input v-model="projCertForm.bgUrl" placeholder="图片 URL" />
                              <el-button @click="uploadCertImage('bgUrl')">上传</el-button>
                            </div>
                            <img v-if="projCertForm.bgUrl" :src="projCertForm.bgUrl" alt="" style="margin-top:8px;max-width:100%;max-height:120px;border-radius:8px;border:1px solid #E5E7EB" />
                          </div>
                          <div class="full"><label>印章图</label>
                            <div style="display:flex;gap:8px;align-items:center">
                              <el-input v-model="projCertForm.sealUrl" placeholder="图片 URL" />
                              <el-button @click="uploadCertImage('sealUrl')">上传</el-button>
                            </div>
                          </div>
                          <div><label>启用</label><el-switch v-model="projCertForm.enabled" /></div>
                          <div><label>设为当前发证模板</label><el-switch v-model="projCertForm.setActive" /></div>
                          <div class="full" style="display:flex;gap:8px">
                            <el-button type="primary" :loading="projCertSaving" @click="saveCertTemplate">保存模板</el-button>
                          </div>
                        </div>
                        <div style="margin-top:18px;padding-top:14px;border-top:1px dashed #E5E7EB">
                          <h4 style="margin:0 0 8px;color:#1A1A1A">拼图源图</h4>
                          <div class="route-foot-hint" style="margin-bottom:10px">{{ projPuzzleSource.splitHint || '按预约点位数动态切分一块源图' }} · 当前启用点位约 {{ projPuzzleSource.enabledSpotCount || 0 }} 个</div>
                          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                            <el-button :loading="projPuzzleSaving" @click="uploadPuzzleSource">上传拼图源图</el-button>
                            <span style="font-size:12px;color:#6B7280;word-break:break-all">{{ projPuzzleSource.sourceImageUrl || '尚未上传' }}</span>
                          </div>
                          <img v-if="projPuzzleSource.sourceImageUrl" :src="projPuzzleSource.sourceImageUrl" alt="" style="margin-top:10px;max-width:100%;max-height:160px;border-radius:10px;border:1px solid #E5E7EB" />
                        </div>
                      </div>
                      <div class="mqlt-vsplit" :class="{ on: mqltSplitHover==='cert-preview' }" title="拖动调整证书预览宽度" @mousedown="startCertPreviewResize"></div>
                      <div class="cert-preview-col" style="background:#F5F7FB;border:1px solid #E5E7EB;border-radius:14px;padding:14px;min-height:280px">
                        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:10px">
                          <b style="color:#1A1A1A">证书预览</b>
                          <span style="font-size:12px;color:#6B7280">示例姓名 / 日期 / 编号</span>
                        </div>
                        <div class="cert-preview-paper" :style="certPreviewPaperStyle">
                          <div class="cert-preview-title">{{ projCertForm.title || '结业证书' }}</div>
                          <div class="cert-preview-body" v-html="certPreviewHtml"></div>
                          <img v-if="projCertForm.sealUrl" class="cert-preview-seal" :src="projCertForm.sealUrl" alt="印章" />
                        </div>
                        <div style="margin-top:8px;font-size:12px;color:#6B7280;line-height:1.6">
                          {{ certPreviewSample.holderName }} · {{ certPreviewSample.issuedAt }} · {{ certPreviewSample.certificateNo }}
                        </div>
                      </div>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  certListWidth,
  certPreviewHtml,
  certPreviewPaperStyle,
  certPreviewSample,
  certPreviewWidth,
  deleteCertTemplate,
  editCertTemplate,
  mqltSplitHover,
  projCertActiveId,
  projCertForm,
  projCertLoading,
  projCertSaving,
  projCertTemplates,
  projPuzzleSaving,
  projPuzzleSource,
  projectTitle,
  resetCertForm,
  saveCertTemplate,
  startCertListResize,
  startCertPreviewResize,
  uploadCertImage,
  uploadPuzzleSource
} = inject("console")
</script>
