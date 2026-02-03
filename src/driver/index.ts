/**
 * ZLG CAN 驱动接口
 * 封装 DLL 调用，提供 TypeScript 友好的 API
 */

import koffi from 'koffi';
import { loadZlgCanLib, isPlatformSupported, ZlgCanLibFunctions } from './loader';
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
  ZcanAutoTransmitObj,
  ZcanfdAutoTransmitObj,
  BusUsage,
  ZcanDynamicConfigData,
  IZcanDeviceInfo,
  IZcanChannelInitConfig,
  IZcanTransmitData,
  IZcanReceiveData,
  IZcanTransmitFdData,
  IZcanReceiveFdData,
  IZcanAutoTransmitObj,
  IZcanfdAutoTransmitObj,
  IBusUsage,
  IZcanDynamicConfigData,
} from './types';
import {
  ZCAN_STATUS,
  INVALID_DEVICE_HANDLE,
  INVALID_CHANNEL_HANDLE,
  ZCAN_DATA_TYPE,
} from './constants';
import { ZlgCanError } from './errors';

// 导出所有类型和常量
export * from './types';
export * from './constants';
export * from './errors';
export { isPlatformSupported, getSystemArch, getDllPath } from './loader';

/**
 * ZLG CAN 驱动类
 */
export class ZlgCanDriver {
  private lib: ZlgCanLibFunctions | null = null;
  private initialized = false;

  /**
   * 初始化驱动
   * 加载 DLL 并绑定函数
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    if (!isPlatformSupported()) {
      throw new Error('ZLG CAN driver only supports Windows platform');
    }

    this.lib = loadZlgCanLib();
    this.initialized = true;
  }

  /**
   * 确保驱动已初始化
   */
  private ensureInitialized(): ZlgCanLibFunctions {
    if (!this.initialized || !this.lib) {
      throw new Error('Driver not initialized. Call initialize() first.');
    }
    return this.lib;
  }

  // ============================================================================
  // 设备管理
  // ============================================================================

  /**
   * 打开设备
   * @param deviceType 设备类型
   * @param deviceIndex 设备索引
   * @returns 设备句柄
   * @throws {ZlgCanError} 打开设备失败时抛出异常
   */
  openDevice(deviceType: number, deviceIndex: number): number {
    const lib = this.ensureInitialized();
    const handle = lib.ZCAN_OpenDevice(deviceType, deviceIndex, 0);
    if (handle === INVALID_DEVICE_HANDLE) {
      throw new ZlgCanError('ZCAN_OpenDevice');
    }
    return handle;
  }

  /**
   * 关闭设备
   * @param deviceHandle 设备句柄
   * @throws {ZlgCanError} 关闭设备失败时抛出异常
   */
  closeDevice(deviceHandle: number): void {
    const lib = this.ensureInitialized();
    if (lib.ZCAN_CloseDevice(deviceHandle) !== ZCAN_STATUS.OK) {
      throw new ZlgCanError('ZCAN_CloseDevice');
    }
  }

  /**
   * 获取设备信息
   * @param deviceHandle 设备句柄
   * @returns 设备信息
   * @throws {ZlgCanError} 获取设备信息失败时抛出异常
   */
  getDeviceInfo(deviceHandle: number): IZcanDeviceInfo {
    const lib = this.ensureInitialized();
    const infoSize = koffi.sizeof(ZcanDeviceInfo);
    const buffer = Buffer.alloc(infoSize);

    const result = lib.ZCAN_GetDeviceInf(deviceHandle, buffer);
    if (result !== ZCAN_STATUS.OK) {
      throw new ZlgCanError('ZCAN_GetDeviceInfo');
    }

    const info = koffi.decode(buffer, ZcanDeviceInfo);
    return info as IZcanDeviceInfo;
  }

  /**
   * 检查设备是否在线
   * @param deviceHandle 设备句柄
   * @returns 是否在线
   */
  isDeviceOnline(deviceHandle: number): boolean {
    const lib = this.ensureInitialized();
    return lib.ZCAN_IsDeviceOnLine(deviceHandle) === ZCAN_STATUS.ONLINE;
  }

  // ============================================================================
  // 通道管理
  // ============================================================================

  /**
   * 初始化 CAN 通道
   * @param deviceHandle 设备句柄
   * @param canIndex 通道索引
   * @param config 通道配置
   * @returns 通道句柄
   * @throws {ZlgCanError} 初始化通道失败时抛出异常
   */
  initCAN(deviceHandle: number, canIndex: number, config: IZcanChannelInitConfig): number {
    const lib = this.ensureInitialized();
    const configSize = koffi.sizeof(ZcanChannelInitConfig);
    const buffer = Buffer.alloc(configSize);

    // 编码配置到 buffer
    koffi.encode(buffer, ZcanChannelInitConfig, {
      can_type: config.can_type,
      acc_code: config.acc_code,
      acc_mask: config.acc_mask,
      abit_timing: config.abit_timing || 0,
      dbit_timing: config.dbit_timing || 0,
      brp: config.brp || 0,
      filter: config.filter,
      mode: config.mode,
      pad: 0,
      reserved: 0,
    });

    const handle = lib.ZCAN_InitCAN(deviceHandle, canIndex, buffer);
    if (handle === INVALID_CHANNEL_HANDLE) {
      throw new ZlgCanError('ZCAN_InitCAN');
    }
    return handle;
  }

  /**
   * 启动 CAN 通道
   * @param channelHandle 通道句柄
   * @throws {ZlgCanError} 启动通道失败时抛出异常
   */
  startCAN(channelHandle: number): void {
    const lib = this.ensureInitialized();
    if (lib.ZCAN_StartCAN(channelHandle) !== ZCAN_STATUS.OK) {
      throw new ZlgCanError('ZCAN_StartCAN');
    }
  }

  /**
   * 重置 CAN 通道
   * @param channelHandle 通道句柄
   * @throws {ZlgCanError} 重置通道失败时抛出异常
   */
  resetCAN(channelHandle: number): void {
    const lib = this.ensureInitialized();
    if (lib.ZCAN_ResetCAN(channelHandle) !== ZCAN_STATUS.OK) {
      throw new ZlgCanError('ZCAN_ResetCAN');
    }
  }

  /**
   * 清空通道缓冲区
   * @param channelHandle 通道句柄
   * @throws {ZlgCanError} 清空缓冲区失败时抛出异常
   */
  clearBuffer(channelHandle: number): void {
    const lib = this.ensureInitialized();
    if (lib.ZCAN_ClearBuffer(channelHandle) !== ZCAN_STATUS.OK) {
      throw new ZlgCanError('ZCAN_ClearBuffer');
    }
  }

  /**
   * 获取接收缓冲区中的数据数量
   * @param channelHandle 通道句柄
   * @param type 数据类型 (0: CAN, 1: CANFD, 2: ALL)
   * @returns 数据数量
   */
  getReceiveNum(channelHandle: number, type: number = ZCAN_DATA_TYPE.ALL_DATA): number {
    const lib = this.ensureInitialized();
    return lib.ZCAN_GetReceiveNum(channelHandle, type);
  }

  // ============================================================================
  // 数据收发
  // ============================================================================

  /**
   * 发送 CAN 数据
   * @param channelHandle 通道句柄
   * @param data 发送数据数组
   * @returns 成功发送的数量
   */
  transmit(channelHandle: number, data: IZcanTransmitData[]): number {
    const lib = this.ensureInitialized();
    const itemSize = koffi.sizeof(ZcanTransmitData);
    const buffer = Buffer.alloc(itemSize * data.length);

    data.forEach((item, i) => {
      const frameData = {
        frame: {
          can_id: item.frame.can_id,
          can_dlc: item.frame.can_dlc,
          __pad: item.frame.__pad || 0,
          __res0: item.frame.__res0 || 0,
          __res1: item.frame.__res1 || 0,
          data: Array.from(item.frame.data).concat(new Array(8 - item.frame.data.length).fill(0)).slice(0, 8),
        },
        transmit_type: item.transmit_type,
      };
      koffi.encode(buffer, i * itemSize, ZcanTransmitData, frameData);
    });

    return lib.ZCAN_Transmit(channelHandle, buffer, data.length);
  }

  /**
   * 接收 CAN 数据
   * @param channelHandle 通道句柄
   * @param maxCount 最大接收数量
   * @param timeout 超时时间 (ms)，-1 表示无限等待
   * @returns 接收到的数据数组
   */
  receive(channelHandle: number, maxCount: number, timeout: number = -1): IZcanReceiveData[] {
    const lib = this.ensureInitialized();
    const itemSize = koffi.sizeof(ZcanReceiveData);
    const buffer = Buffer.alloc(itemSize * maxCount);

    const count = lib.ZCAN_Receive(channelHandle, buffer, maxCount, timeout);
    const result: IZcanReceiveData[] = [];

    for (let i = 0; i < count; i++) {
      const item = koffi.decode(buffer, i * itemSize, ZcanReceiveData);
      result.push(item as IZcanReceiveData);
    }

    return result;
  }

  /**
   * 发送 CANFD 数据
   * @param channelHandle 通道句柄
   * @param data 发送数据数组
   * @returns 成功发送的数量
   */
  transmitFD(channelHandle: number, data: IZcanTransmitFdData[]): number {
    const lib = this.ensureInitialized();
    const itemSize = koffi.sizeof(ZcanTransmitFdData);
    const buffer = Buffer.alloc(itemSize * data.length);

    data.forEach((item, i) => {
      const frameData = {
        frame: {
          can_id: item.frame.can_id,
          len: item.frame.len,
          flags: item.frame.flags || 0,
          __res0: item.frame.__res0 || 0,
          __res1: item.frame.__res1 || 0,
          data: Array.from(item.frame.data).concat(new Array(64 - item.frame.data.length).fill(0)).slice(0, 64),
        },
        transmit_type: item.transmit_type,
      };
      koffi.encode(buffer, i * itemSize, ZcanTransmitFdData, frameData);
    });

    return lib.ZCAN_TransmitFD(channelHandle, buffer, data.length);
  }

  /**
   * 接收 CANFD 数据
   * @param channelHandle 通道句柄
   * @param maxCount 最大接收数量
   * @param timeout 超时时间 (ms)，-1 表示无限等待
   * @returns 接收到的数据数组
   */
  receiveFD(channelHandle: number, maxCount: number, timeout: number = -1): IZcanReceiveFdData[] {
    const lib = this.ensureInitialized();
    const itemSize = koffi.sizeof(ZcanReceiveFdData);
    const buffer = Buffer.alloc(itemSize * maxCount);

    const count = lib.ZCAN_ReceiveFD(channelHandle, buffer, maxCount, timeout);
    const result: IZcanReceiveFdData[] = [];

    for (let i = 0; i < count; i++) {
      const item = koffi.decode(buffer, i * itemSize, ZcanReceiveFdData);
      result.push(item as IZcanReceiveFdData);
    }

    return result;
  }

  // ============================================================================
  // 配置接口
  // ============================================================================

  /**
   * 设置属性值
   * @param deviceHandle 设备句柄
   * @param path 属性路径
   * @param value 属性值 (字符串、数值或结构体对象)
   * @throws {ZlgCanError} 设置属性失败时抛出异常
   */
  setValue(deviceHandle: number, path: string, value: string | number | IZcanAutoTransmitObj | IZcanfdAutoTransmitObj | IZcanDynamicConfigData): void {
    const lib = this.ensureInitialized();
    let buffer: Buffer;

    if (typeof value === 'string') {
      // 字符串值：转换为 null 结尾的字符串
      buffer = Buffer.from(value + '\0', 'utf8');
    } else if (typeof value === 'number') {
      // 数值：转换为 uint32
      buffer = Buffer.alloc(4);
      buffer.writeUInt32LE(value, 0);
    } else if (this.isDynamicConfigData(value)) {
      // 动态配置数据
      buffer = this.encodeDynamicConfigData(value);
    } else if (this.isAutoTransmitObj(value)) {
      // CAN 周期发送配置
      buffer = this.encodeAutoTransmitObj(value);
    } else if (this.isAutoTransmitFdObj(value)) {
      // CANFD 周期发送配置
      buffer = this.encodeAutoTransmitFdObj(value);
    } else {
      throw new ZlgCanError('ZCAN_SetValue', undefined, '不支持的对象类型');
    }

    if (lib.ZCAN_SetValue(deviceHandle, path, buffer) !== ZCAN_STATUS.OK) {
      throw new ZlgCanError('ZCAN_SetValue');
    }
  }

  /**
   * 判断是否为 CAN 周期发送配置对象
   */
  private isAutoTransmitObj(obj: object): obj is IZcanAutoTransmitObj {
    const o = obj as IZcanAutoTransmitObj;
    return (
      typeof o.enable === 'number' &&
      typeof o.index === 'number' &&
      typeof o.interval === 'number' &&
      typeof o.obj === 'object' &&
      'frame' in o.obj &&
      'can_dlc' in o.obj.frame
    );
  }

  /**
   * 判断是否为 CANFD 周期发送配置对象
   */
  private isAutoTransmitFdObj(obj: object): obj is IZcanfdAutoTransmitObj {
    const o = obj as IZcanfdAutoTransmitObj;
    return (
      typeof o.enable === 'number' &&
      typeof o.index === 'number' &&
      typeof o.interval === 'number' &&
      typeof o.obj === 'object' &&
      'frame' in o.obj &&
      'len' in o.obj.frame
    );
  }

  /**
   * 判断是否为动态配置数据对象
   */
  private isDynamicConfigData(obj: object): obj is IZcanDynamicConfigData {
    const o = obj as IZcanDynamicConfigData;
    return (
      typeof o.key === 'string' &&
      typeof o.value === 'string' &&
      !('enable' in obj) &&
      !('interval' in obj)
    );
  }

  /**
   * 编码动态配置数据对象
   */
  private encodeDynamicConfigData(value: IZcanDynamicConfigData): Buffer {
    const size = koffi.sizeof(ZcanDynamicConfigData);
    const buffer = Buffer.alloc(size);

    // 将字符串转换为固定长度的字符数组 (64 bytes)
    const keyBytes = Buffer.alloc(64);
    const valueBytes = Buffer.alloc(64);
    keyBytes.write(value.key, 'utf8');
    valueBytes.write(value.value, 'utf8');

    const data = {
      key: Array.from(keyBytes),
      value: Array.from(valueBytes),
    };

    koffi.encode(buffer, ZcanDynamicConfigData, data);
    return buffer;
  }

  /**
   * 编码 CAN 周期发送配置对象
   */
  private encodeAutoTransmitObj(value: IZcanAutoTransmitObj): Buffer {
    const size = koffi.sizeof(ZcanAutoTransmitObj);
    const buffer = Buffer.alloc(size);

    const data = {
      enable: value.enable,
      index: value.index,
      interval: value.interval,
      obj: {
        frame: {
          can_id: value.obj.frame.can_id,
          can_dlc: value.obj.frame.can_dlc,
          __pad: value.obj.frame.__pad || 0,
          __res0: value.obj.frame.__res0 || 0,
          __res1: value.obj.frame.__res1 || 0,
          data: Array.from(value.obj.frame.data).concat(new Array(8).fill(0)).slice(0, 8),
        },
        transmit_type: value.obj.transmit_type,
      },
    };

    koffi.encode(buffer, ZcanAutoTransmitObj, data);
    return buffer;
  }

  /**
   * 编码 CANFD 周期发送配置对象
   */
  private encodeAutoTransmitFdObj(value: IZcanfdAutoTransmitObj): Buffer {
    const size = koffi.sizeof(ZcanfdAutoTransmitObj);
    const buffer = Buffer.alloc(size);

    const data = {
      enable: value.enable,
      index: value.index,
      interval: value.interval,
      obj: {
        frame: {
          can_id: value.obj.frame.can_id,
          len: value.obj.frame.len,
          flags: value.obj.frame.flags || 0,
          __res0: value.obj.frame.__res0 || 0,
          __res1: value.obj.frame.__res1 || 0,
          data: Array.from(value.obj.frame.data).concat(new Array(64).fill(0)).slice(0, 64),
        },
        transmit_type: value.obj.transmit_type,
      },
    };

    koffi.encode(buffer, ZcanfdAutoTransmitObj, data);
    return buffer;
  }

  /**
   * 获取属性值
   * @param deviceHandle 设备句柄
   * @param path 属性路径
   * @returns 属性值
   * @throws {ZlgCanError} 获取属性失败时抛出异常
   *
   * 注意：由于 GetValue 返回 void*，需要根据 path 确定返回类型
   * 目前支持：
   * - get_bus_usage: 返回 BusUsage 结构体
   * - 其他: 尝试作为字符串读取
   */
  getValue(deviceHandle: number, path: string): string | number | object {
    const lib = this.ensureInitialized();
    const ptr = lib.ZCAN_GetValue(deviceHandle, path);

    if (ptr === 0) {
      throw new ZlgCanError('ZCAN_GetValue');
    }

    // 处理 get_bus_usage 路径，返回 BusUsage 结构体
    if (path.includes('get_bus_usage')) {
      try {
        const busUsage = koffi.decode(ptr, BusUsage);
        return busUsage as IBusUsage;
      } catch {
        // 解码失败，返回指针地址
        return ptr;
      }
    }

    // 尝试作为字符串读取
    try {
      const str = koffi.decode(ptr, 'str');
      return str;
    } catch {
      // 如果不是字符串，返回指针地址
      return ptr;
    }
  }
}

// 导出单例实例
let driverInstance: ZlgCanDriver | null = null;

/**
 * 获取驱动实例（单例）
 */
export function getDriver(): ZlgCanDriver {
  if (!driverInstance) {
    driverInstance = new ZlgCanDriver();
  }
  return driverInstance;
}

/**
 * 创建新的驱动实例
 */
export function createDriver(): ZlgCanDriver {
  return new ZlgCanDriver();
}
