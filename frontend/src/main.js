import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-vue/dist/bootstrap-vue.css";

import { ImagePlugin, ModalPlugin, VBTogglePlugin } from "bootstrap-vue";

import Vue from "vue";

import App from "./App.vue";

Vue.config.productionTip = false;
Vue.use(ImagePlugin);
Vue.use(ModalPlugin);
Vue.use(VBTogglePlugin);

var vm = new Vue({ render: (h) => h(App) });
vm.$mount("#app");
