/* 共享 AI 抠图模块：RMBG-1.4 量化模型，本地同源加载，无外部 CDN 依赖。
   页面需在 <head> 声明 import map：onnxruntime-web -> assets/bg-removal/ort.wasm.min.js */
(function () {
  function localPrefix() {
    var s = document.currentScript && document.currentScript.src;
    if (s) {
      var i = s.indexOf("assets/js/rmbg.js");
      if (i > -1) return s.slice(0, i);
    }
    return "/";
  }

  var PREFIX = localPrefix();
  var MODEL_URL = PREFIX + "assets/bg-removal/model_quantized.onnx";
  var WASM_DIR = PREFIX + "assets/bg-removal/";
  var sessionPromise = null;
  var ortRef = null;

  function loadSession() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = import("onnxruntime-web").then(function (ort) {
      ortRef = ort;
      ort.env.wasm.numThreads = 1; /* GitHub Pages 无跨域隔离，单线程最稳 */
      ort.env.wasm.wasmPaths = WASM_DIR;
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
    });
    return sessionPromise;
  }

  /* 缩放到 1024x1024，像素归一化到 0-1（量化模型按此校准，不可用 ImageNet 均值方差），输出 NCHW Float32 */
  function preprocess(img) {
    var W = 1024, H = 1024;
    var canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H);
    var px = ctx.getImageData(0, 0, W, H).data;
    var n = W * H;
    var arr = new Float32Array(3 * n);
    for (var i = 0; i < n; i++) {
      arr[i] = px[i * 4] / 255;
      arr[n + i] = px[i * 4 + 1] / 255;
      arr[2 * n + i] = px[i * 4 + 2] / 255;
    }
    return arr;
  }

  /* 返回 1024x1024 的透明度掩码（0-255） */
  function getMask(img) {
    return loadSession().then(function (session) {
      var input = preprocess(img);
      var feeds = {};
      feeds[session.inputNames[0]] = new ortRef.Tensor("float32", input, [1, 3, 1024, 1024]);
      return session.run(feeds).then(function (out) {
        var outData = out[session.outputNames[0]].data;
        var alpha = new Uint8Array(outData.length);
        for (var i = 0; i < outData.length; i++) {
          alpha[i] = Math.round(Math.min(1, Math.max(0, outData[i])) * 255);
        }
        return alpha;
      });
    });
  }

  /* 掩码数组转成 canvas（尺寸 1024x1024，alpha 通道） */
  function maskToCanvas(alpha1024) {
    var mCanvas = document.createElement("canvas");
    mCanvas.width = 1024; mCanvas.height = 1024;
    var mctx = mCanvas.getContext("2d");
    var mImg = mctx.createImageData(1024, 1024);
    for (var i = 0; i < 1024 * 1024; i++) mImg.data[i * 4 + 3] = alpha1024[i];
    mctx.putImageData(mImg, 0, 0);
    return mCanvas;
  }

  window.RMBG = {
    load: loadSession,
    getMask: getMask,
    maskToCanvas: maskToCanvas
  };
})();
