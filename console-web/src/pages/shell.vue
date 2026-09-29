<template>
        <div class="shell" :class="{ 'side-off': sideCollapsed, 'side-resizable': !sideCollapsed }" :style="{ '--shell-side-w': shellSideWidth + 'px' }">
          <aside class="side">
            <div class="side-brand">
              <img src="/logo.png" alt="" />
              <span :title="areaLabel">{{ areaLabel }}</span>
            </div>
            <nav class="side-menu">
              <template v-for="item in menus" :key="item.key">
                <div v-if="item.children && item.children.length" class="side-group">
                  <div
                    class="side-item side-group-hd"
                    :class="{ active: groupHasActive(item), open: sideOpen[item.key] }"
                    :title="item.label"
                    @click="toggleSideGroup(item.key)"
                  >
                    <span class="side-ico" v-html="sideIcon(item.key)"></span>
                    <span class="side-txt">{{ item.label }}</span>
                    <span class="side-caret">{{ sideOpen[item.key] ? "▾" : "▸" }}</span>
                  </div>
                  <div class="side-sub" v-show="sideOpen[item.key]">
                    <div
                      v-for="sub in item.children"
                      :key="sub.key"
                      class="side-item"
                      :class="{ active: active===sub.key }"
                      :title="sub.label"
                      @click="openPage(sub.key)"
                    >
                      <span class="side-ico" v-html="sideIcon(sub.key)"></span>
                      <span class="side-txt">{{ sub.label }}</span>
                    </div>
                  </div>
                </div>
                <div
                  v-else
                  class="side-item"
                  :class="{ active: active===item.key }"
                  :title="item.label"
                  @click="openPage(item.key)"
                >
                  <span class="side-ico" v-html="sideIcon(item.key)"></span>
                  <span class="side-txt">{{ item.label }}</span>
                </div>
              </template>
            </nav>
            <div class="side-foot back" v-if="inProjWorkspace" @click="leaveProjWorkspace">返回项目列表</div>
            <div class="side-foot back" v-else-if="inEntWorkspace && area==='mp'" @click="leaveEntWorkspace">返回企业列表</div>
            <div class="side-foot" v-else-if="area==='merchant' && account && account.enterpriseName">{{ account.enterpriseName }}</div>
            <div class="side-toggle" :title="sideCollapsed ? '展开' : '收起'" @click="toggleSide">{{ sideCollapsed ? '›' : '‹ 收起' }}</div>
          </aside>
          <div v-if="!sideCollapsed" class="mqlt-vsplit shell-split" :class="{ on: mqltSplitHover==='shell' }" title="拖动调整侧栏宽度" @mousedown="startShellSideResize"></div>
          <section class="main">
            <header class="top">
              <div class="crumb">{{ areaLabel }} / {{ title }}</div>
              <div class="user">
                <span>{{ account && (account.name || account.phone) }}</span>
                <span v-if="dual" class="switch" @click="view='gate'">切换入口</span>
                <el-button size="small" @click="logout">退出</el-button>
              </div>
            </header>
            <div class="tabbar" @dragover.prevent="onTabDragOver">
              <div
                v-for="(tab, ti) in pageTabs"
                :key="tab.key"
                class="tab"
                :class="{ on: active===tab.key, drag: tabDragFrom===ti }"
                draggable="true"
                @click="openPage(tab.key)"
                @click.middle="closeTab(tab.key, $event)"
                @dragstart="onTabDragStart(ti, $event)"
                @dragover="onTabDragOver"
                @drop="onTabDrop(ti, $event)"
              >
                <span class="tab-title">{{ tab.label }}</span>
                <span class="tab-x" :class="{ off: pageTabs.length===1 }" @click="closeTab(tab.key, $event)" @mousedown.stop>×</span>
              </div>
            </div>
            <div class="workspace">
              <PageOverview v-if="area==='mp' && active==='overview'" />
              <PageUsers v-else-if="area==='mp' && active==='users'" />
              <PageLogs v-else-if="active==='logs' && ((area==='mp' && !inEntWorkspace) || inEntWorkspace)" />
              <PageMpRoles v-else-if="area==='mp' && !inEntWorkspace && active==='mp-roles'" />
              <PageMpUsers v-else-if="area==='mp' && !inEntWorkspace && active==='mp-users'" />
              <PageMall v-else-if="showPage('mall')" />
              <PageMallOrders v-else-if="showPage('mall-orders')" />
              <PageProjects v-else-if="showPage('projects')" />
              <PageProjectSubmit v-else-if="showPage('project-submit')" />
              <PageProjectReview v-else-if="area==='mp' && !inEntWorkspace && active==='project-review'" />
              <PageBookings v-else-if="showPage('bookings')" />
              <PageDrivers v-else-if="area==='mp' && active==='drivers'" />
              <PageRentalOrders v-else-if="area==='mp' && active==='rental-orders'" />
              <PageNotices v-else-if="showPage('notices') || showPage('dynamics')" />
              <PagePostsDynamics v-else-if="area==='mp' && active==='posts-dynamics'" />
              <PagePostsOverview v-else-if="area==='mp' && active==='posts-overview'" />
              <PagePostsReview v-else-if="area==='mp' && active==='posts-review'" />
              <PagePostsPublish v-else-if="area==='mp' && active==='posts-publish'" />
              <PagePostsCats v-else-if="area==='mp' && active==='posts-cats'" />
              <PagePostsUnits v-else-if="area==='mp' && active==='posts-units'" />
              <PageInvoices v-else-if="active==='invoices' && ((area==='mp' && !inEntWorkspace) || inEntWorkspace)" />
              <PageFeedback v-else-if="area==='mp' && active==='feedback'" />
              <PageSettings v-else-if="area==='mp' && active==='settings'" />
              <PageSplashAnnounce v-else-if="area==='mp' && active==='splash-announce'" />
              <PageEnterprises v-else-if="area==='mp' && active==='enterprises'" />
              <PageHome v-else-if="showPage('home')" />
              <PageProjHome v-else-if="showPage('proj-home')" />
              <PageProjLive v-else-if="showPage('proj-live')" />
              <PagePersonal v-else-if="active==='personal'" />
              <PageEntArchive v-else-if="area==='mp' && inEntWorkspace && active==='ent-archive'" />
              <PageStaffRoles v-else-if="showPage('staff-roles')" />
              <PageStaffUsers v-else-if="showPage('staff-users')" />
              <PageFinanceEnt v-else-if="inEntWorkspace && active==='finance'" />
              <PageFinanceWithdraw v-else-if="showPage('finance-withdraw')" />
              <PageFinanceMp v-else-if="area==='mp' && !inEntWorkspace && active==='finance'" />
              <PageWithdrawReview v-else-if="area==='mp' && !inEntWorkspace && active==='withdraw-review'" />
              <PageCommission v-else-if="area==='mp' && !inEntWorkspace && active==='commission'" />
              <PageProjEdit v-else-if="showPage('proj-edit')" />
              <PageFallback v-else />
            </div>

            <ConsoleDrawers />
          </section>
        </div>
</template>

<script setup>
import { inject, defineAsyncComponent } from "vue"
const PageOverview = defineAsyncComponent(() => import("./overview.vue"))
const PageUsers = defineAsyncComponent(() => import("./users.vue"))
const PageLogs = defineAsyncComponent(() => import("./logs.vue"))
const PageMpRoles = defineAsyncComponent(() => import("./mp-roles.vue"))
const PageMpUsers = defineAsyncComponent(() => import("./mp-users.vue"))
const PageMall = defineAsyncComponent(() => import("./mall.vue"))
const PageMallOrders = defineAsyncComponent(() => import("./mall-orders.vue"))
const PageProjects = defineAsyncComponent(() => import("./projects.vue"))
const PageProjectSubmit = defineAsyncComponent(() => import("./project-submit.vue"))
const PageProjectReview = defineAsyncComponent(() => import("./project-review.vue"))
const PageBookings = defineAsyncComponent(() => import("./bookings.vue"))
const PageDrivers = defineAsyncComponent(() => import("./drivers.vue"))
const PageRentalOrders = defineAsyncComponent(() => import("./rental-orders.vue"))
const PageNotices = defineAsyncComponent(() => import("./notices.vue"))
const PagePostsDynamics = defineAsyncComponent(() => import("./posts-dynamics.vue"))
const PagePostsOverview = defineAsyncComponent(() => import("./posts-overview.vue"))
const PagePostsReview = defineAsyncComponent(() => import("./posts-review.vue"))
const PagePostsPublish = defineAsyncComponent(() => import("./posts-publish.vue"))
const PagePostsCats = defineAsyncComponent(() => import("./posts-cats.vue"))
const PagePostsUnits = defineAsyncComponent(() => import("./posts-units.vue"))
const PageInvoices = defineAsyncComponent(() => import("./invoices.vue"))
const PageFeedback = defineAsyncComponent(() => import("./feedback.vue"))
const PageSettings = defineAsyncComponent(() => import("./settings.vue"))
const PageSplashAnnounce = defineAsyncComponent(() => import("./splash-announce.vue"))
const PageEnterprises = defineAsyncComponent(() => import("./enterprises.vue"))
const PageHome = defineAsyncComponent(() => import("./home.vue"))
const PageProjHome = defineAsyncComponent(() => import("./proj-home.vue"))
const PageProjLive = defineAsyncComponent(() => import("./proj-live.vue"))
const PagePersonal = defineAsyncComponent(() => import("./personal.vue"))
const PageEntArchive = defineAsyncComponent(() => import("./ent-archive.vue"))
const PageStaffRoles = defineAsyncComponent(() => import("./staff-roles.vue"))
const PageStaffUsers = defineAsyncComponent(() => import("./staff-users.vue"))
const PageFinanceEnt = defineAsyncComponent(() => import("./finance-ent.vue"))
const PageFinanceWithdraw = defineAsyncComponent(() => import("./finance-withdraw.vue"))
const PageFinanceMp = defineAsyncComponent(() => import("./finance-mp.vue"))
const PageWithdrawReview = defineAsyncComponent(() => import("./withdraw-review.vue"))
const PageCommission = defineAsyncComponent(() => import("./commission.vue"))
const PageProjEdit = defineAsyncComponent(() => import("./proj-edit.vue"))
const PageFallback = defineAsyncComponent(() => import("./fallback.vue"))
const ConsoleDrawers = defineAsyncComponent(() => import("./drawers.vue"))
const {
  account,
  active,
  area,
  areaLabel,
  closeTab,
  dual,
  groupHasActive,
  inEntWorkspace,
  inProjWorkspace,
  leaveEntWorkspace,
  leaveProjWorkspace,
  logout,
  menus,
  mqltSplitHover,
  onTabDragOver,
  onTabDragStart,
  onTabDrop,
  openPage,
  pageTabs,
  phone,
  shellSideWidth,
  showPage,
  sideCollapsed,
  sideIcon,
  sideOpen,
  startShellSideResize,
  tabDragFrom,
  title,
  toggleSide,
  toggleSideGroup,
  view
} = inject("console")
</script>
