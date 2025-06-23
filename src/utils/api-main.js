import { app } from "electron";

/**
 * src/utils/api-main.js
 * 主进程 API 请求模块，使用 axios 发起 HTTP 请求
 * 开发环境: http://localhost:3000
 * 生产环境: https://maplet.cn/api/
 */

import axios from "axios";

// 基础 URL 配置
// const BASE_URL = "https://cursor.maplet.cn";
const BASE_URL = !app.isPackaged ? "http://localhost:3009" : "https://cursor.maplet.cn";

// 创建 axios 实例
const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// 请求拦截器
apiClient.interceptors.request.use(
    (config) => {
        // 可以在这里添加认证信息等通用处理
        console.log(`[API请求] ${config.method.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error("[API请求拦截器错误]", error);
        return Promise.reject(error);
    }
);

// 响应拦截器
apiClient.interceptors.response.use(
    (response) => {
        // 处理成功响应
        return response;
    },
    (error) => {
        // 处理错误响应
        console.error("[API响应错误]", error.message);
        return Promise.reject(error);
    }
);

/**
 * 获取健康状态接口
 */
export async function getHealth(version = null) {
    try {
        // 如果传入版本号，则作为查询参数一起发送
        const params = {};
        if (version) params.version = version;

        const response = await apiClient.get(`/api/health`, { params });
        if (response.status !== 200) {
            throw new Error(`获取健康状态失败: ${response.statusText}`);
        }
        return response.data;
    } catch (error) {
        console.error(`${error.message}`);
        throw error;
    }
}

/**
 * 生成许可证接口
 */
export async function generateLicense(data) {
    try {
        const response = await apiClient.post(`/api/license/generate`, data);
        if (response.status !== 200) {
            throw new Error(`生成许可证失败: ${response.statusText}`);
        }
        return response.data;
    } catch (error) {
        console.error(`${error.message}`);
        throw error;
    }
}

/**
 * 统一导出API接口
 */
export default {
    getHealth,
    generateLicense,
};
