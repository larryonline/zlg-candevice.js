/**
 * ZLG CAN 驱动类型定义
 * 使用 koffi 定义与 C 结构体对应的类型
 *
 * 重要：字段顺序必须与 C 定义完全一致
 */

import koffi from 'koffi';
import { CAN_MAX_DLEN, CANFD_MAX_DLEN } from './constants';

// ============================================================================
// 基础 CAN 帧结构体
// ============================================================================

/**
 * CAN 帧结构体 (16 bytes)
 * 对应 C 结构体 can_frame
 */
export const CanFrame = koffi.struct('can_frame', {
  can_id: koffi.types.uint32,      // CAN ID + EFF/RTR/ERR 标志
  can_dlc: koffi.types.uint8,      // 数据长度 (0-8)
  __pad: koffi.types.uint8,        // 填充
  __res0: koffi.types.uint8,       // 保留
  __res1: koffi.types.uint8,       // 保留
  data: koffi.array(koffi.types.uint8, CAN_MAX_DLEN),  // 数据 (8 bytes)
});

/**
 * CANFD 帧结构体 (72 bytes)
 * 对应 C 结构体 canfd_frame
 */
export const CanfdFrame = koffi.struct('canfd_frame', {
  can_id: koffi.types.uint32,      // CAN ID + EFF/RTR/ERR 标志
  len: koffi.types.uint8,          // 数据长度 (0-64)
  flags: koffi.types.uint8,        // CANFD 标志 (BRS, ESI)
  __res0: koffi.types.uint8,       // 保留
  __res1: koffi.types.uint8,       // 保留
  data: koffi.array(koffi.types.uint8, CANFD_MAX_DLEN),  // 数据 (64 bytes)
});

// ============================================================================
// 设备信息结构体
// ============================================================================

/**
 * 设备信息结构体
 * 对应 C 结构体 ZCAN_DEVICE_INFO
 */
export const ZcanDeviceInfo = koffi.struct('ZCAN_DEVICE_INFO', {
  hw_Version: koffi.types.uint16,   // 硬件版本
  fw_Version: koffi.types.uint16,   // 固件版本
  dr_Version: koffi.types.uint16,   // 驱动版本
  in_Version: koffi.types.uint16,   // 动态库版本
  irq_Num: koffi.types.uint16,      // IRQ 号
  can_Num: koffi.types.uint8,       // CAN 通道数
  str_Serial_Num: koffi.array(koffi.types.uint8, 20),  // 序列号
  str_hw_Type: koffi.array(koffi.types.uint8, 40),     // 硬件类型
  reserved: koffi.array(koffi.types.uint16, 4),        // 保留
});

/**
 * 版本信息结构体
 * 对应 C 结构体 ZCAN_VERSION
 */
export const ZcanVersion = koffi.struct('ZCAN_VERSION', {
  major_version: koffi.types.uint8,
  minor_version: koffi.types.uint8,
  patch_version: koffi.types.uint8,
  reserved: koffi.types.uint8,
});

/**
 * 扩展设备信息结构体
 * 对应 C 结构体 ZCAN_DEVICE_INFO_EX
 */
export const ZcanDeviceInfoEx = koffi.struct('ZCAN_DEVICE_INFO_EX', {
  hardware_version: ZcanVersion,
  firmware_version: ZcanVersion,
  driver_version: ZcanVersion,
  library_version: ZcanVersion,
  device_name: koffi.array(koffi.types.uint8, 128),
  hardware_type: koffi.array(koffi.types.uint8, 40),
  serial_number: koffi.array(koffi.types.uint8, 20),
  can_channel_number: koffi.types.uint8,
  lin_channel_number: koffi.types.uint8,
  reserved: koffi.array(koffi.types.uint8, 46),
  device_info_version: ZcanVersion,
});

// ============================================================================
// 通道配置结构体
// ============================================================================

/**
 * CAN 通道配置 (用于 union)
 */
export const ZcanChannelInitConfigCan = koffi.struct('ZCAN_CHANNEL_INIT_CONFIG_CAN', {
  acc_code: koffi.types.uint32,
  acc_mask: koffi.types.uint32,
  reserved: koffi.types.uint32,
  filter: koffi.types.uint8,
  timing0: koffi.types.uint8,
  timing1: koffi.types.uint8,
  mode: koffi.types.uint8,
});

/**
 * CANFD 通道配置 (用于 union)
 */
export const ZcanChannelInitConfigCanfd = koffi.struct('ZCAN_CHANNEL_INIT_CONFIG_CANFD', {
  acc_code: koffi.types.uint32,
  acc_mask: koffi.types.uint32,
  abit_timing: koffi.types.uint32,
  dbit_timing: koffi.types.uint32,
  brp: koffi.types.uint32,
  filter: koffi.types.uint8,
  mode: koffi.types.uint8,
  pad: koffi.types.uint16,
  reserved: koffi.types.uint32,
});

/**
 * 通道初始化配置结构体
 * 对应 C 结构体 ZCAN_CHANNEL_INIT_CONFIG
 *
 * 注意：由于 koffi 对 union 的支持限制，这里使用 CANFD 配置
 * 因为 CANFD 配置的大小更大，可以兼容 CAN 配置
 */
export const ZcanChannelInitConfig = koffi.struct('ZCAN_CHANNEL_INIT_CONFIG', {
  can_type: koffi.types.uint32,  // 0: CAN, 1: CANFD
  // 使用 CANFD 配置作为 union 的最大尺寸
  acc_code: koffi.types.uint32,
  acc_mask: koffi.types.uint32,
  abit_timing: koffi.types.uint32,
  dbit_timing: koffi.types.uint32,
  brp: koffi.types.uint32,
  filter: koffi.types.uint8,
  mode: koffi.types.uint8,
  pad: koffi.types.uint16,
  reserved: koffi.types.uint32,
});

// ============================================================================
// 通道状态结构体
// ============================================================================

/**
 * 通道错误信息结构体
 * 对应 C 结构体 ZCAN_CHANNEL_ERR_INFO
 */
export const ZcanChannelErrInfo = koffi.struct('ZCAN_CHANNEL_ERR_INFO', {
  error_code: koffi.types.uint32,
  passive_ErrData: koffi.array(koffi.types.uint8, 3),
  arLost_ErrData: koffi.types.uint8,
});

/**
 * 通道状态结构体
 * 对应 C 结构体 ZCAN_CHANNEL_STATUS
 */
export const ZcanChannelStatus = koffi.struct('ZCAN_CHANNEL_STATUS', {
  errInterrupt: koffi.types.uint8,
  regMode: koffi.types.uint8,
  regStatus: koffi.types.uint8,
  regALCapture: koffi.types.uint8,
  regECCapture: koffi.types.uint8,
  regEWLimit: koffi.types.uint8,
  regRECounter: koffi.types.uint8,
  regTECounter: koffi.types.uint8,
  Reserved: koffi.types.uint32,
});

// ============================================================================
// 数据收发结构体
// ============================================================================

/**
 * CAN 发送数据结构体
 * 对应 C 结构体 ZCAN_Transmit_Data
 */
export const ZcanTransmitData = koffi.struct('ZCAN_Transmit_Data', {
  frame: CanFrame,
  transmit_type: koffi.types.uint32,
});

/**
 * CAN 接收数据结构体
 * 对应 C 结构体 ZCAN_Receive_Data
 */
export const ZcanReceiveData = koffi.struct('ZCAN_Receive_Data', {
  frame: CanFrame,
  timestamp: koffi.types.uint64,  // 时间戳 (us)
});

/**
 * CANFD 发送数据结构体
 * 对应 C 结构体 ZCAN_TransmitFD_Data
 */
export const ZcanTransmitFdData = koffi.struct('ZCAN_TransmitFD_Data', {
  frame: CanfdFrame,
  transmit_type: koffi.types.uint32,
});

/**
 * CANFD 接收数据结构体
 * 对应 C 结构体 ZCAN_ReceiveFD_Data
 */
export const ZcanReceiveFdData = koffi.struct('ZCAN_ReceiveFD_Data', {
  frame: CanfdFrame,
  timestamp: koffi.types.uint64,  // 时间戳 (us)
});

// ============================================================================
// 周期发送结构体
// ============================================================================

/**
 * CAN 周期发送对象
 * 对应 C 结构体 ZCAN_AUTO_TRANSMIT_OBJ
 *
 * 注意：字段顺序必须是 enable, index, interval, obj
 */
export const ZcanAutoTransmitObj = koffi.struct('ZCAN_AUTO_TRANSMIT_OBJ', {
  enable: koffi.types.uint16,
  index: koffi.types.uint16,       // 0...n
  interval: koffi.types.uint32,    // ms
  obj: ZcanTransmitData,
});

/**
 * CANFD 周期发送对象
 * 对应 C 结构体 ZCANFD_AUTO_TRANSMIT_OBJ
 */
export const ZcanfdAutoTransmitObj = koffi.struct('ZCANFD_AUTO_TRANSMIT_OBJ', {
  enable: koffi.types.uint16,
  index: koffi.types.uint16,       // 0...n
  interval: koffi.types.uint32,    // ms
  obj: ZcanTransmitFdData,
});

/**
 * 周期发送参数
 * 对应 C 结构体 ZCAN_AUTO_TRANSMIT_OBJ_PARAM
 */
export const ZcanAutoTransmitObjParam = koffi.struct('ZCAN_AUTO_TRANSMIT_OBJ_PARAM', {
  index: koffi.types.uint16,   // 定时发送帧的索引
  type: koffi.types.uint16,    // 参数类型 (1: 启动延时)
  value: koffi.types.uint32,   // 参数数值
});

// ============================================================================
// TypeScript 接口定义 (用于 JS 层)
// ============================================================================

export interface ICanFrame {
  can_id: number;
  can_dlc: number;
  __pad?: number;
  __res0?: number;
  __res1?: number;
  data: number[] | Uint8Array;
}

export interface ICanfdFrame {
  can_id: number;
  len: number;
  flags?: number;
  __res0?: number;
  __res1?: number;
  data: number[] | Uint8Array;
}

export interface IZcanDeviceInfo {
  hw_Version: number;
  fw_Version: number;
  dr_Version: number;
  in_Version: number;
  irq_Num: number;
  can_Num: number;
  str_Serial_Num: Uint8Array;
  str_hw_Type: Uint8Array;
  reserved: Uint16Array;
}

export interface IZcanChannelInitConfig {
  can_type: number;  // 0: CAN, 1: CANFD
  acc_code: number;
  acc_mask: number;
  abit_timing?: number;
  dbit_timing?: number;
  brp?: number;
  filter: number;
  mode: number;
  // CAN 专用
  timing0?: number;
  timing1?: number;
}

export interface IZcanTransmitData {
  frame: ICanFrame;
  transmit_type: number;
}

export interface IZcanReceiveData {
  frame: ICanFrame;
  timestamp: bigint | number;
}

export interface IZcanTransmitFdData {
  frame: ICanfdFrame;
  transmit_type: number;
}

export interface IZcanReceiveFdData {
  frame: ICanfdFrame;
  timestamp: bigint | number;
}

export interface IZcanAutoTransmitObj {
  enable: number;
  index: number;
  interval: number;
  obj: IZcanTransmitData;
}

export interface IZcanfdAutoTransmitObj {
  enable: number;
  index: number;
  interval: number;
  obj: IZcanTransmitFdData;
}

// ============================================================================
// 总线利用率结构体
// ============================================================================

/**
 * 总线利用率结构体
 * 对应 C 结构体 BusUsage
 */
export const BusUsage = koffi.struct('BusUsage', {
  nTimeStampBegin: koffi.types.uint64,  // 测量起始时间戳，单位us
  nTimeStampEnd: koffi.types.uint64,    // 测量结束时间戳，单位us
  nChnl: koffi.types.uint8,             // 通道
  nReserved: koffi.types.uint8,         // 保留
  nBusUsage: koffi.types.uint16,        // 总线利用率(%)，总线利用率*100展示。取值0~10000，如8050表示80.50%
  nFrameCount: koffi.types.uint32,      // 帧数量
});

/**
 * 总线利用率接口
 */
export interface IBusUsage {
  nTimeStampBegin: bigint | number;     // 测量起始时间戳，单位us
  nTimeStampEnd: bigint | number;       // 测量结束时间戳，单位us
  nChnl: number;                        // 通道
  nReserved: number;                    // 保留
  nBusUsage: number;                    // 总线利用率(%)，总线利用率*100展示。取值0~10000
  nFrameCount: number;                  // 帧数量
}

// ============================================================================
// 动态配置结构体
// ============================================================================

/**
 * 动态配置数据结构体
 * 对应 C 结构体 ZCAN_DYNAMIC_CONFIG_DATA
 * 用于设置总线利用率等动态配置
 */
export const ZcanDynamicConfigData = koffi.struct('ZCAN_DYNAMIC_CONFIG_DATA', {
  key: koffi.array(koffi.types.char, 64),    // 配置键名
  value: koffi.array(koffi.types.char, 64),  // 配置值
});

/**
 * 动态配置数据接口
 */
export interface IZcanDynamicConfigData {
  key: string;
  value: string;
}
