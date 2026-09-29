<template>
        <div class="login-page">
          <aside class="login-visual">
            <div class="login-visual-copy">
              <div class="kicker">CONSOLE</div>
              <h1>蒙企链探控制台</h1>
              <p>企业接待与平台运营。</p>
            </div>
          </aside>
          <section class="login-panel">
            <div class="login-card">
              <div class="login-brand">
                <img src="http://127.0.0.1:8080/web/logo.png" alt="蒙企链探" />
                <b>蒙企链探</b>
              </div>
              <h2>控制台登录</h2>
              <p class="sub">使用控制台账号登录，与小程序用户账号相互独立</p>
              <el-form @submit.prevent="login" label-position="top">
                <el-form-item label="手机号">
                  <el-input v-model="phone" maxlength="11" placeholder="11位手机号" size="large" />
                </el-form-item>
                <el-form-item label="密码">
                  <el-input v-model="password" type="password" show-password placeholder="请输入密码" size="large" @keyup.enter="login" />
                </el-form-item>
                <el-button type="primary" size="large" :loading="loading" @click="login">登录</el-button>
              </el-form>
              <a class="login-back" href="/">返回官网</a>
            </div>
          </section>
        </div>
</template>

<script setup>
import { inject } from "vue"
const {
  loading,
  login,
  password,
  phone
} = inject("console")
</script>
