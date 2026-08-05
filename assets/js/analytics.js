// 影剪辑 YingClip 站点统计
// GA4 已改为直接在页面 HTML 中引入官方 gtag.js（全站可见、可被检测）
// 百度统计：在 tongji.baidu.com 创建站点后，把 hm.js? 后面的 ID 填到 BAIDU_HM_ID
window.YC_ANALYTICS = window.YC_ANALYTICS || {
  BAIDU_HM_ID: ''         // 例如 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};
(function () {
  var cfg = window.YC_ANALYTICS;
  if (cfg.BAIDU_HM_ID) {
    var hm = document.createElement('script');
    hm.src = 'https://hm.baidu.com/hm.js?' + cfg.BAIDU_HM_ID;
    document.head.appendChild(hm);
  }
})();
