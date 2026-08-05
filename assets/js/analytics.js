// 影剪辑 YingClip 站点统计
// 1) Google Analytics 4：在 Google Analytics 创建数据流后，把 G-XXXXXX 填到 GA4_MEASUREMENT_ID
// 2) 百度统计：在 tongji.baidu.com 创建站点后，把 hm.js? 后面的 ID 填到 BAIDU_HM_ID
window.YC_ANALYTICS = window.YC_ANALYTICS || {
  GA4_MEASUREMENT_ID: '', // 例如 'G-ABCDEF1234'
  BAIDU_HM_ID: ''         // 例如 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
};
(function () {
  var cfg = window.YC_ANALYTICS;
  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
  if (cfg.GA4_MEASUREMENT_ID) {
    loadScript('https://www.googletagmanager.com/gtag/js?id=' + cfg.GA4_MEASUREMENT_ID);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', cfg.GA4_MEASUREMENT_ID);
  }
  if (cfg.BAIDU_HM_ID) {
    var hm = document.createElement('script');
    hm.src = 'https://hm.baidu.com/hm.js?' + cfg.BAIDU_HM_ID;
    document.head.appendChild(hm);
  }
})();
