(function () {
  const assetBase = "https://github.githubassets.com/assets/";
  const assets = [
    "high-contrast-cookie-e99d8801a8e707d0.js",
    "wp-runtime-fd4d28ade03ac1d0.js",
    "app-runtime-2cb7c64f0defbe9d.js",
    "fetch-utilities-7fed68b8333e9826.js",
    "78205-5d6a6f402b7a8e68.js",
    "89415-812392e4104ab411.js",
    "environment-17a3813da72840a4.js",
    "runtime-helpers-176627970fd228b1.js",
    "catalyst-2b159a120cac7df3.js",
    "selector-observer-6cc59d6d6cb4ac45.js",
    "relative-time-element-ae9705f9acc73694.js",
    "296-4c0a68ac3f1b71d1.js",
    "816-8d95115b2deb6077.js",
    "21265-6a76b64e3534ad57.js",
    "81683-bbf17e7ded27669b.js",
    "46740-eafd9231dd2851b5.js",
    "30058-00fdf1aae5a3d0d2.js",
    "github-elements-3efe2af7b4535ce7.js",
    "element-registry-eeff84bbec91d759.js",
  ];

  async function loadAssets() {
    for (const asset of assets) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "module";
        script.crossOrigin = "anonymous";
        script.src = assetBase + asset;
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener(
          "error",
          () => reject(new Error("Unable to load " + asset)),
          { once: true },
        );
        // Keep GitHub's webpack runtime after Astro's scripts so it derives the
        // github.githubassets.com public path for its lazy-loaded consent chunks.
        document.body.appendChild(script);
      });
    }
  }

  loadAssets().catch((error) => {
    console.error("Unable to initialize GitHub cookie consent.", error);
  });
})();
