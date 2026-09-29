import { unwrap, token, authHeaders, KEY, USER_KEY, AREA_KEY, TABS_KEY, SIDE_KEY, apiFetch, setUnauthorizedHandler, handleUnauthorized, installFetchInterceptor } from "../api.js"
import { preparePlayableUpload } from "../media.js"
import {
  flattenMenus,
  MP_MENUS,
  ENT_MENUS,
  PROJ_MENUS,
  MERCHANT_MENUS,
  ENT_PAGE_KEYS,
  ENT_PAGE_PERMS,
  PROJ_AFFAIR_PAGE_CAPS,
  CONTACT_ROLE_OPTIONS,
  CONTACT_ROLE_DEFAULT_CAPS,
  MP_PAGE_PERMS,
  SIDE_ICONS,
} from "../config.js"
import { useSession } from "./useSession.js"
import { useUi } from "./useUi.js"
import { useUsers } from "./useUsers.js"
import { useMall } from "./useMall.js"
import { useProjects } from "./useProjects.js"
import { useLive } from "./useLive.js"
import { useBookings } from "./useBookings.js"
import { usePosts } from "./usePosts.js"
import { useFeedback } from "./useFeedback.js"
import { useInvoices } from "./useInvoices.js"
import { useFinance } from "./useFinance.js"
import { useRental } from "./useRental.js"
import { useSettings } from "./useSettings.js"
import { useBootstrap } from "./useBootstrap.js"

export function useConsoleState() {
  const s = {}
  Object.assign(s, {
    unwrap, token, authHeaders, KEY, USER_KEY, AREA_KEY, TABS_KEY, SIDE_KEY,
    apiFetch, setUnauthorizedHandler, handleUnauthorized, installFetchInterceptor,
    preparePlayableUpload, flattenMenus, MP_MENUS, ENT_MENUS, PROJ_MENUS,
    MERCHANT_MENUS, ENT_PAGE_KEYS, ENT_PAGE_PERMS, PROJ_AFFAIR_PAGE_CAPS,
    CONTACT_ROLE_OPTIONS, CONTACT_ROLE_DEFAULT_CAPS, MP_PAGE_PERMS, SIDE_ICONS,
  })
  useUi(s)
  useSession(s)
  useSettings(s)
  useUsers(s)
  useMall(s)
  useProjects(s)
  useLive(s)
  useBookings(s)
  usePosts(s)
  useFeedback(s)
  useInvoices(s)
  useFinance(s)
  useRental(s)
  useBootstrap(s)
  return s
}
