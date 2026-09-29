<template>
                  <div style="padding:4px 2px 18px">
                    <div class="edit-grid" style="margin-bottom:14px">
                      <div class="full"><label>官方热线（兜底）</label><el-input v-model="projForm.contactPhone" placeholder="19931708002" /></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                      <div>
                        <b style="color:#1A1A1A">项目负责人</b>
                        <div style="font-size:12px;color:#6B7280;margin-top:4px">角色：总负责人 / 现场负责人 / 讲解带队 / 企业对接人。勾选「学员可见」后显示在小程序「研学联系人」。</div>
                      </div>
                      <div style="display:flex;gap:8px">
                        <el-button @click="addProjContact" :disabled="!!currentProjectAccess && !projectCan('project.owners')">添加</el-button>
                        <el-button type="primary" :loading="projContactsSaving" @click="saveProjContacts" :disabled="!!currentProjectAccess && !projectCan('project.owners')">保存负责人</el-button>
                      </div>
                    </div>
                    <div v-if="!(projContacts||[]).length" class="route-foot-hint">暂无负责人。可从企业员工中选择，或手工填写姓名/电话/微信。</div>
                    <div v-for="(c, idx) in (projContacts||[])" :key="c.id || ('c'+idx)" style="border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:12px;margin-bottom:10px;background:#FFFFFF">
                      <div class="edit-grid">
                        <div class="full"><label>绑定员工（可选）</label>
                          <el-select :model-value="c.userId || ''" clearable filterable placeholder="选择企业员工" style="width:100%" @change="(v)=>onPickContactStaff(idx, v)">
                            <el-option v-for="s in (projStaffOptions||[])" :key="s.id" :label="(s.name || s.phone) + ' · ' + (s.merchantRoleName || '')" :value="s.id" />
                          </el-select>
                        </div>
                        <div><label>姓名</label><el-input v-model="c.name" maxlength="40" /></div>
                        <div><label>角色</label>
                          <el-select :model-value="c.role" style="width:100%" @change="(v)=>onContactRoleChange(idx, v)">
                            <el-option v-for="r in CONTACT_ROLE_OPTIONS" :key="r.value" :label="r.label" :value="r.value" />
                          </el-select>
                        </div>
                        <div><label>电话</label><el-input v-model="c.phone" maxlength="20" /></div>
                        <div><label>微信</label><el-input v-model="c.wechat" maxlength="40" /></div>
                        <div><label>学员可见</label><el-switch v-model="c.visibleToStudents" /></div>
                        <div style="display:flex;align-items:end;gap:8px">
                          <el-button @click="moveProjContact(idx,-1)">上移</el-button>
                          <el-button @click="moveProjContact(idx,1)">下移</el-button>
                          <el-button link type="danger" @click="removeProjContact(idx)">移除</el-button>
                        </div>
                      </div>
                      <div style="margin-top:8px;font-size:12px;color:#6B7280">默认能力：{{ (c.capabilities||[]).join('、') || '（企业对接人仅通讯录）' }}</div>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  CONTACT_ROLE_OPTIONS,
  addProjContact,
  currentProjectAccess,
  moveProjContact,
  onContactRoleChange,
  onPickContactStaff,
  projContacts,
  projContactsSaving,
  projForm,
  projStaffOptions,
  projectCan,
  removeProjContact,
  saveProjContacts
} = inject("console")
</script>
