<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">OPS</div>
                    <h3>开屏公告</h3>
                    <p>小程序启动时弹出，用于平台运维通知。可控制是否允许关闭，支持富文本、图片、视频和附件。</p>
                  </div>
                  <el-button type="primary" :loading="settingsSaving" @click="saveSplashAnnounce">保存公告</el-button>
                </div>
                <div v-if="settingsLoading" class="empty-board"><b>正在载入</b></div>
                <div v-else class="sheet">
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div class="full" style="display:flex;gap:24px;align-items:center">
                        <el-switch v-model="splashForm.enabled" active-text="启用开屏公告" />
                        <el-switch v-model="splashForm.closable" active-text="允许点关闭" />
                      </div>
                      <div class="full"><label>标题</label><el-input v-model="splashForm.title" maxlength="40" placeholder="如 系统维护通知" /></div>
                      <div class="full">
                        <label>正文</label>
                        <div class="story-fmt">
                          <button type="button" @mousedown.prevent="splashFormat('bold')">粗体</button>
                          <button type="button" @mousedown.prevent="splashFormat('italic')">斜体</button>
                          <button type="button" @mousedown.prevent="splashFormat('insertUnorderedList')">列表</button>
                          <el-upload :show-file-list="false" :http-request="uploadSplashBodyImage">
                            <button type="button">插入图片</button>
                          </el-upload>
                        </div>
                        <div class="splash-editor post-editor" contenteditable="true" :key="splashEditorKey" v-once v-html="splashForm.html" @input="onSplashEditorInput"></div>
                      </div>
                      <div class="full">
                        <label>配图</label>
                        <el-upload :show-file-list="false" :http-request="(opt) => uploadSplashAsset(opt, 'images')">
                          <el-button>上传图片</el-button>
                        </el-upload>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                          <div v-for="(img, ii) in (splashForm.images||[])" :key="img.url" style="position:relative">
                            <img :src="img.url" style="width:96px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #E5E7EB" />
                            <el-button size="small" text type="danger" @click="removeSplashAsset('images', ii)">删除</el-button>
                          </div>
                        </div>
                      </div>
                      <div class="full">
                        <label>视频</label>
                        <el-upload :show-file-list="false" :http-request="(opt) => uploadSplashAsset(opt, 'videos')" accept="video/*">
                          <el-button>上传视频</el-button>
                        </el-upload>
                        <div v-for="(vid, vi) in (splashForm.videos||[])" :key="vid.url" style="display:flex;align-items:center;gap:8px;margin-top:6px">
                          <a :href="vid.url" target="_blank">{{ vid.name || vid.url }}</a>
                          <el-button size="small" text type="danger" @click="removeSplashAsset('videos', vi)">删除</el-button>
                        </div>
                      </div>
                      <div class="full">
                        <label>附件</label>
                        <el-upload :show-file-list="false" :http-request="(opt) => uploadSplashAsset(opt, 'attachments')">
                          <el-button>上传附件（PDF / Office / ZIP）</el-button>
                        </el-upload>
                        <div v-for="(att, ai) in (splashForm.attachments||[])" :key="att.url" style="display:flex;align-items:center;gap:8px;margin-top:6px">
                          <a :href="att.url" target="_blank">{{ att.name || '附件' }}</a>
                          <el-button size="small" text type="danger" @click="removeSplashAsset('attachments', ai)">删除</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  active,
  onSplashEditorInput,
  removeSplashAsset,
  saveSplashAnnounce,
  settingsLoading,
  settingsSaving,
  splashEditorKey,
  splashForm,
  splashFormat,
  uploadSplashAsset,
  uploadSplashBodyImage
} = inject("console")
</script>
