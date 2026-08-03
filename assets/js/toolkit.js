/* 影剪辑 Toolkit — shared helpers for image/video/audio tools */
(function () {
  function localPrefix() {
    var s = document.currentScript && document.currentScript.src;
    if (s) {
      var i = s.indexOf("assets/js/toolkit.js");
      if (i > -1) return s.slice(0, i);
    }
    return "/";
  }

  var PREFIX = localPrefix();
  var FFMPEG_CDNS = [
    PREFIX + "assets/ffmpeg/index.js",
    "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js",
    "https://registry.npmmirror.com/@ffmpeg/ffmpeg/0.12.10/files/dist/esm/index.js"
  ];
  var CORE_CDNS = [
    PREFIX + "assets/ffmpeg/esm/",
    "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/",
    "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/",
    "https://registry.npmmirror.com/@ffmpeg/core/0.12.6/files/dist/esm/"
  ];

  var ffmpegPromise = null;

  function loadScript(src, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      var timer = setTimeout(function () {
        s.remove();
        reject(new Error("script timeout: " + src));
      }, timeoutMs || 30000);
      s.src = src;
      s.onload = function () { clearTimeout(timer); resolve(); };
      s.onerror = function () { clearTimeout(timer); s.remove(); reject(new Error("script failed: " + src)); };
      document.head.appendChild(s);
    });
  }

  function toBlobURL(url, mime) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("fetch failed " + r.status + " " + url);
      return r.blob();
    }).then(function (blob) {
      return URL.createObjectURL(new Blob([blob], { type: mime }));
    });
  }

  function tryLoad(cdns, loader) {
    var i = 0;
    function next() {
      if (i >= cdns.length) return Promise.reject(new Error("all CDNs failed"));
      return loader(cdns[i++]).catch(function (e) {
        console.warn("CDN failed:", cdns[i - 1], e);
        return next();
      });
    }
    return next();
  }

  function loadFFmpeg() {
    if (ffmpegPromise) return ffmpegPromise;
    function loadCore(ffmpeg, base) {
      var js = base + "ffmpeg-core.js";
      var wasm = base + "ffmpeg-core.wasm";
      if (base.indexOf(PREFIX) === 0) {
        return ffmpeg.load({ coreURL: js, wasmURL: wasm });
      }
      return Promise.all([
        toBlobURL(js, "text/javascript"),
        toBlobURL(wasm, "application/wasm")
      ]).then(function (urls) {
        return ffmpeg.load({ coreURL: urls[0], wasmURL: urls[1] });
      });
    }
    ffmpegPromise = tryLoad(FFMPEG_CDNS, function (src) {
      return import(src).then(function (mod) {
        var F = mod.FFmpeg;
        if (!F) return Promise.reject(new Error("FFmpeg export missing"));
        var ffmpeg = new F();
        return tryLoad(CORE_CDNS, function (base) { return loadCore(ffmpeg, base); })
          .then(function () { return ffmpeg; });
      });
    });
    return ffmpegPromise;
  }

  function humanSize(bytes) {
    if (bytes == null || isNaN(bytes)) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    return (bytes / 1073741824).toFixed(2) + " GB";
  }

  function extOf(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function baseName(name) {
    return (name || "file").replace(/\.[a-z0-9]+$/i, "");
  }

  function uniqueName() {
    return "file-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function download(blob, filename) {
    /* 会员配额守卫：免费用户每日限次，VIP 无限。返回 false 则中断下载。 */
    if (window.YingMember && !window.YingMember.guardDownload()) return;
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename || "download";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 4000);
  }

  async function fetchFile(file) {
    return new Uint8Array(await file.arrayBuffer());
  }

  async function writeInput(ffmpeg, file) {
    var ext = extOf(file.name) || "dat";
    var name = "in_" + uniqueName() + "." + ext;
    await ffmpeg.writeFile(name, await fetchFile(file));
    return name;
  }

  function probeDuration(ffmpeg, name) {
    return new Promise(function (resolve) {
      var dur = 0;
      var h = function (ev) {
        var m = /Duration: (\d+):(\d+):([\d.]+)/.exec(ev.message || "");
        if (m) dur = (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
      };
      ffmpeg.on("log", h);
      ffmpeg.exec(["-i", name]).catch(function () {});
      setTimeout(function () {
        try { ffmpeg.off("log", h); } catch (e) {}
        resolve(dur);
      }, 900);
    });
  }

  function withTimeProgress(ffmpeg, onSec) {
    var h = function (ev) {
      var m = /time=(\d+):(\d+):([\d.]+)/.exec(ev.message || "");
      if (m) onSec((+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]));
    };
    ffmpeg.on("log", h);
    return function () {
      try { ffmpeg.off("log", h); } catch (e) {}
    };
  }

  async function readOut(ffmpeg, name) {
    var data = await ffmpeg.readFile(name);
    return new Blob([data.buffer], { type: "application/octet-stream" });
  }

  function wireDropzone(dz, onChange) {
    var input = dz.querySelector("input[type=file]");
    if (!input) return;
    dz.addEventListener("click", function () { input.click(); });
    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("drag"); });
    });
    dz.addEventListener("drop", function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) onChange(f);
    });
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      if (f) onChange(f);
    });
  }

  function updateProgress(pb, labelEl, pct, msg) {
    if (pb) pb.style.width = Math.max(0, Math.min(100, pct)) + "%";
    if (labelEl) labelEl.textContent = msg || Math.round(pct) + "%";
  }

  function show(el) { if (el) el.classList.add("show"); }
  function hide(el) { if (el) el.classList.remove("show"); }

  function preview(blob, kind) {
    var url = URL.createObjectURL(blob);
    var el;
    if (kind === "video") {
      el = document.createElement("video");
      el.controls = true;
    } else if (kind === "audio") {
      el = document.createElement("audio");
      el.controls = true;
    } else {
      el = document.createElement("img");
    }
    el.src = url;
    return el;
  }

  window.ToolKit = {
    loadFFmpeg: loadFFmpeg,
    toBlobURL: toBlobURL,
    humanSize: humanSize,
    extOf: extOf,
    baseName: baseName,
    uniqueName: uniqueName,
    download: download,
    fetchFile: fetchFile,
    writeInput: writeInput,
    probeDuration: probeDuration,
    withTimeProgress: withTimeProgress,
    readOut: readOut,
    wireDropzone: wireDropzone,
    updateProgress: updateProgress,
    show: show,
    hide: hide,
    preview: preview,
    FFMPEG_CDNS: FFMPEG_CDNS,
    CORE_CDNS: CORE_CDNS
  };
})();
