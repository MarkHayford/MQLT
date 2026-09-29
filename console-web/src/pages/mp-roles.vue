<template>
              <div class="users-page">
                <div class="users-hero">
                  <div>
                    <div class="kicker">ROLES</div>
                    <h3>自定义职位</h3>
                    <p>先设职位并勾选权限，再到「用户创建」开通平台账号。</p>
                  </div>
                  <div class="users-stats">
                    <div><b>{{ mpRoles.length }}</b><span>职位</span></div>
                  </div>
                </div>
                <div class="users-bar">
                  <el-button @click="addMpRole">新增职位</el-button>
                  <el-button type="primary" :loading="mpSaving" @click="saveMpRoles">保存职位</el-button>
                </div>
                <div class="users-table">
                  <div class="batch-bar" v-if="mpRoleSel.length">
                    <span>已选 {{ mpRoleSel.length }} 个</span>
                    <el-button size="small" @click="batchDeleteMpRoles">删除所选</el-button>
                  </div>
                  <div v-if="mpLoading && !mpRoles.length" class="empty-board"><b>正在载入</b></div>
                  <div v-else-if="!mpRoles.length" class="empty-board"><b>还没有职位</b></div>
                  <table v-else class="grid">
                    <thead><tr>
                      <th class="check"><el-checkbox :model-value="selAllOn('mpRole', unlockedMpRoles)" :indeterminate="selSome('mpRole', unlockedMpRoles)" @change="(v)=>toggleSelAll('mpRole', unlockedMpRoles, v)" @click.stop /></th>
                      <th>职位</th><th>权限</th><th>可管范围</th><th></th>
                    </tr></thead>
                    <tbody>
                      <tr class="row" :class="{ on: mpRoleEdit && mpRoleEdit.id===role.id, picked: selHas('mpRole', role.id) }" v-for="role in mpRoles" :key="role.id" @click="mpRoleEdit=role">
                        <td class="check" @click.stop>
                          <el-checkbox :model-value="selHas('mpRole', role.id)" :disabled="role.locked" @change="(v)=>toggleSelOne('mpRole', role.id, v)" />
                        </td>
                        <td>
                          <div class="name">{{ role.name }}</div>
                          <div class="sub">{{ role.locked ? '系统职位' : '自定义' }}</div>
                        </td>
                        <td>{{ mpRolePermCount(role) }} 项</td>
                        <td>{{ mpRoleScopeLabel(role) }}</td>
                        <td><span class="link-btn">详情</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <el-dialog :model-value="!!mpRoleEdit" :title="mpRoleEdit && mpRoleEdit.locked ? mpRoleEdit.name : '职位详情'" width="640px" align-center append-to-body @close="mpRoleEdit=null">
                  <p class="sub" style="margin:0 0 14px" v-if="mpRoleEdit">{{ mpRoleEdit.locked ? '系统职位，权限与范围全部开通' : '先设定可管企业/项目，再勾选功能；改完请保存。' }}</p>
                  <template v-if="mpRoleEdit">
                    <div class="edit-grid" style="margin-bottom:16px">
                      <div class="full"><label>职位名称</label><el-input v-model="mpRoleEdit.name" maxlength="20" :disabled="mpRoleEdit.locked" /></div>
                    </div>
                    <div style="margin-bottom:16px;padding:12px 14px;border:1px solid #E5E7EB;border-radius:12px;background:#FFFFFF">
                      <div class="kicker">管理范围</div>
                      <p class="sub" style="margin:6px 0 10px">权限位还需落到<strong>具体企业</strong>与<strong>具体项目</strong>。不勾选具体项（保持「全部」）= 范围内全部开通；系统职位不可改。</p>
                      <div v-if="mpRoleNeedsScopeHint(mpRoleEdit) && !mpRoleEdit.locked" class="sub" style="margin:0 0 10px;color:#6B7280">已勾选研学/商城等相关能力，请确认下方范围是否符合预期。</div>
                      <div style="margin-top:8px">
                        <div class="kicker">可管企业</div>
                        <el-checkbox :model-value="mpRoleAllEnterprises(mpRoleEdit)" :disabled="mpRoleEdit.locked" @change="(v)=>setMpRoleAllEnterprises(mpRoleEdit, v)" style="display:flex;margin:6px 0">全部企业</el-checkbox>
                        <div v-if="!mpRoleAllEnterprises(mpRoleEdit)">
                          <el-checkbox
                            v-for="e in projEnterprises"
                            :key="'mpe'+mpRoleEdit.id+e.id"
                            :model-value="mpRoleHasEnterprise(mpRoleEdit, e.id)"
                            @change="(v)=>toggleMpRoleEnterprise(mpRoleEdit, e.id, v)"
                            style="display:flex;margin:6px 0"
                          >{{ e.shortName || e.name }}</el-checkbox>
                          <div v-if="!projEnterprises.length" class="sub">还没有企业</div>
                        </div>
                      </div>
                      <div style="margin-top:12px">
                        <div class="kicker">可管项目</div>
                        <el-checkbox :model-value="mpRoleAllProjects(mpRoleEdit)" :disabled="mpRoleEdit.locked" @change="(v)=>setMpRoleAllProjects(mpRoleEdit, v)" style="display:flex;margin:6px 0">全部项目</el-checkbox>
                        <div v-if="!mpRoleAllProjects(mpRoleEdit)">
                          <el-checkbox
                            v-for="p in mpRoleProjectOptions(mpRoleEdit)"
                            :key="'mpp'+mpRoleEdit.id+p.id"
                            :model-value="mpRoleHasProject(mpRoleEdit, p.id)"
                            @change="(v)=>toggleMpRoleProject(mpRoleEdit, p.id, v)"
                            style="display:flex;margin:6px 0"
                          >{{ p.title }}</el-checkbox>
                          <div v-if="!mpRoleProjectOptions(mpRoleEdit).length" class="sub">还没有项目</div>
                        </div>
                      </div>
                    </div>
                    <div v-for="g in mpPermGroups" :key="'mpg'+g.name" style="margin-bottom:14px">
                      <div class="kicker">{{ g.name }}</div>
                      <div v-for="mod in g.modules" :key="'mpm'+mpRoleEdit.id+mod.value" style="margin:8px 0 10px">
                        <el-checkbox
                          :model-value="mpRoleModuleChecked(mpRoleEdit, mod)"
                          :indeterminate="mpRoleModuleIndeterminate(mpRoleEdit, mod)"
                          :disabled="mpRoleEdit.locked"
                          @change="(v)=>toggleMpRoleModule(mpRoleEdit, mod, v)"
                          style="display:flex;margin:4px 0;font-weight:600"
                        >{{ mod.label }}</el-checkbox>
                        <div style="padding-left:22px">
                          <el-checkbox
                            v-for="p in mod.children"
                            :key="'mp'+mpRoleEdit.id+p.value"
                            :model-value="mpRoleHasPerm(mpRoleEdit, p.value)"
                            :disabled="mpRoleEdit.locked || p.value==='overview.read'"
                            @change="(v)=>toggleMpRolePerm(mpRoleEdit, p.value, v)"
                            style="display:flex;margin:4px 0"
                          >{{ p.label }}</el-checkbox>
                        </div>
                      </div>
                    </div>
                  </template>
                  <template #footer>
                    <el-button v-if="mpRoleEdit && !mpRoleEdit.locked" @click="removeMpRole(mpRoleEdit)">删除</el-button>
                    <el-button @click="mpRoleEdit=null">关闭</el-button>
                  </template>
                </el-dialog>
              </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addMpRole,
  batchDeleteMpRoles,
  mpLoading,
  mpPermGroups,
  mpRoleAllEnterprises,
  mpRoleAllProjects,
  mpRoleEdit,
  mpRoleHasEnterprise,
  mpRoleHasPerm,
  mpRoleHasProject,
  mpRoleModuleChecked,
  mpRoleModuleIndeterminate,
  mpRoleNeedsScopeHint,
  mpRolePermCount,
  mpRoleProjectOptions,
  mpRoleScopeLabel,
  mpRoleSel,
  mpRoles,
  mpSaving,
  projEnterprises,
  removeMpRole,
  saveMpRoles,
  selAllOn,
  selHas,
  selSome,
  setMpRoleAllEnterprises,
  setMpRoleAllProjects,
  toggleMpRoleEnterprise,
  toggleMpRoleModule,
  toggleMpRolePerm,
  toggleMpRoleProject,
  toggleSelAll,
  toggleSelOne,
  unlockedMpRoles
} = inject("console")
</script>
