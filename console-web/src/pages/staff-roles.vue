<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">ROLES</div>
                    <h3>自定义职位</h3>
                    <p>先设职位并勾选权限，再到「用户创建」按职位开通账号。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ staffRoles.length }}</b><span>职位</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-button @click="addStaffRole">新增职位</el-button>
                  <el-button type="primary" :loading="staffSaving" @click="saveStaffRoles">保存职位</el-button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="roleSel.length">
                    <span>已选 {{ roleSel.length }} 个</span>
                    <el-button size="small" @click="batchDeleteRoles">删除所选</el-button>
                  </div>
                  <div v-if="staffLoading && !staffRoles.length" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!staffRoles.length" class="empty-board"><b>还没有职位</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('role', unlockedRoles)" :indeterminate="selSome('role', unlockedRoles)" @change="(v)=>toggleSelAll('role', unlockedRoles, v)" @click.stop /></th>
                      <th>职位</th><th>权限</th><th>项目</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ on: staffRoleEdit && staffRoleEdit.id===role.id, picked: selHas('role', role.id) }" v-for="role in staffRoles" :key="role.id" @click="openStaffRole(role)">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('role', role.id)" :disabled="role.locked" @change="(v)=>toggleSelOne('role', role.id, v)" />
                        </td>
                        <td>
                          <div class="name">{{ role.name }}</div>
                          <div class="sub">{{ role.locked ? '系统职位' : '自定义' }}</div>
                        </td>
                        <td>{{ rolePermCount(role) }} 项</td>
                        <td>{{ roleProjectLabel(role) }}</td>
                        <td><span class="link-btn">详情</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <el-dialog :model-value="!!staffRoleEdit" :title="staffRoleEdit && staffRoleEdit.locked ? staffRoleEdit.name : '职位详情'" width="640px" align-center append-to-body @close="closeStaffRole">
                  <p class="sub" style="margin:0 0 14px" v-if="staffRoleEdit">{{ staffRoleEdit.locked ? '系统职位，权限与项目范围全部开通' : '先设定可管项目，再勾选功能；改完请保存。' }}</p>
                  <template v-if="staffRoleEdit">
                    <div class="edit-grid" style="margin-bottom:16px">
                      <div class="full"><label>职位名称</label><el-input v-model="staffRoleEdit.name" maxlength="20" :disabled="staffRoleEdit.locked" /></div>
                    </div>
                    <div style="margin-bottom:16px;padding:12px 14px;border:1px solid #E5E7EB;border-radius:12px;background:#FFFFFF">
                      <div class="kicker">管理范围</div>
                      <p class="sub" style="margin:6px 0 10px">企业侧能力需落到<strong>具体项目</strong>。保持「全部项目」= 本企业下全部项目；系统职位不可改。</p>
                      <div v-if="staffRoleNeedsScopeHint(staffRoleEdit) && !staffRoleEdit.locked" class="sub" style="margin:0 0 10px;color:#6B7280">已勾选研学/文创等相关能力，请确认可管项目范围。</div>
                      <div class="kicker">可管项目</div>
                      <el-checkbox :model-value="roleAllProjects(staffRoleEdit)" :disabled="staffRoleEdit.locked" @change="(v)=>setRoleAllProjects(staffRoleEdit, v)" style="display:flex;margin:6px 0">全部项目</el-checkbox>
                      <div v-if="!roleAllProjects(staffRoleEdit)">
                        <el-checkbox
                          v-for="p in projList"
                          :key="'edp'+staffRoleEdit.id+p.id"
                          :model-value="roleHasProject(staffRoleEdit, p.id)"
                          @change="(v)=>toggleRoleProject(staffRoleEdit, p.id, v)"
                          style="display:flex;margin:6px 0"
                        >{{ p.title }}</el-checkbox>
                        <div v-if="!projList.length" class="sub">还没有项目</div>
                      </div>
                    </div>
                    <div v-for="g in staffPermGroups" :key="'ed'+g.name" style="margin-bottom:14px">
                      <div class="kicker">{{ g.name }}</div>
                      <div v-for="mod in g.modules" :key="'edm'+staffRoleEdit.id+mod.value" style="margin:8px 0 10px">
                        <el-checkbox
                          :model-value="staffRoleModuleChecked(staffRoleEdit, mod)"
                          :indeterminate="staffRoleModuleIndeterminate(staffRoleEdit, mod)"
                          :disabled="staffRoleEdit.locked"
                          @change="(v)=>toggleStaffRoleModule(staffRoleEdit, mod, v)"
                          style="display:flex;margin:4px 0;font-weight:600"
                        >{{ mod.label }}</el-checkbox>
                        <div style="padding-left:22px">
                          <el-checkbox
                            v-for="p in mod.children"
                            :key="'ed'+staffRoleEdit.id+p.value"
                            :model-value="roleHasPerm(staffRoleEdit, p.value)"
                            :disabled="staffRoleEdit.locked || p.value==='overview.read'"
                            @change="(v)=>toggleRolePerm(staffRoleEdit, p.value, v)"
                            style="display:flex;margin:4px 0"
                          >{{ p.label }}</el-checkbox>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template #footer>
                    <el-button v-if="staffRoleEdit && !staffRoleEdit.locked" @click="removeStaffRole(staffRoleEdit); closeStaffRole()">删除</el-button>
                    <el-button @click="closeStaffRole">关闭</el-button>
                  </template>
                </el-dialog>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addStaffRole,
  batchDeleteRoles,
  closeStaffRole,
  openStaffRole,
  projList,
  removeStaffRole,
  roleAllProjects,
  roleHasPerm,
  roleHasProject,
  rolePermCount,
  roleProjectLabel,
  roleSel,
  saveStaffRoles,
  selAllOn,
  selHas,
  selSome,
  setRoleAllProjects,
  staffLoading,
  staffPermGroups,
  staffRoleEdit,
  staffRoleModuleChecked,
  staffRoleModuleIndeterminate,
  staffRoleNeedsScopeHint,
  staffRoles,
  staffSaving,
  toggleRolePerm,
  toggleRoleProject,
  toggleSelAll,
  toggleSelOne,
  toggleStaffRoleModule,
  unlockedRoles
} = inject("console")
</script>
