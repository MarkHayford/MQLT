<template>
            <div class="mask" @click.self="entOpen=false">
              <aside class="drawer" :style="{ width: detailDrawerPx + 'px' }" @click.stop>
                <div class="drawer-edge" @mousedown="startDetailDrawerResize"></div>
                <div class="drawer-head">
                  <div>
                    <div class="kicker">ENTERPRISE</div>
                    <h3>新增入驻企业</h3>
                  </div>
                  <el-button @click="entOpen=false">关闭</el-button>
                </div>
                <div class="drawer-body">
                  <div class="block">
                    <div class="kicker">档案</div>
                    <div class="edit-grid">
                      <div class="full"><label>企业名称</label><el-input v-model="entForm.name" maxlength="40" /></div>
                      <div><label>简称</label><el-input v-model="entForm.shortName" maxlength="20" /></div>
                      <div>
                        <label>状态</label>
                        <el-select v-model="entForm.status" style="width:100%">
                          <el-option label="合作中" value="ACTIVE" />
                          <el-option label="待审" value="PENDING" />
                          <el-option label="停用" value="SUSPENDED" />
                        </el-select>
                      </div>
                      <div><label>联系人</label><el-input v-model="entForm.contactName" /></div>
                      <div><label>电话</label><el-input v-model="entForm.contactPhone" maxlength="11" /></div>
                      <div class="full"><label>地址</label><el-input v-model="entForm.address" /></div>
                      <div class="full"><label>简介</label><el-input v-model="entForm.intro" type="textarea" :rows="3" /></div>
                    </div>
                  </div>
                  <div class="block" v-if="entSelected && (entSelected.projects || []).length">
                    <div class="kicker">隶属项目</div>
                    <div class="shop-row" v-for="p in entSelected.projects" :key="'ep-'+p.id">
                      <span>{{ p.title }}</span>
                      <span class="tag">{{ p.status }}</span>
                    </div>
                  </div>
                  <div class="block" v-if="entForm.id">
                    <div class="kicker">控制台账号</div>
                    <div class="shop-row" v-for="op in (entSelected && entSelected.operators) || []" :key="'eo-'+op.id" @click="openOp(op)">
                      <span>{{ op.name || op.phone }} · {{ op.phone }}</span>
                      <span class="tag" :class="op.status==='ACTIVE' ? 'ok' : 'off'">{{ op.status==='ACTIVE' ? '可用' : '停用' }}</span>
                    </div>
                    <el-button style="margin-top:10px" @click="openEntOperator">开通企业账号</el-button>
                  </div>
                </div>
                <div class="drawer-foot">
                  <el-button type="primary" :loading="entSaving" @click="saveEnt">保存</el-button>
                  <el-button v-if="entForm.id" @click="deleteEnt">删除</el-button>
                </div>
              </aside>
            </div>
</template>

<script setup>
import { inject } from "vue"
const {
  deleteEnt,
  detailDrawerPx,
  entForm,
  entOpen,
  entSaving,
  entSelected,
  loading,
  openEntOperator,
  openOp,
  phone,
  saveEnt,
  startDetailDrawerResize,
  title
} = inject("console")
</script>
