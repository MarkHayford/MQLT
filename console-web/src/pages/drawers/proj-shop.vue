<template>
            <div class="mask" @click.self="closeProjShop">
              <aside class="drawer drawer-mall drawer-post" :style="{ width: Math.min(postDrawerPx, 820) + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startPostDrawerResize"></div>
                <div class="drawer-head">
                  <div class="who">
                    <div class="thumb"><img v-if="projCover(projSelected)" :src="projCover(projSelected)" alt="" /><span v-else>研</span></div>
                    <div>
                      <h3>{{ projSelected.title }}</h3>
                      <div class="sub">店铺绑定 · {{ projBound.length }} 件文创</div>
                    </div>
                  </div>
                  <el-button @click="closeProjShop">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="rv-filters">
                    <el-input v-model="projShopKeyword" clearable placeholder="搜商品名称 / 货号" style="width:240px" />
                  </div>
                  <div v-if="!filteredProjShop.length" class="empty-board"><b>没有可绑定的商品</b></div>
                  <div class="rv-item" v-for="p in filteredProjShop" :key="'psw-'+p.id" :style="projBound.indexOf(p.id)>=0 ? { borderColor: '#1A73E8' } : {}">
                    <div class="rv-meta">
                      <div class="thumb">
                        <img v-if="productImg(p)" :src="productImg(p)" alt="" />
                        <span v-else>{{ productInitial(p) }}</span>
                      </div>
                      <div>
                        <div class="rv-name">{{ p.name }}</div>
                        <div class="sub">{{ p.sku || '—' }} · {{ productPrice(p.price) }}</div>
                      </div>
                      <span class="tag" :class="projBound.indexOf(p.id)>=0 ? 'ok' : 'off'">{{ projBound.indexOf(p.id)>=0 ? '已绑定' : '未绑定' }}</span>
                    </div>
                    <div class="rv-ops">
                      <span class="link-btn" @click="toggleProjBound(p.id)">{{ projBound.indexOf(p.id)>=0 ? '取消绑定' : '绑定' }}</span>
                    </div>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button @click="closeProjShop">取消</el-button>
                  <el-button type="primary" @click="saveProjShop().then(()=>closeProjShop()).catch(e=>ElementPlus.ElMessage.error(e.message||'保存失败'))">保存绑定</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  closeProjShop,
  filteredProjShop,
  postDrawerPx,
  productImg,
  productInitial,
  productPrice,
  projBound,
  projCover,
  projSelected,
  projShopKeyword,
  saveProjShop,
  startPostDrawerResize,
  title,
  toggleProjBound
} = inject("console")
</script>
