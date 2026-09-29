<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">PERSONAL</div>
                    <h3>个人中心</h3>
                    <p>点击职位查看能力明细，维护头像与联系方式，修改登录密码。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ personalCapCount }}</b><span>能力</span></div>
                  </div>
                </div>
                <div class="sheet">
                  <div class="sheet-hd">
                    <div>
                      <h4>基本资料</h4>
                      <p>手机号用于登录，不可在此修改。姓名、邮箱与头像可自行更新。</p>
                    </div>
                    <el-button type="primary" :loading="personalSaving" @click="savePersonal">保存资料</el-button>
                  </div>
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div class="full" style="display:flex;align-items:center;gap:16px">
                        <div class="avatar" style="width:72px;height:72px;border-radius:36px;overflow:hidden;flex:none;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:24px;color:#1A1A1A">
                          <img v-if="personalForm.avatarUrl" :src="personalForm.avatarUrl" alt="" style="width:100%;height:100%;object-fit:cover" />
                          <span v-else>{{ initialOf({ name: personalForm.name, phone: personalForm.phone }) }}</span>
                        </div>
                        <div style="flex:1">
                          <label>头像</label>
                          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
                            <el-upload :show-file-list="false" accept="image/jpeg,image/png,image/webp,image/gif" :http-request="uploadPersonalAvatar" :disabled="personalAvatarUploading">
                              <el-button :loading="personalAvatarUploading">上传头像</el-button>
                            </el-upload>
                            <el-button v-if="personalForm.avatarUrl" @click="clearPersonalAvatar">清除</el-button>
                          </div>
                        </div>
                      </div>
                      <div><label>姓名</label><el-input v-model="personalForm.name" maxlength="40" /></div>
                      <div><label>手机（登录账号）</label><el-input v-model="personalForm.phone" disabled /></div>
                      <div><label>邮箱</label><el-input v-model="personalForm.email" maxlength="120" placeholder="选填" /></div>
                      <div class="full">
                        <label>职位</label>
                        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-height:32px">
                          <button
                            v-for="chip in personalRoleChips"
                            :key="'prc-'+chip.scope"
                            type="button"
                            class="tag ok"
                            style="cursor:pointer;border:none;font:inherit"
                            @click="openPersonalCapDialog(chip)"
                            :title="'查看「'+chip.name+'」能力'"
                          >{{ chip.name }} · 查看能力</button>
                          <span v-if="!(personalRoleChips || []).length" class="sub">-</span>
                        </div>
                        <div class="sub" style="margin-top:6px">点击职位查看细粒度能力与可管企业/项目。共 {{ personalCapCount }} 项权限。</div>
                      </div>
                      <div v-if="account && account.enterpriseName"><label>所属企业</label><el-input :model-value="account.enterpriseName" disabled /></div>
                      <div><label>状态</label><el-input :model-value="account && account.status==='ACTIVE' ? '可用' : (account && account.status) || '-'" disabled /></div>
                    </div>
                  </div>
                </div>
                <el-dialog
                  :model-value="!!personalCapDialog.open"
                  :title="(personalCapDialog.title || '职位能力') + (personalCapDialog.name ? (' · ' + personalCapDialog.name) : '')"
                  width="640px"
                  align-center
                  append-to-body
                  @close="closePersonalCapDialog"
                >
                  <p class="sub" style="margin:0 0 14px">只读展示当前职位已开通的能力，以及可管企业 / 可管项目范围（空数组表示「全部」）。</p>
                  <div style="margin-bottom:16px;padding:12px 14px;border:1px solid #E5E7EB;border-radius:12px;background:#FFFFFF">
                    <div class="kicker" style="margin-bottom:8px">管理范围</div>
                    <div v-if="personalCapScope.showEnterprises" style="margin-bottom:10px">
                      <div style="font-weight:600;margin-bottom:6px">可管企业</div>
                      <div style="display:flex;flex-wrap:wrap;gap:8px">
                        <span v-if="personalCapScope.allEnterprises" class="tag ok">全部</span>
                        <span v-for="e in personalCapScope.enterprises" :key="'pce-'+e.id" class="tag ok">{{ e.name }}</span>
                      </div>
                    </div>
                    <div>
                      <div style="font-weight:600;margin-bottom:6px">可管项目</div>
                      <div style="display:flex;flex-wrap:wrap;gap:8px">
                        <span v-if="personalCapScope.allProjects" class="tag ok">全部</span>
                        <span v-for="p in personalCapScope.projects" :key="'pcp-'+p.id" class="tag ok">{{ p.name }}</span>
                      </div>
                    </div>
                  </div>
                  <div v-if="!(personalCapTree || []).length" class="sub">暂无能力信息，请重新登录刷新。</div>
                  <div v-for="g in personalCapTree" :key="'pct-'+personalCapDialog.scope+'-'+g.name" style="margin-bottom:14px">
                    <div class="kicker">{{ g.name }}</div>
                    <div v-for="mod in g.modules" :key="'pcm-'+mod.value" style="margin:8px 0 10px">
                      <div style="font-weight:600;margin:4px 0">{{ mod.label }}</div>
                      <div style="padding-left:12px;display:flex;flex-wrap:wrap;gap:8px">
                        <span class="tag ok" v-for="c in mod.children" :key="'pcc-'+c.value">{{ c.label }}</span>
                      </div>
                    </div>
                  </div>
                  <template #footer>
                    <el-button type="primary" @click="closePersonalCapDialog">关闭</el-button>
                  </template>
                </el-dialog>
                <div class="sheet">
                  <div class="sheet-hd">
                    <div>
                      <h4>修改密码</h4>
                      <p>需要验证当前密码。修改成功后请使用新密码登录。</p>
                    </div>
                    <el-button type="primary" :loading="personalPwdSaving" @click="savePersonalPassword">修改密码</el-button>
                  </div>
                  <div class="sheet-bd">
                    <div class="edit-grid">
                      <div class="full"><label>当前密码</label><el-input v-model="personalPwd.currentPassword" type="password" show-password autocomplete="current-password" /></div>
                      <div><label>新密码</label><el-input v-model="personalPwd.newPassword" type="password" show-password autocomplete="new-password" /></div>
                      <div><label>确认新密码</label><el-input v-model="personalPwd.confirmPassword" type="password" show-password autocomplete="new-password" /></div>
                    </div>
                  </div>
                </div>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  account,
  clearPersonalAvatar,
  closePersonalCapDialog,
  initialOf,
  openPersonalCapDialog,
  password,
  personalAvatarUploading,
  personalCapCount,
  personalCapDialog,
  personalCapScope,
  personalCapTree,
  personalForm,
  personalPwd,
  personalPwdSaving,
  personalRoleChips,
  personalSaving,
  savePersonal,
  savePersonalPassword,
  uploadPersonalAvatar
} = inject("console")
</script>
