<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">MALL</div>
                    <h3>文创商品</h3>
                    <p>研学周边商品。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ mallStats.total }}</b><span>全部</span></div>
                    <div><b>{{ mallStats.onSale }}</b><span>在售</span></div>
                    <div><b>{{ mallStats.offSale }}</b><span>下架</span></div>
                    <div><b>{{ mallStats.low }}</b><span>低库存</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-input class="users-search" v-model="mallKeyword" placeholder="名称 / SKU / 分类" clearable @keyup.enter="loadMall" />
                  <el-button type="primary" :loading="mallLoading" @click="loadMall">查询</el-button>
                  <el-button @click="openMallCreate">新建商品</el-button>
                  <button class="chip" :class="{ on: mallStatusFilter==='all' }" @click="mallStatusFilter='all'">全部</button>
                  <button class="chip" :class="{ on: mallStatusFilter==='ON_SALE' }" @click="mallStatusFilter='ON_SALE'">在售</button>
                  <button class="chip" :class="{ on: mallStatusFilter==='OFF_SALE' }" @click="mallStatusFilter='OFF_SALE'">下架</button>
                  <button class="chip" :class="{ on: mallLowOnly }" @click="mallLowOnly=!mallLowOnly">低库存</button>
                  <template v-if="!inProjWorkspace">
                    <button class="chip" :class="{ on: mallProjectFilter==='all' }" @click="mallProjectFilter='all'">全部项目</button>
                    <button class="chip" :class="{ on: mallProjectFilter==='none' }" @click="mallProjectFilter='none'">未绑定</button>
                    <button
                      class="chip"
                      v-for="proj in mallProjects"
                      :key="'pf-'+proj.id"
                      :class="{ on: mallProjectFilter===String(proj.id) }"
                      @click="mallProjectFilter=String(proj.id)"
                    >{{ proj.title || proj.name }}</button>
                  </template>
                </div>
                <div class="tax-card solo">
                  <div class="tax-card-hd">
                    <h4>本企业商品分类</h4>
                    <p>点标签删除。商品编辑里会用到这些分类。</p>
                  </div>
                  <div class="tax-card-bd">
                    <div>
                      <span class="tax-chip" v-for="(t, i) in (entDicts.mallCategories || [])" :key="'emc'+i">
                        {{ t }}
                        <button type="button" @click="removeEntDictItem('mallCategories', i)">×</button>
                      </span>
                      <span v-if="!(entDicts.mallCategories || []).length" class="sub">还没有分类</span>
                    </div>
                    <div class="tax-add">
                      <el-input v-model="entDictDraft.mallCategories" placeholder="添加分类后回车" @keyup.enter="addEntDictItem('mallCategories')" />
                      <el-button @click="addEntDictItem('mallCategories')">添加</el-button>
                    </div>
                  </div>
                </div>
                <div class="users-table">
                  <div v-if="mallLoading" class="empty-board"><b>正在载入</b>请稍候</div>
                  <div v-else-if="!filteredMall.length" class="empty-board"><b>没有符合条件的商品</b>换个关键词或筛选项再试</div>
                  <table v-else class="grid">
                    <thead>
                      <tr>
                        <th>商品</th>
                        <th>分类</th>
                        <th>项目</th>
                        <th>售价</th>
                        <th>库存</th>
                        <th>销量</th>
                        <th>状态</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <template v-for="p in filteredMall" :key="p.id">
                        <tr class="row" :class="{ on: mallExpandId===p.id }" @click="toggleMallRow(p)">
                          <td>
                            <div class="name-cell">
                              <div class="thumb">
                                <img v-if="productImg(p)" :src="productImg(p)" alt="" />
                                <span v-else>{{ productInitial(p) }}</span>
                              </div>
                              <div>
                                <div>{{ p.name }}</div>
                                <div class="sub">{{ p.sku || '—' }}</div>
                              </div>
                            </div>
                          </td>
                          <td>{{ p.category || '—' }}</td>
                          <td>{{ mallProjectTitle(p.projectId) || '未绑定' }}</td>
                          <td>{{ productPrice(p.price) }}</td>
                          <td :class="Number(p.stock||0) <= 20 ? 'stock-low' : ''">{{ p.stock }}</td>
                          <td>{{ p.sales || 0 }}</td>
                          <td><span class="tag" :class="String(p.status).toUpperCase()==='ON_SALE' ? 'ok' : 'off'">{{ productStatusLabel(p.status) }}</span></td>
                          <td><span class="link-btn">{{ mallExpandId===p.id ? '收起' : '展开' }}</span></td>
                        </tr>
                        <tr v-if="mallExpandId===p.id" class="row-menu">
                          <td colspan="8">
                            <div class="prod-menu">
                              <button type="button" @click.stop="openMall(p)">编辑商品</button>
                              <button type="button" @click.stop="openMallComments(p)">评价回复</button>
                              <button type="button" @click.stop="openMallLogs(p)">操作日志</button>
                            </div>
                          </td>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addEntDictItem,
  entDictDraft,
  entDicts,
  filteredMall,
  inProjWorkspace,
  loadMall,
  mallCategories,
  mallExpandId,
  mallKeyword,
  mallLoading,
  mallLowOnly,
  mallProjectFilter,
  mallProjectTitle,
  mallProjects,
  mallStats,
  mallStatusFilter,
  openMall,
  openMallComments,
  openMallCreate,
  openMallLogs,
  productImg,
  productInitial,
  productPrice,
  productStatusLabel,
  removeEntDictItem,
  toggleMallRow
} = inject("console")
</script>
