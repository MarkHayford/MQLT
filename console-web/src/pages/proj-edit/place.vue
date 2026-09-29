<template>
                  <div class="edit-grid">
                    <div class="full"><label>地点名称</label><el-input v-model="projForm.location" placeholder="显示在票面 GATE 地点" /></div>
                    <div class="full"><label>搜索地点</label>
                      <el-input v-model="projMapQuery" placeholder="输入名称后搜索，或直接在地图点选" @keyup.enter="searchProjMap">
                        <template #append><el-button @click="searchProjMap">搜索</el-button></template>
                      </el-input>
                    </div>
                    <div class="full">
                      <div id="proj-loc-map" class="proj-map"></div>
                      <div class="proj-map-meta">点击地图或拖动标记选点{{ projForm.locationLatitude != null ? (' · ' + projForm.locationLatitude + ', ' + projForm.locationLongitude) : '' }}</div>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  projForm,
  projMapQuery,
  searchProjMap
} = inject("console")
</script>
