<template>
            <div class="mask" @click.self="noticeOpen=false">
              <aside class="drawer drawer-mall drawer-post" :style="{ width: postDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startPostDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div>
                      <h3>{{ noticeCreating ? ((noticeForm.kind==='dynamics' || active==='dynamics' || inProjWorkspace) ? '写项目动态' : '写企业资讯') : (noticeForm.title || ((noticeForm.kind==='dynamics' || active==='dynamics') ? '动态' : '资讯')) }}</h3>
                      <div class="sub">{{ noticeCreating ? ((noticeForm.kind==='dynamics' || active==='dynamics' || inProjWorkspace) ? '发布后立即展示在本项目「相关动态」，无需平台审批' : (noticeForm.projectId ? '提交后需平台审批（企业资讯，可选关联项目展示）' : '企业级资讯，提交后需平台审批')) : (noticeStatusLabel((noticeSelected && noticeSelected.status) || 'pending') + ((noticeSelected && noticeSelected.status==='rejected' && noticeSelected.reviewNote) ? (' · ' + noticeSelected.reviewNote) : '')) }}</div>
                    </div>
                  </div>
                  <el-button @click="noticeOpen=false">关闭</el-button>
                </div>
                <div class="drawer-split drawer-split-edit">
                  <div class="drawer-form" :style="postFormPx ? { flex: '0 0 ' + postFormPx + 'px', width: postFormPx + 'px' } : {}">
                    <div class="edit-grid">
                      <div class="full"><label>标题</label><el-input v-model="noticeForm.title" maxlength="40" /></div>
                      <div class="full">
                        <label>研学项目{{ (active==='posts-dynamics') ? '（必选）' : ((noticeForm.kind==='dynamics' || active==='dynamics' || inProjWorkspace) ? '（必选·当前项目）' : '（可空＝企业级资讯）') }}</label>
                        <el-select v-model="noticeForm.projectId" style="width:100%" :disabled="inProjWorkspace || ((noticeForm.kind==='dynamics' || active==='dynamics') && active!=='posts-dynamics')" :clearable="active==='posts-dynamics' || !(noticeForm.kind==='dynamics' || active==='dynamics' || inProjWorkspace)" :placeholder="(active==='posts-dynamics') ? '选择研学项目' : ((noticeForm.kind==='dynamics' || active==='dynamics') ? '当前研学项目' : '企业级资讯（不绑项目）')">
                          <el-option v-for="p in (active==='posts-dynamics' ? noticeProjectOptions : projList)" :key="'nf-'+p.id" :label="p.title" :value="p.id" />
                        </el-select>
                      </div>
                      <div>
                        <label>分类</label>
                        <el-select v-if="area==='mp' && !inEntWorkspace" v-model="noticeForm.category" style="width:100%" placeholder="选择平台分类" clearable>
                          <el-option v-for="t in NOTICE_TYPES" :key="'nc-'+t" :label="t" :value="t" />
                        </el-select>
                        <el-input v-else :model-value="(noticeForm.category || noticeForm.type) || ((noticeForm.kind==='dynamics' || active==='dynamics' || active==='posts-dynamics') ? '分类由平台指定' : '审批时由平台指定')" disabled />
                        <div class="sub" style="margin-top:4px" v-if="area==='mp' && !inEntWorkspace && (noticeForm.kind==='dynamics' || active==='dynamics' || active==='posts-dynamics')">平台可随时指定/修改分类，不影响已发布状态</div>
                        <div class="sub" style="margin-top:4px" v-else-if="area==='mp' && !inEntWorkspace">已通过的资讯也可在此改分类，不会回到待审</div>
                        <div class="sub" style="margin-top:4px" v-else>分类由平台指定</div>
                      </div>
                      <div class="full">
                        <label>话题标签 {{ (noticeForm.tags || []).length }}/4</label>
                        <div class="tag-picked">
                          <span class="tag-chip on" v-for="(tag, ti) in (noticeForm.tags || [])" :key="'ntg'+ti" @click="removeNoticeTag(ti)">#{{ tag }} ×</span>
                        </div>
                        <el-input v-if="(noticeForm.tags || []).length < 4" v-model="noticeForm.tagDraft" maxlength="8" @keyup.enter="addNoticeTag()">
                          <template #append><el-button @click="addNoticeTag()">添加</el-button></template>
                        </el-input>
                        <div class="tag-picked" style="margin-top:8px">
                          <span class="tag-chip" v-for="sug in SUGGEST_TAGS" :key="'nsg'+sug" @click="addNoticeTag(sug)">#{{ sug }}</span>
                        </div>
                      </div>
                      <div><label>发布单位（固定）</label><el-input :model-value="noticePublisherLabel" disabled /><div class="sub" style="margin-top:4px">企业用企业发布单位，项目用项目组发布单位；改名请到「资讯文章 → 发布单位」</div></div>
                      <div class="full">
                        <label>封面</label>
                        <div class="cover-mode">
                          <button type="button" :class="{ on: noticeForm.coverMode==='none' }" @click="noticeForm.coverMode='none'">无封面</button>
                          <button type="button" :class="{ on: noticeForm.coverMode==='image' }" @click="noticeForm.coverMode='image'">图片封面</button>
                          <button type="button" :class="{ on: noticeForm.coverMode==='tpl' }" @click="noticeForm.coverMode='tpl'">文字模版</button>
                        </div>
                        <div v-if="noticeForm.coverMode==='image'">
                          <div class="gallery">
                            <div class="g-item" v-for="(u, ci) in noticeForm.coverImages" :key="'ncv'+ci">
                              <img :src="u" alt="" />
                              <button type="button" @click="removeNoticeCover(ci)">×</button>
                            </div>
                            <el-upload :show-file-list="false" :http-request="uploadNoticeCover">
                              <div class="gallery-add">+</div>
                            </el-upload>
                          </div>
                        </div>
                        <div v-else>
                          <el-input v-model="noticeForm.coverHl" placeholder="封面高亮文字，从标题里摘一段" />
                          <div class="tpl-pick-row">
                            <div v-for="tpl in COVER_TPLS" :key="'nt-'+tpl.id" class="tpl-pick" :class="{ on: noticeForm.coverTplId===tpl.id }" @click="noticeForm.coverTplId=tpl.id">
                              <div class="ntc" :class="'ntc-bg-'+tpl.id">
                                <div v-if="isCoverStack(tpl.id)" class="ntc-paper-b"></div>
                                <div v-if="isCoverStack(tpl.id)" class="ntc-paper-m"></div>
                                <div :class="isCoverQuote(tpl.id) ? 'ntc-sheet-flat' : 'ntc-sheet'">
                                  <div v-if="isCoverStack(tpl.id)" class="ntc-chrome"><i></i><i></i><i></i></div>
                                  <div v-if="isCoverQuote(tpl.id)" class="ntc-qmark" :class="'ntc-q-'+tpl.id">“</div>
                                  <div v-if="tpl.id==='lined'" class="ntc-ruled"><i></i><i></i><i></i><i></i></div>
                                  <div v-if="tpl.id==='letter'" class="ntc-wax">研</div>
                                  <div class="ntc-ttl" :class="{ mid: isCoverQuote(tpl.id) }">
                                    <span class="ntc-pre" :class="'ntc-c-'+tpl.id">{{ noticeCoverParts.prefix }}</span>
                                    <span v-if="noticeCoverParts.head" class="ntc-hl" :class="'hl-'+tpl.id"><b :class="'ntc-h-'+tpl.id">{{ noticeCoverParts.head }}</b></span>
                                    <span class="ntc-rest" :class="'ntc-c-'+tpl.id">{{ noticeCoverParts.rest }}</span>
                                  </div>
                                  <div class="ntc-foot" :class="{ end: isCoverQuote(tpl.id) }"><i :class="'ntc-rule-'+tpl.id"></i></div>
                                </div>
                              </div>
                              <span class="tpl-pick-name">{{ tpl.name }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="full">
                        <label>正文</label>
                        <div class="story-fmt">
                          <button type="button" @mousedown.prevent="postFormat('bold')">加粗</button>
                          <button type="button" @mousedown.prevent="postFormat('italic')">斜体</button>
                          <button type="button" @mousedown.prevent="postFormat('underline')">下划线</button>
                          <select @change="postFormat('fontSize', $event.target.value)">
                            <option value="3">正文</option>
                            <option value="5">大号</option>
                            <option value="6">更大</option>
                            <option value="2">小号</option>
                          </select>
                          <button type="button" @mousedown.prevent="postFormat('foreColor', '#1A1A1A')">墨色</button>
                          <button type="button" @mousedown.prevent="postFormat('foreColor', '#C45C26')">赭色</button>
                          <button type="button" @mousedown.prevent="postFormat('foreColor', '#1A73E8')">金色</button>
                          <button type="button" @mousedown.prevent="postFormat('justifyLeft')">左对齐</button>
                          <button type="button" @mousedown.prevent="postFormat('justifyCenter')">居中</button>
                          <button type="button" @mousedown.prevent="postFormat('insertUnorderedList')">列表</button>
                          <el-upload :show-file-list="false" :http-request="uploadNoticeBodyImage">
                            <button type="button">插图</button>
                          </el-upload>
                        </div>
                        <div class="post-editor notice-editor" contenteditable="true" :key="noticeEditorKey" v-once v-html="noticeForm.html" @input="onNoticeEditorInput"></div>
                      </div>
                      <div class="full">
                        <label>超链接</label>
                        <el-input v-model="noticeForm.linkDraft" placeholder="公众号、视频号或网页链接" @keyup.enter="addNoticeLink">
                          <template #append><el-button @click="addNoticeLink">添加</el-button></template>
                        </el-input>
                        <div class="shop-row" v-for="(lk, li) in noticeForm.links" :key="'nlk'+li">
                          <span>{{ lk.title }} · {{ lk.url }}</span>
                          <span class="link-btn" @click="removeNoticeLink(li)">删除</span>
                        </div>
                      </div>
                      <div class="full">
                        <label>正文视频</label>
                        <el-input v-model="noticeForm.videoUrl" placeholder="视频地址" @keyup.enter="addNoticeVideo">
                          <template #append><el-button @click="addNoticeVideo">添加</el-button></template>
                        </el-input>
                        <div class="shop-row" v-for="(v, vi) in noticeForm.videos" :key="'nvd'+vi">
                          <span>{{ v.url }}</span>
                          <span class="link-btn" @click="removeNoticeVideo(vi)">删除</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="drawer-gutter" :class="{ on: splitHover }" @mousedown="startPostSplitResize"></div>
                  <div class="drawer-preview">
                    <div class="pv-label">{{ (noticeForm.kind==='dynamics' || active==='dynamics') ? '动态详情预览' : '资讯详情预览' }}</div>
                    <div class="pv-board" style="height:720px;background:#F5F7FB;border-color:#E5E7EB">
                      <div class="pv-back"><svg viewBox="0 0 48 48" fill="none"><path d="M28 12L16 24L28 36" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>返回</div>
                      <div class="pv-scroll" style="padding:52px 16px 28px;background:#F5F7FB">
                        <div class="nv-sheet">
                          <div class="nv-gold"></div>
                          <div class="nv-body">
                            <div class="nv-kicker">BULLETIN</div>
                            <div class="nv-meta">
                              <span class="nv-type">{{ noticeForm.category || noticeForm.type || '待分类' }}</span>
                              <span class="nv-time">{{ prettyDate(new Date()) }}</span>
                            </div>
                            <div class="nv-title">{{ noticeForm.title || ((noticeForm.kind==='dynamics' || active==='dynamics') ? '动态标题' : '资讯标题') }}</div>
                            <div class="nv-rule"></div>
                            <div v-if="noticeForm.coverMode==='tpl'" class="ntc ntc-lg" :class="'ntc-bg-'+noticeForm.coverTplId">
                              <div v-if="isCoverStack(noticeForm.coverTplId)" class="ntc-paper-b"></div>
                              <div v-if="isCoverStack(noticeForm.coverTplId)" class="ntc-paper-m"></div>
                              <div :class="isCoverQuote(noticeForm.coverTplId) ? 'ntc-sheet-flat' : 'ntc-sheet'">
                                <div v-if="isCoverStack(noticeForm.coverTplId)" class="ntc-chrome"><i></i><i></i><i></i></div>
                                <div v-if="isCoverQuote(noticeForm.coverTplId)" class="ntc-qmark" :class="'ntc-q-'+noticeForm.coverTplId">“</div>
                                <div v-if="noticeForm.coverTplId==='lined'" class="ntc-ruled"><i></i><i></i><i></i><i></i></div>
                                <div v-if="noticeForm.coverTplId==='letter'" class="ntc-wax">研</div>
                                <div class="ntc-ttl" :class="{ mid: isCoverQuote(noticeForm.coverTplId) }">
                                  <span class="ntc-pre" :class="'ntc-c-'+noticeForm.coverTplId">{{ noticeCoverParts.prefix }}</span>
                                  <span v-if="noticeCoverParts.head" class="ntc-hl" :class="'hl-'+noticeForm.coverTplId"><b :class="'ntc-h-'+noticeForm.coverTplId">{{ noticeCoverParts.head }}</b></span>
                                  <span class="ntc-rest" :class="'ntc-c-'+noticeForm.coverTplId">{{ noticeCoverParts.rest }}</span>
                                </div>
                                <div class="ntc-foot" :class="{ end: isCoverQuote(noticeForm.coverTplId) }"><i :class="'ntc-rule-'+noticeForm.coverTplId"></i></div>
                              </div>
                            </div>
                            <img v-else-if="noticeForm.coverMode==='image'" v-for="(u, ui) in noticeForm.coverImages" :key="'nci'+ui" :src="u" alt="" style="width:100%;margin-bottom:8px;display:block" />
                            <div class="pd-rich" v-html="noticePreviewHtml"></div>
                            <video v-for="(clip, cvi) in noticeForm.videos" :key="'nvv'+cvi" :src="clip.url" controls style="width:100%;margin-top:10px"></video>
                            <div class="pd-link" v-for="(lk, pli) in noticeForm.links" :key="'nvl'+pli">
                              <b>{{ lk.title }}</b>
                              <span>{{ lk.url }}</span>
                            </div>
                            </div>
                        </div>
                        <div class="nv-proj" v-if="noticeProjectTitle">
                          <div class="nv-proj-copy">
                            <span class="nv-kicker">STUDY PASS</span>
                            <span class="nv-proj-label">关联研学项目</span>
                            <b>{{ noticeProjectTitle }}</b>
                          </div>
                          <span class="nv-proj-go">查看</span>
                        </div>
                        <div class="nv-pub"><span>发布单位</span><span>{{ noticePublisherLabel }}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button v-if="!noticeCreating" @click="deleteNotice()">删除</el-button>
                  <el-button @click="noticeOpen=false">取消</el-button>
                  <el-button type="primary" :loading="noticeSaving" @click="saveNotice">{{ (noticeForm.kind==='dynamics' || active==='dynamics' || active==='posts-dynamics') ? (noticeCreating ? '发布' : '保存') : (noticeCreating ? '提交审批' : (((noticeSelected && noticeSelected.status)==='rejected') ? '修改并重提' : '保存并重提')) }}</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  COVER_TPLS,
  NOTICE_TYPES,
  SUGGEST_TAGS,
  active,
  addNoticeLink,
  addNoticeTag,
  addNoticeVideo,
  area,
  deleteNotice,
  inEntWorkspace,
  inProjWorkspace,
  isCoverQuote,
  isCoverStack,
  loading,
  noticeCoverParts,
  noticeCreating,
  noticeEditorKey,
  noticeForm,
  noticeOpen,
  noticePreviewHtml,
  noticeProjectOptions,
  noticeProjectTitle,
  noticePublisherLabel,
  noticeSaving,
  noticeSelected,
  noticeStatusLabel,
  onNoticeEditorInput,
  postDrawerPx,
  postFormPx,
  postFormat,
  prettyDate,
  projList,
  removeNoticeCover,
  removeNoticeLink,
  removeNoticeTag,
  removeNoticeVideo,
  saveNotice,
  splitHover,
  startPostDrawerResize,
  startPostSplitResize,
  title,
  uploadNoticeBodyImage,
  uploadNoticeCover
} = inject("console")
</script>
