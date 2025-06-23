/**
 * 客户端请求许可证示例
 * 使用方法: node client-example.js
 */
import { app } from "electron";
import crypto from "crypto";
import pkg from "node-machine-id";
const { machineIdSync } = pkg;
import { generateLicense } from "./api-main.js";
import { PUBLIC_KEY } from "./const-config.js";
// import path from "path";
import { store } from "../script/system-config.js";
// import originalFs from "original-fs";

import { mainError, mainLicenseLog, mainBoxTips, mainLogTips, mainAboutNotice } from "./logger.js";

import { getHealth } from "../utils/api-main.js";
import { compareVersions } from "../utils/version.js";
import { runtimeHash } from "../main/index.js";

/**
 * 获取设备唯一ID
 * 注意：此示例需要安装 node-machine-id 包: npm install node-machine-id
 */
function getMachineId() {
    // 使用 node-machine-id 获取机器唯一ID
    return machineIdSync();
}

/**
 * 验证许可证签名
 * @param {Object} license - 许可证数据对象
 * @param {string} signature - Base64编码的签名
 * @returns {boolean} - 验证结果
 */
export function verifyLicense(license, signature) {
    if (!license || !signature) {
        return false;
    }
    try {
        const licenseString = JSON.stringify(license);
        return crypto.verify(undefined, Buffer.from(licenseString), PUBLIC_KEY, Buffer.from(signature, "base64"));
    } catch (error) {
        console.error("验证许可证失败:", error && error.message);
        return false;
    }
}

export function checkLicense(license, signature) {
    if (!license || !signature) {
        console.log("验证失败，许可证或签名不存在");
        return false;
    }
    const isValid = verifyLicense(license, signature);
    // 验证失败
    if (!isValid) {
        console.log("验证失败");
        return false;
    }
    // 许可证过期
    if (license.expirationTimestamp < Date.now()) {
        console.log("许可证过期");
        return false;
    }
    // 机器ID不匹配
    const machineId = getMachineId();
    if (machineId !== license.machineId) {
        console.log("机器ID不匹配");
        return false;
    }

    return true;
}

/**
 * 请求许可证 machineId, version, activationCode, asarHash,autoRegisterHash, clientTimestamp
 */
export async function requestLicense() {
    const isDev = !app.isPackaged;

    return generateLicense({
        machineId: getMachineId(),
        version: app.getVersion(),
        activationCode: store.get("activationCode") || null,
        clientTimestamp: Date.now(),
        autoRegisterHash: isDev ? "dev" : runtimeHash.autoRegister,
        asarHash: isDev ? "dev" : runtimeHash.asar,
    });
}

export async function getServerHealth() {
    try {
        const healthy = await getHealth(app.getVersion());
        const { status, version, boxTips, logTips, aboutNotice } = healthy;
        if (status !== 0) throw new Error("健康检查失败");
        if (boxTips) {
            mainBoxTips(boxTips);
        }
        if (logTips) {
            mainLogTips(logTips);
        }
        if (aboutNotice) {
            mainAboutNotice(aboutNotice);
        }
        let clientLicenseInfo = store.get("clientLicenseInfo");
        try {
            if (clientLicenseInfo) {
                const { license, signature } = clientLicenseInfo;
                const isValid = checkLicense(license, signature);
                if (!isValid) throw new Error("许可证验证失败");
            }
        } catch (error) {
            clientLicenseInfo = null;
            store.delete("clientLicenseInfo");
            console.log("error", error);
        }
        if (clientLicenseInfo) {
            if (compareVersions(version, clientLicenseInfo.license.licenseVersion) > 0) {
                store.delete("clientLicenseInfo");
                return null;
            }
        }
    } catch {
        mainError("连接服务器失败"); //页面可能还没有监听
        return null;
    }
}

// 获取真实许可证
export async function getRealLicense() {
    let appLicenseInfo = await mainCheckLicense();
    mainLicenseLog(appLicenseInfo);
    if (appLicenseInfo.status === 0) {
        return appLicenseInfo.license.permissions;
    } else {
        return null;
    }
}

// 校验客户端许可证  // 0: 正常 1:服务器错误 2: 许可证过期或验证失败  11: 需要升级APP版本  12: 用户被封禁
export async function mainCheckLicense() {
    // 获取客户端许可证
    let clientLicenseInfo = store.get("clientLicenseInfo") || null;
    // console.log("clientLicenseInfo", JSON.stringify(clientLicenseInfo.license));
    // console.log("signature", JSON.stringify(clientLicenseInfo.signature));
    try {
        if (clientLicenseInfo) {
            const { license, signature } = clientLicenseInfo;
            const isValid = checkLicense(license, signature);
            if (!isValid) {
                store.delete("clientLicenseInfo");
                clientLicenseInfo = null;
            }
        }
    } catch (error) {
        clientLicenseInfo = null;
        store.delete("clientLicenseInfo");
        console.log("error", error);
    }

    try {
        if (!clientLicenseInfo) {
            const { status, license, signature, message } = await requestLicense();

            if (status !== 0) {
                return {
                    status: status,
                    message: message,
                    license: license,
                    signature: signature,
                };
            }

            const isValid = checkLicense(license, signature);
            if (!isValid) {
                return {
                    status: 2,
                    message: "许可证过期或验证失败",
                    license: null,
                    signature: null,
                };
            }

            clientLicenseInfo = {
                license: license,
                signature: signature,
            };
            store.set("clientLicenseInfo", { license, signature });
            // console.log("realLicense保存成功", clientLicenseInfo);
        }
        return {
            status: 0,
            message: "正常",
            license: clientLicenseInfo.license,
            signature: clientLicenseInfo.signature,
        };
    } catch {
        console.log("error", "获取客户端许可证失败");
        return {
            status: 1,
            message: "服务器错误",
            license: null,
            signature: null,
        };
    }
}
