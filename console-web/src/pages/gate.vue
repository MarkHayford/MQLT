<template>
        <div class="gate">
          <div class="gate-box">
            <div class="gate-head">
              <img src="/logo.png" alt="" />
              <h2>选择管理入口</h2>
              <p>{{ account && (account.name || account.phone) }}</p>
            </div>
            <div class="gate-grid">
              <div class="gate-card" @click="enterArea('merchant')">
                <div class="kicker">ENTERPRISE</div>
                <h3>入驻企业</h3>
                <p>{{ account && account.enterpriseName ? account.enterpriseName : "企业管理" }}</p>
              </div>
              <div class="gate-card" @click="enterArea('mp')">
                <div class="kicker">OPERATIONS</div>
                <h3>运维管理</h3>
                <p>{{ account && account.mpRole === "SUPER_ADMIN" ? "超级管理员" : "平台管理" }}</p>
              </div>
            </div>
            <a class="gate-out" href="javascript:;" @click="logout">退出登录</a>
          </div>
        </div>
</template>

<script setup>
import { inject } from "vue"
const {
  account,
  enterArea,
  logout,
  phone
} = inject("console")
</script>
