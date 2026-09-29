<template>
            <div class="mask" @click.self="postOpen=false">
              <aside class="drawer drawer-mall drawer-post" :style="{ width: postDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startPostDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div>
                      <h3>{{ postCreating ? '官方发稿' : (postForm.title || '资讯文章') }}</h3>
                      <div class="sub">{{ postCreating ? '官方' : ((postSelected && postSelected.authorName) || '研学学员') }} · {{ postStatusLabel(postForm.status) }}</div>
                    </div>
                  </div>
                  <el-button @click="postOpen=false">关闭</el-button>
                </div>
                <div class="drawer-split drawer-split-edit">
                  <div class="drawer-form" :style="postFormPx ? { flex: '0 0 ' + postFormPx + 'px', width: postFormPx + 'px' } : {}">
                    <div class="edit-grid">
                      <div class="full"><label>标题</label><el-input v-model="postForm.title" maxlength="40" /></div>
                      <div>
                        <label>频道</label>
                        <el-select v-model="postForm.channel" style="width:100%">
                          <el-option label="官方" value="official" />
                          <el-option label="文章" value="experience" />
                          <el-option label="宣传" value="video" />
                        </el-select>
                      </div>
                      <div>
                        <label>状态</label>
                        <el-select v-model="postForm.status" style="width:100%">
                          <el-option label="提交审核" value="pending" />
                          <el-option label="草稿" value="draft" />
                          <el-option label="已下架" value="private" />
                        </el-select>
                      </div>
                      <div class="full">
                        <label>分类</label>
                        <el-input :model-value="postForm.category || (postSelected && postSelected.status==='published' ? (postSelected.category || '') : '审批时由平台指定')" disabled />
                      </div>
                      <div class="full">
                        <label>话题标签 {{ (postForm.tags || []).length }}/4</label>
                        <div class="tag-picked">
                          <span class="tag-chip on" v-for="(tag, ti) in postForm.tags" :key="'tg'+ti" @click="removePostTag(ti)">#{{ tag }} ×</span>
                        </div>
                        <el-input v-if="(postForm.tags || []).length < 4" v-model="postForm.tagDraft" maxlength="8" @keyup.enter="addPostTag()">
                          <template #append><el-button @click="addPostTag()">添加</el-button></template>
                        </el-input>
                        <div class="tag-picked" style="margin-top:8px">
                          <span class="tag-chip" v-for="sug in SUGGEST_TAGS" :key="'sg'+sug" @click="addPostTag(sug)">#{{ sug }}</span>
                        </div>
                      </div>
                      <div class="full">
                        <label>封面</label>
                        <div class="cover-mode">
                          <button type="button" :class="{ on: postForm.coverMode==='none' }" @click="postForm.coverMode='none'">无封面</button>
                          <button type="button" :class="{ on: postForm.coverMode==='image' }" @click="postForm.coverMode='image'">图片封面</button>
                          <button type="button" :class="{ on: postForm.coverMode==='tpl' }" @click="postForm.coverMode='tpl'">文字模版</button>
                        </div>
                        <div v-if="postForm.coverMode==='image'">
                          <div class="gallery">
                            <div class="g-item" v-for="(u, ci) in postForm.coverImages" :key="'cv'+ci">
                              <img :src="u" alt="" />
                              <button type="button" @click="removePostCover(ci)">×</button>
                            </div>
                            <el-upload :show-file-list="false" :http-request="uploadPostCover">
                              <div class="gallery-add">+</div>
                            </el-upload>
                          </div>
                        </div>
                        <div v-else>
                          <el-input v-model="postForm.coverHl" placeholder="封面高亮文字，从标题里摘一段" />
                          <div class="tpl-pick-row">
                            <div v-for="tpl in COVER_TPLS" :key="tpl.id" class="tpl-pick" :class="{ on: postForm.coverTplId===tpl.id }" @click="postForm.coverTplId=tpl.id">
                              <div class="ntc" :class="'ntc-bg-'+tpl.id">
                                <div v-if="isCoverStack(tpl.id)" class="ntc-paper-b"></div>
                                <div v-if="isCoverStack(tpl.id)" class="ntc-paper-m"></div>
                                <div :class="isCoverQuote(tpl.id) ? 'ntc-sheet-flat' : 'ntc-sheet'">
                                  <div v-if="isCoverStack(tpl.id)" class="ntc-chrome"><i></i><i></i><i></i></div>
                                  <div v-if="isCoverQuote(tpl.id)" class="ntc-qmark" :class="'ntc-q-'+tpl.id">“</div>
                                  <div v-if="tpl.id==='lined'" class="ntc-ruled"><i></i><i></i><i></i><i></i></div>
                                  <div v-if="tpl.id==='letter'" class="ntc-wax">研</div>
                                  <div class="ntc-ttl" :class="{ mid: isCoverQuote(tpl.id) }">
                                    <span class="ntc-pre" :class="'ntc-c-'+tpl.id">{{ postCoverParts.prefix }}</span>
                                    <span v-if="postCoverParts.head" class="ntc-hl" :class="'hl-'+tpl.id"><b :class="'ntc-h-'+tpl.id">{{ postCoverParts.head }}</b></span>
                                    <span class="ntc-rest" :class="'ntc-c-'+tpl.id">{{ postCoverParts.rest }}</span>
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
                          <button type="button" @mousedown.prevent="postFormat('justifyRight')">右对齐</button>
                          <button type="button" @mousedown.prevent="postFormat('insertUnorderedList')">列表</button>
                          <button type="button" @mousedown.prevent="postFormat('insertHorizontalRule')">分隔线</button>
                          <el-upload :show-file-list="false" :http-request="uploadPostBodyImage">
                            <button type="button">插图</button>
                          </el-upload>
                        </div>
                        <div class="post-editor" contenteditable="true" :key="postEditorKey" v-once v-html="postForm.html" @input="onPostEditorInput"></div>
                      </div>
                      <div class="full">
                        <label>超链接</label>
                        <el-input v-model="postForm.linkDraft" placeholder="公众号、视频号或网页链接" @keyup.enter="addPostLink">
                          <template #append><el-button @click="addPostLink">添加</el-button></template>
                        </el-input>
                        <div class="shop-row" v-for="(lk, li) in postForm.links" :key="'lk'+li">
                          <span>{{ lk.title }} · {{ lk.url }}</span>
                          <span class="link-btn" @click="removePostLink(li)">删除</span>
                        </div>
                      </div>
                      <div class="full">
                        <label>正文视频</label>
                        <el-input v-model="postForm.videoUrl" placeholder="视频地址" @keyup.enter="addPostVideo">
                          <template #append><el-button @click="addPostVideo">添加</el-button></template>
                        </el-input>
                        <div class="shop-row" v-for="(v, vi) in postForm.videos" :key="'vd'+vi">
                          <span>{{ v.url }}</span>
                          <span class="link-btn" @click="removePostVideo(vi)">删除</span>
                        </div>
                      </div>
                      <div class="full">
                        <label>发布对象</label>
                        <el-select v-model="postForm.publisherScope" style="width:100%" @change="onPostPublisherScopeChange">
                          <el-option label="平台官方" value="platform" />
                          <el-option label="代企业发布" value="enterprise" />
                          <el-option label="代项目发布" value="project" />
                        </el-select>
                      </div>
                      <div class="full" v-if="postForm.publisherScope==='enterprise'">
                        <label>目标企业</label>
                        <el-select v-model="postForm.enterpriseId" filterable style="width:100%" placeholder="选择企业">
                          <el-option v-for="e in (projEnterprises.length ? projEnterprises : entList)" :key="'pe-'+e.id" :label="(e.shortName || e.name)" :value="e.id" />
                        </el-select>
                      </div>
                      <div class="full" v-if="postForm.publisherScope==='project'">
                        <label>目标研学项目</label>
                        <el-select v-model="postForm.projectId" filterable style="width:100%" placeholder="选择项目">
                          <el-option v-for="p in projList" :key="'pp-'+p.id" :label="p.title" :value="p.id" />
                        </el-select>
                      </div>
                      <div class="full">
                        <label>发布单位（固定）</label>
                        <el-input :model-value="postPublisherLabel" disabled />
                        <div class="sub" style="margin-top:4px">随发布对象自动锁定，发稿时不可改；改显示名请到「发布单位」</div>
                      </div>
                    </div>
                  </div>
                  <div class="drawer-gutter" :class="{ on: splitHover }" @mousedown="startPostSplitResize"></div>
                  <div class="drawer-preview">
                    <div class="pv-label">详情预览</div>
                    <div class="pv-board" style="height:720px;background:#FFFFFF;border-color:#E5E7EB">
                      <div class="pv-back"><svg viewBox="0 0 48 48" fill="none"><path d="M28 12L16 24L28 36" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>返回</div>
                      <div class="pv-scroll" style="padding:52px 16px 28px;background:#FFFFFF">
                        <div class="nv-meta">
                          <span class="pd-tag" :style="{ background: postForm.channel==='official' ? '#1A1A1A' : (postForm.channel==='video' ? '#C45C26' : '#1A73E8') }">{{ postChannelLabel(postForm.channel, (postForm.tags && postForm.tags[0]) || '') }}</span>
                          <span class="nv-time">{{ postStatusLabel(postForm.status) }}</span>
                        </div>
                        <div class="pd-title">{{ postForm.title || '文章标题' }}</div>
                        <div class="pd-topics" v-if="(postForm.tags || []).length">
                          <span class="pd-topic" v-for="tag in postForm.tags" :key="'pt'+tag" :style="{ background: postTagColor(tag) }">#{{ tag }}</span>
                        </div>
                        <div v-if="postForm.coverMode==='tpl'" class="ntc ntc-lg" :class="'ntc-bg-'+postForm.coverTplId">
                          <div v-if="isCoverStack(postForm.coverTplId)" class="ntc-paper-b"></div>
                          <div v-if="isCoverStack(postForm.coverTplId)" class="ntc-paper-m"></div>
                          <div :class="isCoverQuote(postForm.coverTplId) ? 'ntc-sheet-flat' : 'ntc-sheet'">
                            <div v-if="isCoverStack(postForm.coverTplId)" class="ntc-chrome"><i></i><i></i><i></i></div>
                            <div v-if="isCoverQuote(postForm.coverTplId)" class="ntc-qmark" :class="'ntc-q-'+postForm.coverTplId">“</div>
                            <div v-if="postForm.coverTplId==='lined'" class="ntc-ruled"><i></i><i></i><i></i><i></i><i></i><i></i></div>
                            <div v-if="postForm.coverTplId==='letter'" class="ntc-wax">研</div>
                            <div class="ntc-ttl" :class="{ mid: isCoverQuote(postForm.coverTplId) }">
                              <span class="ntc-pre" :class="'ntc-c-'+postForm.coverTplId">{{ postCoverParts.prefix }}</span>
                              <span v-if="postCoverParts.head" class="ntc-hl" :class="'hl-'+postForm.coverTplId"><b :class="'ntc-h-'+postForm.coverTplId">{{ postCoverParts.head }}</b></span>
                              <span class="ntc-rest" :class="'ntc-c-'+postForm.coverTplId">{{ postCoverParts.rest }}</span>
                            </div>
                            <div class="ntc-foot" :class="{ end: isCoverQuote(postForm.coverTplId) }"><i :class="'ntc-rule-'+postForm.coverTplId"></i></div>
                          </div>
                        </div>
                        <div v-else-if="postForm.coverMode==='image'">
                          <img v-for="(u, ui) in postForm.coverImages" :key="'pci'+ui" :src="u" alt="" style="width:100%;margin-bottom:8px;display:block" />
                        </div>
                        <div class="pd-author">{{ postCreating ? '官方' : ((postSelected && postSelected.authorName) || '研学学员') }}</div>
                        <div class="pd-rich" v-html="postPreviewHtml"></div>
                        <video v-for="(clip, cvi) in postForm.videos" :key="'pvv'+cvi" :src="clip.url" controls style="width:100%;margin-top:10px"></video>
                        <div class="pd-link" v-for="(lk, pli) in postForm.links" :key="'pvl'+pli">
                          <b>{{ lk.title }}</b>
                          <span>{{ lk.url }}</span>
                        </div>
                        <div class="nv-proj" v-if="postPreviewProject">
                          <div class="nv-proj-copy">
                            <span class="nv-kicker">关联研学项目</span>
                            <b>{{ postPreviewProject }}</b>
                          </div>
                          <span class="nv-proj-go">查看 ›</span>
                        </div>
                        <div class="pd-cmt">
                          <div class="nv-kicker">交流 {{ (postComments || []).length }}</div>
                          <div class="one" v-for="c in postComments" :key="c.id">
                            <b>{{ c.authorName }}</b>
                            <div>{{ c.content }}</div>
                          </div>
                          <div v-if="!(postComments || []).length" class="nv-time">还没有评论</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button v-if="!postCreating" @click="deletePost">删除</el-button>
                  <el-button type="primary" @click="postForm.status='draft'; savePost()">暂存草稿</el-button>
                  <el-button @click="postOpen=false">取消</el-button>
                  <el-button type="primary" :loading="postSaving" @click="postForm.status='pending'; savePost()">提交审核</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  COVER_TPLS,
  SUGGEST_TAGS,
  addPostLink,
  addPostTag,
  addPostVideo,
  deletePost,
  entList,
  isCoverQuote,
  isCoverStack,
  loading,
  onPostEditorInput,
  onPostPublisherScopeChange,
  postChannelLabel,
  postComments,
  postCoverParts,
  postCreating,
  postDrawerPx,
  postEditorKey,
  postForm,
  postFormPx,
  postFormat,
  postOpen,
  postPreviewHtml,
  postPreviewProject,
  postPublisherLabel,
  postSaving,
  postSelected,
  postStatusLabel,
  postTagColor,
  projEnterprises,
  projList,
  removePostCover,
  removePostLink,
  removePostTag,
  removePostVideo,
  savePost,
  splitHover,
  startPostDrawerResize,
  startPostSplitResize,
  title,
  uploadPostBodyImage,
  uploadPostCover
} = inject("console")
</script>
