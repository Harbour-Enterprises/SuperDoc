// vite.config.js
import path from "path";
import copy from "file:///Users/nickbernal/dev/superdoc/node_modules/rollup-plugin-copy/dist/index.commonjs.js";
import { defineConfig } from "file:///Users/nickbernal/dev/superdoc/node_modules/vite/dist/node/index.js";
import { fileURLToPath, URL } from "node:url";
import { nodePolyfills } from "file:///Users/nickbernal/dev/superdoc/node_modules/vite-plugin-node-polyfills/dist/index.js";
import { visualizer } from "file:///Users/nickbernal/dev/superdoc/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import vue from "file:///Users/nickbernal/dev/superdoc/node_modules/@vitejs/plugin-vue/dist/index.mjs";

// package.json
var version = "0.10.49";

// vite.config.js
var __vite_injected_original_dirname = "/Users/nickbernal/dev/superdoc/packages/superdoc";
var __vite_injected_original_import_meta_url = "file:///Users/nickbernal/dev/superdoc/packages/superdoc/vite.config.js";
var getAliases = (isDev) => {
  const aliases = {
    "@superdoc": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
    "@stores": fileURLToPath(new URL("./src/stores", __vite_injected_original_import_meta_url)),
    "@packages": fileURLToPath(new URL("../", __vite_injected_original_import_meta_url)),
    // Super Editor aliases
    "@": fileURLToPath(new URL("../super-editor/src", __vite_injected_original_import_meta_url)),
    "@core": fileURLToPath(new URL("../super-editor/src/core", __vite_injected_original_import_meta_url)),
    "@extensions": fileURLToPath(new URL("../super-editor/src/extensions", __vite_injected_original_import_meta_url)),
    "@features": fileURLToPath(new URL("../super-editor/src/features", __vite_injected_original_import_meta_url)),
    "@components": fileURLToPath(new URL("../super-editor/src/components", __vite_injected_original_import_meta_url)),
    "@helpers": fileURLToPath(new URL("../super-editor/src/core/helpers", __vite_injected_original_import_meta_url)),
    "@converter": fileURLToPath(new URL("../super-editor/src/core/super-converter", __vite_injected_original_import_meta_url)),
    "@tests": fileURLToPath(new URL("../super-editor/src/tests", __vite_injected_original_import_meta_url))
  };
  if (isDev) {
    aliases["@harbour-enterprises/super-editor"] = path.resolve(__vite_injected_original_dirname, "../super-editor/src");
  }
  ;
  return aliases;
};
var vite_config_default = defineConfig(({ mode, command }) => {
  const plugins = [
    vue(),
    copy({
      targets: [
        {
          src: path.resolve(__vite_injected_original_dirname, "../super-editor/dist/*"),
          dest: "dist/super-editor"
        },
        {
          src: path.resolve(__vite_injected_original_dirname, "../../node_modules/pdfjs-dist/web/images/*"),
          dest: "dist/images"
        }
      ],
      hook: "writeBundle"
    })
    // visualizer(visualizerConfig)
  ];
  if (mode !== "test") plugins.push(nodePolyfills());
  const isDev = command === "serve";
  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __IS_DEBUG__: true
    },
    plugins,
    build: {
      target: "es2022",
      cssCodeSplit: false,
      lib: {
        entry: "src/index.js",
        name: "SuperDoc"
      },
      minify: false,
      sourcemap: true,
      rollupOptions: {
        input: {
          "superdoc": "src/index.js",
          "super-editor": "src/super-editor.js"
        },
        external: [
          "yjs",
          "@hocuspocus/provider",
          "pdfjs-dist",
          "vite-plugin-node-polyfills"
        ],
        output: [
          {
            format: "es",
            entryFileNames: "[name].es.js",
            chunkFileNames: "chunks/[name]-[hash].es.js",
            manualChunks: {
              "vue": ["vue"],
              "blank-docx": ["@harbour-enterprises/common/data/blank.docx?url"],
              "jszip": ["jszip"],
              "eventemitter3": ["eventemitter3"],
              "uuid": ["uuid"],
              "xml-js": ["xml-js"]
            }
          },
          {
            format: "cjs",
            entryFileNames: "[name].cjs",
            chunkFileNames: "chunks/[name]-[hash].cjs",
            manualChunks: {
              "vue": ["vue"],
              "blank-docx": ["@harbour-enterprises/common/data/blank.docx?url"],
              "jszip": ["jszip"],
              "eventemitter3": ["eventemitter3"],
              "uuid": ["uuid"],
              "xml-js": ["xml-js"]
            }
          }
        ]
      }
    },
    optimizeDeps: {
      include: ["pdfjs-dist", "yjs", "@hocuspocus/provider"],
      esbuildOptions: {
        target: "es2020"
      }
    },
    resolve: {
      alias: getAliases(isDev),
      extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json"]
    },
    css: {
      postcss: "./postcss.config.cjs"
    },
    server: {
      port: 9094,
      host: "0.0.0.0",
      fs: {
        allow: [
          path.resolve(__vite_injected_original_dirname, "../super-editor"),
          "../",
          "../../"
        ]
      }
    }
  };
});
export {
  vite_config_default as default,
  getAliases
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAicGFja2FnZS5qc29uIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL25pY2tiZXJuYWwvZGV2L3N1cGVyZG9jL3BhY2thZ2VzL3N1cGVyZG9jXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbmlja2Jlcm5hbC9kZXYvc3VwZXJkb2MvcGFja2FnZXMvc3VwZXJkb2Mvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL25pY2tiZXJuYWwvZGV2L3N1cGVyZG9jL3BhY2thZ2VzL3N1cGVyZG9jL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29weSBmcm9tICdyb2xsdXAtcGx1Z2luLWNvcHknXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCwgVVJMIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHsgbm9kZVBvbHlmaWxscyB9IGZyb20gJ3ZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzJztcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5cbmltcG9ydCB7IHZlcnNpb24gfSBmcm9tICcuL3BhY2thZ2UuanNvbic7XG5cbmNvbnN0IHZpc3VhbGl6ZXJDb25maWcgPSB7XG4gIGZpbGVuYW1lOiAnLi9kaXN0L2J1bmRsZS1hbmFseXNpcy5odG1sJyxcbiAgdGVtcGxhdGU6ICd0cmVlbWFwJyxcbiAgZ3ppcFNpemU6IHRydWUsXG4gIGJyb3RsaVNpemU6IHRydWUsXG4gIG9wZW46IHRydWVcbn1cblxuZXhwb3J0IGNvbnN0IGdldEFsaWFzZXMgPSAoaXNEZXYpID0+IHtcbiAgY29uc3QgYWxpYXNlcyA9IHtcbiAgICAnQHN1cGVyZG9jJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICdAc3RvcmVzJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYy9zdG9yZXMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAnQHBhY2thZ2VzJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi8nLCBpbXBvcnQubWV0YS51cmwpKSxcblxuICAgIC8vIFN1cGVyIEVkaXRvciBhbGlhc2VzXG4gICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4uL3N1cGVyLWVkaXRvci9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAnQGNvcmUnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4uL3N1cGVyLWVkaXRvci9zcmMvY29yZScsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICdAZXh0ZW5zaW9ucyc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi4vc3VwZXItZWRpdG9yL3NyYy9leHRlbnNpb25zJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgJ0BmZWF0dXJlcyc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi4vc3VwZXItZWRpdG9yL3NyYy9mZWF0dXJlcycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICdAY29tcG9uZW50cyc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi4vc3VwZXItZWRpdG9yL3NyYy9jb21wb25lbnRzJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgJ0BoZWxwZXJzJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi9zdXBlci1lZGl0b3Ivc3JjL2NvcmUvaGVscGVycycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICdAY29udmVydGVyJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi9zdXBlci1lZGl0b3Ivc3JjL2NvcmUvc3VwZXItY29udmVydGVyJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgJ0B0ZXN0cyc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi4vc3VwZXItZWRpdG9yL3NyYy90ZXN0cycsIGltcG9ydC5tZXRhLnVybCkpLFxuICB9O1xuXG4gIGlmIChpc0Rldikge1xuICAgIGFsaWFzZXNbJ0BoYXJib3VyLWVudGVycHJpc2VzL3N1cGVyLWVkaXRvciddID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3N1cGVyLWVkaXRvci9zcmMnKTtcbiAgfTtcblxuICByZXR1cm4gYWxpYXNlcztcbn07XG5cblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlLCBjb21tYW5kfSkgPT4ge1xuICBjb25zdCBwbHVnaW5zID0gW1xuICAgIHZ1ZSgpLFxuICAgIGNvcHkoe1xuICAgICAgdGFyZ2V0czogW1xuICAgICAgICB7XG4gICAgICAgICAgc3JjOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc3VwZXItZWRpdG9yL2Rpc3QvKicpLFxuICAgICAgICAgIGRlc3Q6ICdkaXN0L3N1cGVyLWVkaXRvcicsXG4gICAgICAgIH0sXG4gICAgICAgIHsgXG4gICAgICAgICAgc3JjOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vbm9kZV9tb2R1bGVzL3BkZmpzLWRpc3Qvd2ViL2ltYWdlcy8qJyksIFxuICAgICAgICAgIGRlc3Q6ICdkaXN0L2ltYWdlcycsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgaG9vazogJ3dyaXRlQnVuZGxlJ1xuICAgIH0pLFxuICAgIC8vIHZpc3VhbGl6ZXIodmlzdWFsaXplckNvbmZpZylcbiAgXTtcbiAgaWYgKG1vZGUgIT09ICd0ZXN0JykgcGx1Z2lucy5wdXNoKG5vZGVQb2x5ZmlsbHMoKSk7XG4gIGNvbnN0IGlzRGV2ID0gY29tbWFuZCA9PT0gJ3NlcnZlJztcblxuICByZXR1cm4ge1xuICAgIGRlZmluZToge1xuICAgICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeSh2ZXJzaW9uKSxcbiAgICAgIF9fSVNfREVCVUdfXzogdHJ1ZSxcbiAgICB9LFxuICAgIHBsdWdpbnMsXG4gICAgYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzMjAyMicsXG4gICAgICBjc3NDb2RlU3BsaXQ6IGZhbHNlLFxuICAgICAgbGliOiB7XG4gICAgICAgIGVudHJ5OiBcInNyYy9pbmRleC5qc1wiLFxuICAgICAgICBuYW1lOiBcIlN1cGVyRG9jXCIsXG4gICAgICB9LFxuICAgICAgbWluaWZ5OiBmYWxzZSxcbiAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICAnc3VwZXJkb2MnOiAnc3JjL2luZGV4LmpzJyxcbiAgICAgICAgICAnc3VwZXItZWRpdG9yJzogJ3NyYy9zdXBlci1lZGl0b3IuanMnLFxuICAgICAgICB9LFxuICAgICAgICBleHRlcm5hbDogW1xuICAgICAgICAgICd5anMnLFxuICAgICAgICAgICdAaG9jdXNwb2N1cy9wcm92aWRlcicsXG4gICAgICAgICAgJ3BkZmpzLWRpc3QnLFxuICAgICAgICAgICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscycsXG4gICAgICAgIF0sXG4gICAgICAgIG91dHB1dDogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZvcm1hdDogJ2VzJyxcbiAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnW25hbWVdLmVzLmpzJyxcbiAgICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnY2h1bmtzL1tuYW1lXS1baGFzaF0uZXMuanMnLFxuICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAgICd2dWUnOiBbJ3Z1ZSddLFxuICAgICAgICAgICAgICAnYmxhbmstZG9jeCc6IFsnQGhhcmJvdXItZW50ZXJwcmlzZXMvY29tbW9uL2RhdGEvYmxhbmsuZG9jeD91cmwnXSxcbiAgICAgICAgICAgICAgJ2pzemlwJzogWydqc3ppcCddLFxuICAgICAgICAgICAgICAnZXZlbnRlbWl0dGVyMyc6IFsnZXZlbnRlbWl0dGVyMyddLFxuICAgICAgICAgICAgICAndXVpZCc6IFsndXVpZCddLFxuICAgICAgICAgICAgICAneG1sLWpzJzogWyd4bWwtanMnXSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZvcm1hdDogJ2NqcycsXG4gICAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5janMnLFxuICAgICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdjaHVua3MvW25hbWVdLVtoYXNoXS5janMnLFxuICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAgICd2dWUnOiBbJ3Z1ZSddLFxuICAgICAgICAgICAgICAnYmxhbmstZG9jeCc6IFsnQGhhcmJvdXItZW50ZXJwcmlzZXMvY29tbW9uL2RhdGEvYmxhbmsuZG9jeD91cmwnXSxcbiAgICAgICAgICAgICAgJ2pzemlwJzogWydqc3ppcCddLFxuICAgICAgICAgICAgICAnZXZlbnRlbWl0dGVyMyc6IFsnZXZlbnRlbWl0dGVyMyddLFxuICAgICAgICAgICAgICAndXVpZCc6IFsndXVpZCddLFxuICAgICAgICAgICAgICAneG1sLWpzJzogWyd4bWwtanMnXSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF0sICAgICAgICBcbiAgICAgIH1cbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogWydwZGZqcy1kaXN0JywgJ3lqcycsICdAaG9jdXNwb2N1cy9wcm92aWRlciddLFxuICAgICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczogZ2V0QWxpYXNlcyhpc0RldiksXG4gICAgICBleHRlbnNpb25zOiBbJy5tanMnLCAnLmpzJywgJy5tdHMnLCAnLnRzJywgJy5qc3gnLCAnLnRzeCcsICcuanNvbiddLFxuICAgIH0sXG4gICAgY3NzOiB7XG4gICAgICBwb3N0Y3NzOiAnLi9wb3N0Y3NzLmNvbmZpZy5janMnLFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA5MDk0LFxuICAgICAgaG9zdDogJzAuMC4wLjAnLFxuICAgICAgZnM6IHtcbiAgICAgICAgYWxsb3c6IFtcbiAgICAgICAgICBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc3VwZXItZWRpdG9yJyksXG4gICAgICAgICAgJy4uLycsXG4gICAgICAgICAgJy4uLy4uLycsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0sXG4gIH1cbn0pOyIsICJ7XG4gIFwibmFtZVwiOiBcIkBoYXJib3VyLWVudGVycHJpc2VzL3N1cGVyZG9jXCIsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcInZlcnNpb25cIjogXCIwLjEwLjQ5XCIsXG4gIFwibGljZW5zZVwiOiBcIkFHUEwtMy4wXCIsXG4gIFwicmVhZG1lXCI6IFwiLi4vLi4vUkVBRE1FLm1kXCIsXG4gIFwiZmlsZXNcIjogW1xuICAgIFwiZGlzdFwiXG4gIF0sXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L3N1cGVyZG9jLmVzLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2Rpc3Qvc3VwZXJkb2MuY2pzXCIsXG4gICAgICBcInR5cGVzXCI6IFwiLi9kaXN0L2luZGV4LmQudHNcIlxuICAgIH0sXG4gICAgXCIuL2NvbnZlcnRlclwiOiB7XG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9zdXBlci1lZGl0b3IvY29udmVydGVyLmVzLmpzXCJcbiAgICB9LFxuICAgIFwiLi9kb2N4LXppcHBlclwiOiB7XG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9zdXBlci1lZGl0b3IvZG9jeC16aXBwZXIuZXMuanNcIlxuICAgIH0sXG4gICAgXCIuL3N1cGVyLWVkaXRvclwiOiB7XG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9zdXBlci1lZGl0b3IuZXMuanNcIixcbiAgICAgIFwidHlwZXNcIjogXCIuL2Rpc3Qvc3VwZXItZWRpdG9yL3NyYy9pbmRleC5kLnRzXCJcbiAgICB9LFxuICAgIFwiLi9zdXBlci1lZGl0b3Ivc3R5bGUuY3NzXCI6IHtcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L3N1cGVyLWVkaXRvci9zdHlsZS5jc3NcIlxuICAgIH0sXG4gICAgXCIuL2NvbW1vblwiOiB7XG4gICAgICBcImltcG9ydFwiOiBcIi4vZGlzdC9jb21tb24uZXMuanNcIlxuICAgIH0sXG4gICAgXCIuL2ZpbGUtemlwcGVyXCI6IHtcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9kaXN0L3N1cGVyLWVkaXRvci9maWxlLXppcHBlci5lcy5qc1wiXG4gICAgfSxcbiAgICBcIi4vc3R5bGUuY3NzXCI6IFwiLi9kaXN0L3N0eWxlLmNzc1wiXG4gIH0sXG4gIFwibWFpblwiOiBcIi4vZGlzdC9zdXBlcmRvYy51bWQuanNcIixcbiAgXCJtb2R1bGVcIjogXCIuL2Rpc3Qvc3VwZXJkb2MuZXMuanNcIixcbiAgXCJ0eXBlc1wiOiBcIi4vZGlzdC9pbmRleC5kLnRzXCIsXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJkZXZcIjogXCJ2aXRlXCIsXG4gICAgXCJidWlsZFwiOiBcImNkIC4uL3N1cGVyLWVkaXRvciAmJiBucG0gcnVuIGJ1aWxkICYmIGNkIC4uL3N1cGVyZG9jICYmIHZpdGUgYnVpbGQgJiYgdHNjICYmIG5wbSBydW4gYnVpbGQ6dW1kXCIsXG4gICAgXCJidWlsZDplc1wiOiBcImNkIC4uL3N1cGVyLWVkaXRvciAmJiBucG0gcnVuIGJ1aWxkICYmIGNkIC4uL3N1cGVyZG9jICYmIHZpdGUgYnVpbGRcIixcbiAgICBcImJ1aWxkOnVtZFwiOiBcInZpdGUgYnVpbGQgLS1jb25maWcgdml0ZS5jb25maWcudW1kLmpzXCIsXG4gICAgXCJyZWxlYXNlXCI6IFwicmVsZWFzZS1pdCAtLWNpIC0taW5jcmVtZW50PXBhdGNoXCIsXG4gICAgXCJjbGVhblwiOiBcInJtIC1yZiBkaXN0XCIsXG4gICAgXCJwYWNrOmxvY2FsXCI6IFwibnBtIHJ1biBidWlsZDplcyAmJiBucG0gcGFjayAmJiBtdiAkKGxzIGhhcmJvdXItZW50ZXJwcmlzZXMtc3VwZXJkb2MtKi50Z3opIC4vc3VwZXJkb2MudGd6XCIsXG4gICAgXCJwYWNrXCI6IFwibnBtIHJ1biBidWlsZCAmJiBucG0gcGFjayAmJiBtdiAkKGxzIGhhcmJvdXItZW50ZXJwcmlzZXMtc3VwZXJkb2MtKi50Z3opIC4vc3VwZXJkb2MudGd6XCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiYnVmZmVyLWNyYzMyXCI6IFwiXjEuMC4wXCIsXG4gICAgXCJldmVudGVtaXR0ZXIzXCI6IFwiXjUuMC4xXCIsXG4gICAgXCJqc2RvbVwiOiBcIl4yNS4wLjFcIixcbiAgICBcIm5haXZlLXVpXCI6IFwiXjIuMzkuMFwiLFxuICAgIFwicGluaWFcIjogXCJeMi4xLjdcIixcbiAgICBcInJvbGx1cC1wbHVnaW4tY29weVwiOiBcIl4zLjUuMFwiLFxuICAgIFwidGlwcHlcIjogXCJeMC4wLjBcIixcbiAgICBcInZ1ZVwiOiBcIl4zLjQuMjFcIlxuICB9LFxuICBcInBlZXJEZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGhvY3VzcG9jdXMvcHJvdmlkZXJcIjogXCJeMi4xMy42XCIsXG4gICAgXCJwZGZqcy1kaXN0XCI6IFwiNC4zLjEzNlwiLFxuICAgIFwieS1wcm9zZW1pcnJvclwiOiBcIl4xLjIuMTJcIixcbiAgICBcInlqc1wiOiBcIjEzLjYuMTlcIlxuICB9LFxuICBcImRldkRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJAaG9jdXNwb2N1cy9wcm92aWRlclwiOiBcIl4yLjEzLjZcIixcbiAgICBcIkByZWxlYXNlLWl0L2NvbnZlbnRpb25hbC1jaGFuZ2Vsb2dcIjogXCJeMTAuMC4wXCIsXG4gICAgXCJAcm9sbHVwL3BsdWdpbi1yZXBsYWNlXCI6IFwiXjYuMC4yXCIsXG4gICAgXCJAdml0ZWpzL3BsdWdpbi12dWVcIjogXCJeNS4yLjFcIixcbiAgICBcInBkZmpzLWRpc3RcIjogXCI0LjMuMTM2XCIsXG4gICAgXCJwb3N0Y3NzLW5lc3RlZFwiOiBcIl42LjAuMVwiLFxuICAgIFwicG9zdGNzcy1uZXN0ZWQtaW1wb3J0XCI6IFwiXjEuMy4wXCIsXG4gICAgXCJyZWxlYXNlLWl0XCI6IFwiXjE4LjEuMVwiLFxuICAgIFwidHlwZXNjcmlwdFwiOiBcIl41LjcuM1wiLFxuICAgIFwidml0ZVwiOiBcIl41LjQuMTJcIixcbiAgICBcInZ1ZS1kcmFnZ2FibGUtbmV4dFwiOiBcIl4yLjIuMVwiXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1UsT0FBTyxVQUFVO0FBQ25WLE9BQU8sVUFBVTtBQUNqQixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLGVBQWUsV0FBVztBQUNuQyxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLGtCQUFrQjtBQUMzQixPQUFPLFNBQVM7OztBQ0hkLGNBQVc7OztBREhiLElBQU0sbUNBQW1DO0FBQStKLElBQU0sMkNBQTJDO0FBa0JsUCxJQUFNLGFBQWEsQ0FBQyxVQUFVO0FBQ25DLFFBQU0sVUFBVTtBQUFBLElBQ2QsYUFBYSxjQUFjLElBQUksSUFBSSxTQUFTLHdDQUFlLENBQUM7QUFBQSxJQUM1RCxXQUFXLGNBQWMsSUFBSSxJQUFJLGdCQUFnQix3Q0FBZSxDQUFDO0FBQUEsSUFDakUsYUFBYSxjQUFjLElBQUksSUFBSSxPQUFPLHdDQUFlLENBQUM7QUFBQTtBQUFBLElBRzFELEtBQUssY0FBYyxJQUFJLElBQUksdUJBQXVCLHdDQUFlLENBQUM7QUFBQSxJQUNsRSxTQUFTLGNBQWMsSUFBSSxJQUFJLDRCQUE0Qix3Q0FBZSxDQUFDO0FBQUEsSUFDM0UsZUFBZSxjQUFjLElB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
