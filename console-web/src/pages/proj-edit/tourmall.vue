<template>
                  <div class="studio-fill">
                    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:14px">
                      <div>
                        <h3 style="margin:0;font-size:18px;color:#1A1A1A">导览积分商城</h3>
                        <div class="route-foot-hint" style="margin-top:6px">研学导览内用「总积分」兑换。可进商城浏览；兑换需结业解锁，且仅预约当日 24 小时窗口。</div>
                      </div>
                      <el-button type="primary" :loading="projTourMallSaving" @click="saveTourMall">保存商城</el-button>
                    </div>
                    <div v-loading="projTourMallLoading" class="edit-grid" style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px;margin-bottom:14px">
                      <div><label>开启商城</label><el-switch v-model="projTourMall.enabled" /></div>
                      <div><label>结业前可进入浏览</label><el-switch v-model="projTourMall.enterBeforeGrad" /></div>
                      <div><label>结业后才可兑换</label><el-switch v-model="projTourMall.redeemAfterGrad" /></div>
                      <div><label>仅预约日 24h 开放</label><el-switch v-model="projTourMall.openOnApptDay24h" /></div>
                      <div class="full"><label>商城标题</label><el-input v-model="projTourMall.title" maxlength="40" /></div>
                      <div class="full"><label>说明文案</label><el-input v-model="projTourMall.hint" maxlength="120" /></div>
                    </div>
                    <div style="background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                        <b style="color:#1A1A1A">兑换商品</b>
                        <el-button @click="addTourMallSku">添加商品</el-button>
                      </div>
                      <div v-if="!(projTourMall.skus||[]).length" class="route-foot-hint">还没有兑换项。可关联文创商品，或仅填写名称与积分。</div>
                      <div v-for="(sku, idx) in (projTourMall.skus||[])" :key="sku.id || idx" style="border:1px solid rgba(0,0,0,0.06);border-radius:12px;padding:12px;margin-bottom:10px;background:#FFFFFF">
                        <div class="edit-grid">
                          <div class="full"><label>名称</label><el-input v-model="sku.name" maxlength="40" /></div>
                          <div><label>所需积分</label><el-input-number v-model="sku.points" :min="0" :max="99999" /></div>
                          <div><label>库存(-1不限)</label><el-input-number v-model="sku.stock" :min="-1" :max="99999" /></div>
                          <div class="full"><label>关联文创商品（可选）</label>
                            <el-select :model-value="sku.productId || ''" clearable filterable placeholder="选择后自动带名称/图" style="width:100%" @change="(v)=>pickTourMallProduct(idx, v)">
                              <el-option v-for="p in (projAllProducts||[])" :key="p.id" :label="p.name" :value="p.id" />
                            </el-select>
                          </div>
                          <div class="full"><label>图片 URL</label><el-input v-model="sku.imageUrl" /></div>
                          <div class="full"><label>备注</label><el-input v-model="sku.note" maxlength="80" /></div>
                          <div><label>上架</label><el-switch v-model="sku.enabled" /></div>
                          <div><el-button link type="danger" @click="removeTourMallSku(idx)">移除</el-button></div>
                        </div>
                      </div>
                    </div>
                  </div>
</template>

<script setup>
import { inject } from "vue"
const {
  addTourMallSku,
  pickTourMallProduct,
  projAllProducts,
  projTourMall,
  projTourMallLoading,
  projTourMallSaving,
  removeTourMallSku,
  saveTourMall
} = inject("console")
</script>
