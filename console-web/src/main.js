import { createApp } from "vue";
import ElementPlus, { ElMessage, ElMessageBox } from "element-plus";
import "element-plus/dist/index.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import App from "./App.vue";
import "./styles/console.css";
import { installFetchInterceptor } from "./api.js";

installFetchInterceptor();

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
window.L = L;
window.ElementPlus = Object.assign(ElementPlus, { ElMessage, ElMessageBox });

createApp(App).use(ElementPlus).mount("#app");
