import eslintConfig from "@electron-toolkit/eslint-config";
import eslintConfigPrettier from "@electron-toolkit/eslint-config-prettier";
import eslintPluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import fs from "fs";

// Read auto-import config
const autoImportConfig = fs.existsSync("./.eslintrc-auto-import.json")
    ? JSON.parse(fs.readFileSync("./.eslintrc-auto-import.json", "utf-8"))
    : { globals: {} };

export default [
    { ignores: ["**/node_modules", "**/dist", "**/out", ".eslintrc-auto-import.json"] },
    eslintConfig,
    ...eslintPluginVue.configs["flat/recommended"],
    {
        files: ["**/*.vue"],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
                extraFileExtensions: [".vue"],
            },
            globals: {
                ...autoImportConfig.globals,
            },
        },
    },
    {
        files: ["**/*.{js,jsx,vue}"],
        rules: {
            "vue/require-default-prop": "off",
            "vue/multi-word-component-names": "off",
            quotes: "off",
        },
    },
    eslintConfigPrettier,
];
