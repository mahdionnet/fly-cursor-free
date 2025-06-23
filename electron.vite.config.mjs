import { resolve } from "path";
import { defineConfig, bytecodePlugin, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import javascriptObfuscator from "vite-plugin-javascript-obfuscator";

// import Icons from "unplugin-icons/vite";
// import IconsResolver from "unplugin-icons/resolver";

export default defineConfig({
    main: {
        plugins: [
            bytecodePlugin({
                transformArrowFunctions: false,
            }),
            externalizeDepsPlugin({
                exclude: [
                    "electron-updater",
                    "electron-store",
                    "@electron-toolkit/utils",
                    "node-machine-id",
                    "stream-json",
                    "jwt-decode",
                    "@electron-toolkit/preload",
                    "axios",
                    "element-plus",
                    "pinia",
                ],
            }),
        ],
        build: {
            lib: {
                entry: resolve("src/main/index.js"),
            },
            rollupOptions: {
                external: ["sqlite3", "original-fs"],
            },
            minify: true,
            sourcemap: false,
        },
    },
    preload: {
        plugins: [
            externalizeDepsPlugin(),
            javascriptObfuscator({
                options: {
                    compact: true,
                    selfDefending: true,
                    // 字符串混淆
                    stringArray: true,
                    stringArrayEncoding: ["base64"],
                    stringArrayThreshold: 1,
                    splitStrings: true,
                    splitStringsChunkLength: 20,
                },
            }),
        ],
        build: {
            lib: {
                entry: resolve("src/preload/index.js"),
            },
            minify: true,
            sourcemap: false,
        },
    },
    renderer: {
        resolve: {
            alias: {
                "@renderer": resolve("src/renderer/src"),
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: `@use "@renderer/styles/element/index.scss" as *;`,
                },
            },
        },
        plugins: [
            vue(),
            AutoImport({
                // Auto import functions from Vue, e.g. ref, reactive, toRef...
                // 自动导入 Vue 相关函数，如：ref, reactive, toRef 等
                imports: ["vue"],
                // 添加类型声明文件生成
                dts: resolve("src/renderer/src/auto-imports.d.ts"),
                eslintrc: {
                    enabled: true,
                    filepath: "./.eslintrc-auto-import.json",
                    globalsPropValue: true,
                },
                resolvers: [ElementPlusResolver({ importStyle: "sass" })],
            }),
            Components({
                resolvers: [
                    // Auto register icon components
                    // // 自动注册图标组件
                    // IconsResolver({
                    //     enabledCollections: ["ep"],
                    // }),
                    ElementPlusResolver({ importStyle: "sass" }),
                ],
                // 为组件添加类型声明文件
                dts: resolve("src/renderer/src/components.d.ts"),
            }),
            // Icons({
            //     autoInstall: true,
            // }),
            javascriptObfuscator({
                apply: "build",
                enforce: "post",
                options: {
                    compact: true,
                    selfDefending: true,
                    // 字符串混淆
                    stringArray: true,
                    stringArrayEncoding: ["base64"],
                    stringArrayThreshold: 1,
                    splitStrings: true,
                    splitStringsChunkLength: 20,
                },
                hook: "renderChunk",
            }),
        ],
        build: {
            minify: true,
            sourcemap: false,
            chunkSizeWarningLimit: 1000,
            rollupOptions: {},
        },
    },
});
