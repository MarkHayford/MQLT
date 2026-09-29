<template>
            <DrawerUser v-if="userOpen" />
            <DrawerProjNotices v-if="projNoticeOpen && projSelected" />
            <DrawerProjShop v-if="projShopOpen && projSelected" />
            <DrawerNotice v-if="noticeOpen" />
            <DrawerContentReview v-if="contentReviewForm.open" />
            <DrawerPost v-if="postOpen" />
            <DrawerFinanceDetail v-if="finDetailOpen" />
            <DrawerBooking v-if="bkOpen && bkSelected" />
            <DrawerFeedback v-if="fbOpen" />
            <DrawerInvoice v-if="invOpen" />
            <DrawerDriver v-if="drvOpen" />
            <DrawerBookingCreate v-if="bkCreateOpen" />
            <DrawerEnterprise v-if="entOpen" />
            <DrawerMpStaff v-if="mpStaffOpen" />
            <DrawerStaff v-if="staffOpen" />
            <DrawerOperator v-if="opOpen" />
            <DrawerMallOrder v-if="moOpen && moSelected" />
            <DrawerMallLogs v-if="mallLogOpen && mallSelected" />
            <DrawerMallComments v-if="mallCommentOpen && mallSelected" />
            <DrawerMall v-if="mallOpen" />
</template>

<script setup>
import { inject, defineAsyncComponent } from "vue"
const DrawerUser = defineAsyncComponent(() => import("./drawers/user.vue"))
const DrawerProjNotices = defineAsyncComponent(() => import("./drawers/proj-notices.vue"))
const DrawerProjShop = defineAsyncComponent(() => import("./drawers/proj-shop.vue"))
const DrawerNotice = defineAsyncComponent(() => import("./drawers/notice.vue"))
const DrawerContentReview = defineAsyncComponent(() => import("./drawers/content-review.vue"))
const DrawerPost = defineAsyncComponent(() => import("./drawers/post.vue"))
const DrawerFinanceDetail = defineAsyncComponent(() => import("./drawers/finance-detail.vue"))
const DrawerBooking = defineAsyncComponent(() => import("./drawers/booking.vue"))
const DrawerFeedback = defineAsyncComponent(() => import("./drawers/feedback.vue"))
const DrawerInvoice = defineAsyncComponent(() => import("./drawers/invoice.vue"))
const DrawerDriver = defineAsyncComponent(() => import("./drawers/driver.vue"))
const DrawerBookingCreate = defineAsyncComponent(() => import("./drawers/booking-create.vue"))
const DrawerEnterprise = defineAsyncComponent(() => import("./drawers/enterprise.vue"))
const DrawerMpStaff = defineAsyncComponent(() => import("./drawers/mp-staff.vue"))
const DrawerStaff = defineAsyncComponent(() => import("./drawers/staff.vue"))
const DrawerOperator = defineAsyncComponent(() => import("./drawers/operator.vue"))
const DrawerMallOrder = defineAsyncComponent(() => import("./drawers/mall-order.vue"))
const DrawerMallLogs = defineAsyncComponent(() => import("./drawers/mall-logs.vue"))
const DrawerMallComments = defineAsyncComponent(() => import("./drawers/mall-comments.vue"))
const DrawerMall = defineAsyncComponent(() => import("./drawers/mall.vue"))
const {
  bkCreateOpen,
  bkOpen,
  bkSelected,
  contentReviewForm,
  drvOpen,
  entOpen,
  fbOpen,
  finDetailOpen,
  invOpen,
  mallCommentOpen,
  mallLogOpen,
  mallOpen,
  mallSelected,
  moOpen,
  moSelected,
  mpStaffOpen,
  noticeOpen,
  opOpen,
  postOpen,
  projNoticeOpen,
  projSelected,
  projShopOpen,
  staffOpen,
  userOpen
} = inject("console")
</script>
