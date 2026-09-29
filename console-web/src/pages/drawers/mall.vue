<template>
            <div class="mask" @click.self="closeMall">
              <aside class="drawer drawer-mall" :style="{ width: chipDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startChipDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div class="thumb" style="width:52px;height:52px;font-size:18px">
                      <img v-if="productImg(mallForm)" :src="productImg(mallForm)" alt="" />
                      <span v-else>{{ mallCreating ? '新' : productInitial(mallForm) }}</span>
                    </div>
                    <div>
                      <h3>{{ mallCreating ? '上架一件商品' : (mallForm.name || '编辑商品') }}</h3>
                      <div class="sub">{{ mallCreating ? '填好后点保存，小程序店铺就会出现' : (mallForm.sku ? ('货号 ' + mallForm.sku) : '') }}</div>
                    </div>
                  </div>
                  <el-button @click="closeMall">关闭</el-button>
                </div>
                <div class="drawer-split">
                <div class="drawer-form" :style="chipFormPx ? { width: chipFormPx + 'px', flex: '0 0 ' + chipFormPx + 'px' } : {}">
                  <button class="mall-mod" type="button" :class="{ on: mallEditPanel==='photos' }" @click="openMallEdit('photos')">图片<span>封面 / 头图</span></button>
                  <button class="mall-mod" type="button" :class="{ on: mallEditPanel==='basic' }" @click="openMallEdit('basic')">信息<span>名称 / 货号 / 价格</span></button>
                  <button class="mall-mod" type="button" :class="{ on: mallEditPanel==='specs' }" @click="openMallEdit('specs')">规格<span>规格 / 服务标签</span></button>
                  <button class="mall-mod" type="button" :class="{ on: mallEditPanel==='story' }" @click="openMallEdit('story')">图文<span>正文排版</span></button>
                  <button class="mall-mod" type="button" v-if="mallCreating || mallSelected" :class="{ on: mallEditPanel==='stock' }" @click="openMallEdit('stock')">库存<span>{{ mallCreating ? '初始库存' : ((mallSelected && mallSelected.stock) + ' 件') }}</span></button>
                </div>
                <div class="drawer-gutter" :class="{ on: splitHover }" @mousedown="startChipSplitResize"></div>
                <div class="drawer-preview">
                  <div class="pv-label">小程序预览</div>
                  <div class="phone">
                    <div class="mp-status"></div>
                    <div class="mp-nav">
                      <div class="mp-nav-back"><svg viewBox="0 0 48 48" fill="none"><path d="M28 12L16 24L28 36" stroke="#1A1A1A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>返回</div>
                      <div class="mp-nav-title">商品详情</div>
                      <div class="mp-nav-space"></div>
                    </div>
                    <div class="mp-body">
                      <div class="mp-hero mp-hit" @click="openMallEdit('photos')">
                        <img v-if="mallPreview.cover" :src="mallPreview.gallery[mallPreviewHero] || mallPreview.cover" alt="" />
                        <div v-else class="mp-hero-empty">暂无图片</div>
                        <div class="mp-dots" v-if="mallPreview.gallery.length > 1" @click.stop>
                          <span class="mp-dot" v-for="(u, i) in mallPreview.gallery" :key="'dot-'+i" :class="{ on: mallPreviewHero===i }" @click="mallPreviewHero=i"></span>
                        </div>
                        <div v-if="mallPreview.offSale" class="mp-off">已下架</div>
                      </div>
                      <div class="mp-sheet">
                        <div class="mp-gold"></div>
                        <div class="mp-kicker">SOUVENIR</div>
                        <div class="mp-hit" @click="openMallEdit('basic')">
                          <div class="mp-price-row">
                            <span class="mp-currency">¥</span>
                            <span class="mp-price">{{ mallPreview.price }}</span>
                            <span v-if="mallPreview.category" class="mp-cat">{{ mallPreview.category }}</span>
                          </div>
                          <div class="mp-name">{{ mallPreview.name }}</div>
                          <div v-if="mallRatingCount" class="mp-rate">{{ mallRatingAvg }} 分 · {{ mallRatingCount }} 条评价</div>
                          <div v-if="mallPreview.intro" class="mp-intro">{{ mallPreview.intro }}</div>
                        </div>
                        <div class="mp-rule"></div>
                        <div class="mp-hit" @click="openMallEdit('specs')">
                          <div class="mp-services">
                            <div class="mp-svc" v-for="(s, i) in mallPreview.services" :key="'ps-'+i">
                              <span class="mp-dot-svc"></span>{{ s }}
                            </div>
                          </div>
                          <div class="mp-block">
                            <div class="mp-block-title">商品规格</div>
                            <div class="mp-spec" v-for="(spec, i) in mallPreview.specs.slice(0,3)" :key="'psp-'+i">
                              <span class="mp-spec-k">{{ spec.label }}</span>
                              <span class="mp-spec-v">{{ spec.value }}</span>
                            </div>
                            <div v-if="mallPreview.specs.length > 3" class="mp-locked">更多</div>
                          </div>
                        </div>
                        <div class="mp-block mp-hit" @click="openMallEdit('story')">
                          <div class="mp-block-title">图文详情</div>
                          <div v-for="b in mallPreview.blocks" :key="b.id">
                            <div v-if="b.type==='text'" class="mp-story-html" v-html="b.html"></div>
                            <img v-else-if="b.type==='image' && b.url" class="mp-dimg" :src="productImg({ imageUrl: b.url })" :style="{ width: (b.width || 100) + '%' }" alt="" />
                            <div v-else-if="b.type==='carousel' && (b.urls || []).length" class="mp-carousel">
                              <img :src="productImg({ imageUrl: b.urls[0] })" alt="" />
                            </div>
                            <div v-else-if="b.type==='stack'">
                              <img class="mp-dimg" v-for="(u, ui) in (b.urls || [])" :key="b.id+'-s-'+ui" :src="productImg({ imageUrl: u })" alt="" />
                            </div>
                          </div>
                        </div>
                        <div class="mp-block">
                          <div class="mp-block-title">评价 {{ mallCommentTotal }}</div>
                          <div v-if="!mallCommentGroups.length" class="mp-locked">还没有评价</div>
                          <div v-for="g in mallCommentGroups" :key="'pg-'+g.date">
                            <div class="mp-cmt-date">{{ g.date }}</div>
                            <div class="mp-cmt" v-for="entry in walkComments(g.items)" :key="entry.row.id" :class="{ 'mp-cmt-nested': entry.depth }">
                              <div>
                                <span class="mp-cmt-name">{{ entry.row.authorName }}</span>
                                <span v-if="entry.row.rating" class="mp-cmt-stars">{{ starText(entry.row.rating) }}</span>
                              </div>
                              <span v-if="entry.row.replyToName" class="mp-cmt-to">回复 {{ entry.row.replyToName }}</span>
                              <span class="mp-cmt-txt">{{ entry.row.content }}</span>
                            </div>
                          </div>
                          <div class="mp-locked">完成购买后可评价</div>
                        </div>
                        <div class="mp-safe"></div>
                      </div>
                    </div>
                    <div class="mp-buy">
                      <div class="mp-buy-svc">联系<br>客服</div>
                      <div class="mp-buy-cart">加入购物车</div>
                      <div class="mp-buy-now">立即购买</div>
                    </div>
                  </div>
                </div>
                </div>
                <el-dialog v-model="mallEditOpen" :title="mallEditTitle" :width="mallEditPanel==='story' ? '680px' : '560px'" append-to-body destroy-on-close>
                  <div v-if="mallEditPanel==='photos'">
                    <div class="edit-grid">
                      <div class="full">
                        <label>封面</label>
                        <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="uploadMallCover" :disabled="mallUploading">
                          <div class="mall-cover mall-cover-edit">
                            <img v-if="productImg(mallForm)" :src="productImg(mallForm)" alt="" />
                            <div v-else class="mall-cover-hint">{{ mallUploading ? '正在上传…' : '上传图片' }}</div>
                          </div>
                        </el-upload>
                      </div>
                      <div class="full">
                        <label>头图</label>
                        <div class="gallery-row">
                          <div class="gallery-item" v-for="(url, gi) in (mallForm.gallery || [])" :key="'g-'+gi">
                            <img :src="url" alt="" />
                            <button class="gallery-del" type="button" @click="removeMallGallery(gi)">×</button>
                          </div>
                          <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="uploadMallGallery" :disabled="mallUploading">
                            <div class="gallery-add">+</div>
                          </el-upload>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="mallEditPanel==='basic'">
                    <div class="edit-grid">
                      <div class="full">
                        <label>商品名称</label>
                        <el-input v-model="mallForm.name" maxlength="40" />
                      </div>
                      <div class="full">
                        <label>货号</label>
                        <el-input v-model="mallForm.sku" maxlength="40" />
                      </div>
                      <div class="full">
                        <label>一句话介绍</label>
                        <el-input v-model="mallForm.intro" maxlength="80" />
                      </div>
                      <div>
                        <label>售价（元）</label>
                        <el-input v-model="mallForm.price" />
                      </div>
                      <div>
                        <label>分类</label>
                        <el-select v-model="mallForm.category" filterable allow-create default-first-option style="width:100%">
                          <el-option v-for="c in mallCategories" :key="c" :label="c" :value="c" />
                        </el-select>
                      </div>
                      <div class="full">
                        <label>卖给哪个研学项目</label>
                        <el-select v-model="mallForm.projectId" clearable style="width:100%" :disabled="inProjWorkspace">
                          <el-option v-for="proj in mallProjects" :key="proj.id" :label="proj.title || proj.name" :value="String(proj.id)" />
                        </el-select>
                      </div>
                      <div class="full">
                        <div class="verify-row">
                          <span>在小程序里出售</span>
                          <el-switch v-model="mallForm.status" active-value="ON_SALE" inactive-value="OFF_SALE" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="mallEditPanel==='specs'">
                    <div class="edit-grid">
                      <div class="full">
                        <label>服务标签</label>
                        <div class="spec-edit" v-for="(svc, si) in mallForm.services" :key="'sv-'+si">
                          <el-input v-model="mallForm.services[si]" maxlength="12" />
                          <el-button @click="removeMallService(si)">删</el-button>
                        </div>
                        <el-button @click="addMallService">添加标签</el-button>
                      </div>
                      <div class="full">
                        <label>规格</label>
                        <div class="spec-edit" v-for="(spec, xi) in mallForm.specs" :key="'sp-'+xi">
                          <el-input v-model="spec.label" maxlength="12" placeholder="名称" />
                          <el-input v-model="spec.value" maxlength="40" placeholder="内容" />
                          <el-button @click="removeMallSpec(xi)">删</el-button>
                        </div>
                        <el-button @click="addMallSpec">添加规格</el-button>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="mallEditPanel==='story'">
                    <div class="story-tools">
                      <el-button @click="addStoryBlock('text')">文字</el-button>
                      <el-button @click="addStoryBlock('image')">图片</el-button>
                      <el-button @click="addStoryBlock('carousel')">横向轮播</el-button>
                      <el-button @click="addStoryBlock('stack')">竖排图</el-button>
                    </div>
                    <div v-if="!(mallForm.detailBlocks || []).length" class="quiet">还没有图文块</div>
                    <div
                      class="story-card"
                      v-for="(b, i) in (mallForm.detailBlocks || [])"
                      :key="b.id"
                      draggable="true"
                      @dragstart="storyDragStart(i)"
                      @dragover.prevent
                      @drop="storyDrop(i)"
                    >
                      <div class="story-card-hd">
                        <b>{{ b.type==='text' ? '文字' : (b.type==='image' ? '图片' : (b.type==='carousel' ? '横向轮播' : '竖排图')) }}</b>
                        <span>
                          <span class="link-btn" @click="moveStoryBlock(i, -1)">上移</span>
                          <span class="link-btn" @click="moveStoryBlock(i, 1)">下移</span>
                          <span class="link-btn" @click="removeStoryBlock(i)">删除</span>
                        </span>
                      </div>
                      <div v-if="b.type==='text'">
                        <div class="story-fmt">
                          <button type="button" @mousedown.prevent="storyFormat('bold')">加粗</button>
                          <button type="button" @mousedown.prevent="storyFormat('italic')">斜体</button>
                          <select @change="storyFormat('fontSize', $event.target.value)">
                            <option value="3">小号</option>
                            <option value="4" selected>正文</option>
                            <option value="5">大号</option>
                            <option value="6">更大</option>
                          </select>
                          <button type="button" @mousedown.prevent="storyFormat('foreColor', '#1A1A1A')">墨色</button>
                          <button type="button" @mousedown.prevent="storyFormat('foreColor', '#C45C26')">赭色</button>
                          <button type="button" @mousedown.prevent="storyFormat('foreColor', '#1A73E8')">金色</button>
                          <button type="button" @mousedown.prevent="storyFormat('justifyLeft')">左对齐</button>
                          <button type="button" @mousedown.prevent="storyFormat('justifyCenter')">居中</button>
                        </div>
                        <div class="story-text" contenteditable="true" v-once v-html="b.html" @input="onStoryTextInput(i, $event)"></div>
                      </div>
                      <div v-else-if="b.type==='image'">
                        <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="uploadStory(i, 'image')" :disabled="mallUploading">
                          <img v-if="b.url" class="story-img" :src="productImg({ imageUrl: b.url })" :style="{ width: (b.width || 100) + '%' }" alt="" />
                          <div v-else class="gallery-add">+</div>
                        </el-upload>
                        <div style="margin-top:8px">
                          <label>缩放 {{ b.width || 100 }}%</label>
                          <el-slider :model-value="b.width || 100" :min="40" :max="100" @change="(v)=>setStoryWidth(i, v)" />
                        </div>
                      </div>
                      <div v-else>
                        <div class="story-carousel">
                          <div class="gallery-item" v-for="(u, ui) in (b.urls || [])" :key="b.id+'-u-'+ui">
                            <img :src="productImg({ imageUrl: u })" alt="" />
                            <button class="gallery-del" type="button" @click="removeStoryUrl(i, ui)">×</button>
                          </div>
                          <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="uploadStory(i, 'list')" :disabled="mallUploading">
                            <div class="gallery-add">+</div>
                          </el-upload>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="mallEditPanel==='stock'">
                    <div v-if="mallCreating">
                      <label>一开始有多少件货</label>
                      <el-input-number v-model="mallForm.stock" :min="0" :controls="true" style="width:100%" />
                    </div>
                    <div v-else-if="mallSelected">
                      <div class="kv" style="margin-bottom:12px">
                        <div><label>现在还剩</label><b>{{ mallSelected.stock }} 件</b></div>
                        <div><label>已卖出</label><b>{{ mallSelected.sales || 0 }} 件</b></div>
                      </div>
                      <div class="stock-actions">
                        <el-input-number v-model="mallStockInQty" :min="1" :max="9999" />
                        <el-button type="primary" :loading="mallSaving" @click="changeMallStock(mallStockInQty, '后台补货')">补货</el-button>
                      </div>
                      <div class="stock-actions" style="margin-top:10px">
                        <el-input-number v-model="mallStockOutQty" :min="1" :max="9999" />
                        <el-button :loading="mallSaving" @click="changeMallStock(-mallStockOutQty, '后台出库')">减库存</el-button>
                      </div>
                    </div>
                  </div>
                  <template #footer>
                    <el-button @click="closeMallEdit">完成</el-button>
                  </template>
                </el-dialog>
                <div class="drawer-foot">
                  <el-button v-if="mallSelected && !mallCreating" @click="deleteMall">删除</el-button>
                  <el-button @click="closeMall">取消</el-button>
                  <el-button type="primary" :loading="mallSaving" @click="saveMall">保存</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  active,
  addMallService,
  addMallSpec,
  addStoryBlock,
  changeMallStock,
  chipDrawerPx,
  chipFormPx,
  closeMall,
  closeMallEdit,
  deleteMall,
  inProjWorkspace,
  loading,
  mallCategories,
  mallCommentGroups,
  mallCommentTotal,
  mallCreating,
  mallEditOpen,
  mallEditPanel,
  mallEditTitle,
  mallForm,
  mallPreview,
  mallPreviewHero,
  mallProjects,
  mallRatingAvg,
  mallRatingCount,
  mallSaving,
  mallSelected,
  mallStockInQty,
  mallStockOutQty,
  mallUploading,
  moveStoryBlock,
  onStoryTextInput,
  openMallEdit,
  phone,
  productImg,
  productInitial,
  removeMallGallery,
  removeMallService,
  removeMallSpec,
  removeStoryBlock,
  removeStoryUrl,
  saveMall,
  setStoryWidth,
  splitHover,
  starText,
  startChipDrawerResize,
  startChipSplitResize,
  storyDragStart,
  storyDrop,
  storyFormat,
  title,
  uploadMallCover,
  uploadMallGallery,
  uploadStory,
  walkComments
} = inject("console")
</script>
