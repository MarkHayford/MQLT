<template>
              <div class="sheet">
                <div class="sheet-hd">
                  <div>
                    <h4>{{ title }}</h4>
                    <p v-if="area==='mp'">从左侧进入具体模块。</p>
                    <p v-else>入驻企业。当前绑定 {{ account && (account.enterpriseName || "企业") }}。</p>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  account,
  area
} = inject("console")
</script>
