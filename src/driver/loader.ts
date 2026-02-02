/**
 * ZLG CAN DLL 加载器
 * 根据系统架构自动加载对应的 DLL
 */

import koffi from 'koffi';
import path from 'path';
import os from 'os';
import {
  ZcanDeviceInfo,
  ZcanDeviceInfoEx,
  ZcanChannelInitConfig,
  ZcanChannelErrInfo,
  ZcanChannelStatus,
  ZcanTransmitData,
  ZcanReceiveData,
  ZcanTransmitFdData,
  ZcanReceiveFdData,
} from './types';

/**
 * 获取 DLL 路径
 * 根据当前系统架构选择 x64 或 x86 版本
 */
export function getDllPath(): string {
  const arch = os.arch();
  const dllDir = arch === 'x64' ? 'zlgcan_x64' : 'zlgcan_x86';

  // 从 src/driver 向上两级到项目根目录，再进入 libs
  const dllPath = path.join(__dirname, '../../libs/zlg_canlib', dllDir, 'zlgcan.dll');

  return dllPath;
}

/**
 * DLL 函数接口定义
 */
export interface ZlgCanLibFunctions {
  // 设备管理
  ZCAN_OpenDevice: (device_type: number, device_index: number, reserved: number) => number;
  ZCAN_CloseDevice: (device_handle: number) => number;
  ZCAN_GetDeviceInf: (device_handle: number, pInfo: Buffer) => number;
  ZCAN_GetDeviceInfoEx: (device_handle: number, pInfo: Buffer) => number;
  ZCAN_IsDeviceOnLine: (device_handle: number) => number;

  // 通道管理
  ZCAN_InitCAN: (device_handle: number, can_index: number, pInitConfig: Buffer) => number;
  ZCAN_StartCAN: (channel_handle: number) => number;
  ZCAN_ResetCAN: (channel_handle: number) => number;
  ZCAN_ClearBuffer: (channel_handle: number) => number;
  ZCAN_ReadChannelErrInfo: (channel_handle: number, pErrInfo: Buffer) => number;
  ZCAN_ReadChannelStatus: (channel_handle: number, pCANStatus: Buffer) => number;
  ZCAN_GetReceiveNum: (channel_handle: number, type: number) => number;

  // 数据收发
  ZCAN_Transmit: (channel_handle: number, pTransmit: Buffer, len: number) => number;
  ZCAN_Receive: (channel_handle: number, pReceive: Buffer, len: number, wait_time: number) => number;
  ZCAN_TransmitFD: (channel_handle: number, pTransmit: Buffer, len: number) => number;
  ZCAN_ReceiveFD: (channel_handle: number, pReceive: Buffer, len: number, wait_time: number) => number;

  // 配置
  ZCAN_SetValue: (device_handle: number, path: string, value: Buffer) => number;
  ZCAN_GetValue: (device_handle: number, path: string) => number;
}

/**
 * 加载 ZLG CAN DLL 并绑定函数
 */
export function loadZlgCanLib(): ZlgCanLibFunctions {
  const dllPath = getDllPath();
  const lib = koffi.load(dllPath);

  // 定义函数签名并绑定
  const functions: ZlgCanLibFunctions = {
    // 设备管理
    ZCAN_OpenDevice: lib.func('__stdcall', 'ZCAN_OpenDevice', 'void *', ['uint', 'uint', 'uint']),
    ZCAN_CloseDevice: lib.func('__stdcall', 'ZCAN_CloseDevice', 'uint', ['void *']),
    ZCAN_GetDeviceInf: lib.func('__stdcall', 'ZCAN_GetDeviceInf', 'uint', ['void *', koffi.out(koffi.pointer(ZcanDeviceInfo))]),
    ZCAN_GetDeviceInfoEx: lib.func('__stdcall', 'ZCAN_GetDeviceInfoEx', 'uint', ['void *', koffi.out(koffi.pointer(ZcanDeviceInfoEx))]),
    ZCAN_IsDeviceOnLine: lib.func('__stdcall', 'ZCAN_IsDeviceOnLine', 'uint', ['void *']),

    // 通道管理
    ZCAN_InitCAN: lib.func('__stdcall', 'ZCAN_InitCAN', 'void *', ['void *', 'uint', koffi.pointer(ZcanChannelInitConfig)]),
    ZCAN_StartCAN: lib.func('__stdcall', 'ZCAN_StartCAN', 'uint', ['void *']),
    ZCAN_ResetCAN: lib.func('__stdcall', 'ZCAN_ResetCAN', 'uint', ['void *']),
    ZCAN_ClearBuffer: lib.func('__stdcall', 'ZCAN_ClearBuffer', 'uint', ['void *']),
    ZCAN_ReadChannelErrInfo: lib.func('__stdcall', 'ZCAN_ReadChannelErrInfo', 'uint', ['void *', koffi.out(koffi.pointer(ZcanChannelErrInfo))]),
    ZCAN_ReadChannelStatus: lib.func('__stdcall', 'ZCAN_ReadChannelStatus', 'uint', ['void *', koffi.out(koffi.pointer(ZcanChannelStatus))]),
    ZCAN_GetReceiveNum: lib.func('__stdcall', 'ZCAN_GetReceiveNum', 'uint', ['void *', 'uint8']),

    // 数据收发
    ZCAN_Transmit: lib.func('__stdcall', 'ZCAN_Transmit', 'uint', ['void *', koffi.pointer(ZcanTransmitData), 'uint']),
    ZCAN_Receive: lib.func('__stdcall', 'ZCAN_Receive', 'uint', ['void *', koffi.out(koffi.pointer(ZcanReceiveData)), 'uint', 'int']),
    ZCAN_TransmitFD: lib.func('__stdcall', 'ZCAN_TransmitFD', 'uint', ['void *', koffi.pointer(ZcanTransmitFdData), 'uint']),
    ZCAN_ReceiveFD: lib.func('__stdcall', 'ZCAN_ReceiveFD', 'uint', ['void *', koffi.out(koffi.pointer(ZcanReceiveFdData)), 'uint', 'int']),

    // 配置
    ZCAN_SetValue: lib.func('__stdcall', 'ZCAN_SetValue', 'uint', ['void *', 'str', 'void *']),
    ZCAN_GetValue: lib.func('__stdcall', 'ZCAN_GetValue', 'void *', ['void *', 'str']),
  };

  return functions;
}

/**
 * 检查当前平台是否支持
 */
export function isPlatformSupported(): boolean {
  return os.platform() === 'win32';
}

/**
 * 获取当前系统架构
 */
export function getSystemArch(): 'x64' | 'x86' {
  return os.arch() === 'x64' ? 'x64' : 'x86';
}
