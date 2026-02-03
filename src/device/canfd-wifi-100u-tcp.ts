/**
 * CANFD-WIFI-100U-TCP 设备层实现
 * 封装以太网 CANFD 设备的功能接口
 */

import {
  ZlgCanDriver,
  getDriver,
  ZCAN_DEVICE_TYPE,
  ZCAN_DATA_TYPE,
  ZCAN_TRANSMIT_TYPE,
  CAN_FLAG,
  CANFD_FLAG,
  TX_FLAG,
  TCP_WORK_MODE,
  INVALID_DEVICE_HANDLE,
  INVALID_CHANNEL_HANDLE,
  IZcanTransmitData,
  IZcanTransmitFdData,
  IZcanAutoTransmitObj,
  IZcanfdAutoTransmitObj,
  ZlgCanError,
} from '../driver';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 设备配置
 */
export interface CanfdWifi100uTcpConfig {
  /** 设备 IP 地址 */
  ip: string;
  /** 工作端口 */
  port: number;
  /** 设备索引，默认 0 */
  deviceIndex?: number;
  /** 发送回显，默认 true */
  echo?: boolean;
}

/**
 * CAN 报文
 */
export interface CanMessage {
  /** 报文 ID */
  id: number;
  /** 数据内容 */
  data: Buffer | number[];
  /** 是否为扩展帧 (29-bit ID) */
  isExtended?: boolean;
  /** 是否为远程帧 */
  isRemote?: boolean;
  /** 时间戳 (接收时有效) */
  timestamp?: bigint | number;
}

/**
 * CANFD 报文
 */
export interface CanFdMessage extends CanMessage {
  /** 比特率切换 */
  brs?: boolean;
  /** 错误状态指示 */
  esi?: boolean;
}

/**
 * 周期发送配置
 */
export interface AutoSendConfig {
  /** 列表索引 (0-n) */
  index: number;
  /** 是否启用 */
  enable: boolean;
  /** 发送间隔 (ms) */
  interval: number;
  /** 报文内容 */
  message: CanMessage | CanFdMessage;
}

/**
 * 队列发送项
 */
export interface QueueSendItem {
  /** 报文内容 */
  message: CanMessage | CanFdMessage;
  /** 延时时间 (ms) */
  delay: number;
}

/**
 * 报文类型
 */
export type MessageType = 'can' | 'canfd' | 'all';

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 判断是否为 CANFD 报文
 */
function isCanFdMessage(msg: CanMessage | CanFdMessage): msg is CanFdMessage {
  return 'brs' in msg || 'esi' in msg;
}

/**
 * 将 CanMessage 转换为驱动层 CAN 发送数据
 */
function toZcanTransmitData(msg: CanMessage, transmitType: number = ZCAN_TRANSMIT_TYPE.NORMAL, echo: boolean = false): IZcanTransmitData {
  let canId = msg.id;
  if (msg.isExtended) {
    canId |= CAN_FLAG.EFF_FLAG;
  }
  if (msg.isRemote) {
    canId |= CAN_FLAG.RTR_FLAG;
  }

  const data = msg.data instanceof Buffer ? Array.from(msg.data) : msg.data;

  return {
    frame: {
      can_id: canId,
      can_dlc: data.length,
      __pad: echo ? TX_FLAG.ECHO_FLAG : 0,
      data: data,
    },
    transmit_type: transmitType,
  };
}

/**
 * 将 CanFdMessage 转换为驱动层 CANFD 发送数据
 */
function toZcanTransmitFdData(msg: CanFdMessage, transmitType: number = ZCAN_TRANSMIT_TYPE.NORMAL, echo: boolean = false): IZcanTransmitFdData {
  let canId = msg.id;
  if (msg.isExtended) {
    canId |= CAN_FLAG.EFF_FLAG;
  }
  if (msg.isRemote) {
    canId |= CAN_FLAG.RTR_FLAG;
  }

  let flags = 0;
  if (msg.brs) {
    flags |= CANFD_FLAG.BRS;
  }
  if (msg.esi) {
    flags |= CANFD_FLAG.ESI;
  }
  if (echo) {
    flags |= TX_FLAG.ECHO_FLAG;
  }

  const data = msg.data instanceof Buffer ? Array.from(msg.data) : msg.data;

  return {
    frame: {
      can_id: canId,
      len: data.length,
      flags: flags,
      data: data,
    },
    transmit_type: transmitType,
  };
}

/**
 * 从驱动层接收数据转换为 CanMessage
 */
function fromZcanReceiveData(data: { frame: { can_id: number; can_dlc: number; data: number[] | Uint8Array }; timestamp: bigint | number }): CanMessage {
  const canId = data.frame.can_id;
  const isExtended = (canId & CAN_FLAG.EFF_FLAG) !== 0;
  const isRemote = (canId & CAN_FLAG.RTR_FLAG) !== 0;
  const id = canId & (isExtended ? CAN_FLAG.EFF_MASK : CAN_FLAG.SFF_MASK);

  return {
    id,
    data: Buffer.from(Array.from(data.frame.data).slice(0, data.frame.can_dlc)),
    isExtended,
    isRemote,
    timestamp: data.timestamp,
  };
}

/**
 * 从驱动层接收数据转换为 CanFdMessage
 */
function fromZcanReceiveFdData(data: { frame: { can_id: number; len: number; flags?: number; data: number[] | Uint8Array }; timestamp: bigint | number }): CanFdMessage {
  const canId = data.frame.can_id;
  const isExtended = (canId & CAN_FLAG.EFF_FLAG) !== 0;
  const isRemote = (canId & CAN_FLAG.RTR_FLAG) !== 0;
  const id = canId & (isExtended ? CAN_FLAG.EFF_MASK : CAN_FLAG.SFF_MASK);
  const flags = data.frame.flags || 0;

  return {
    id,
    data: Buffer.from(Array.from(data.frame.data).slice(0, data.frame.len)),
    isExtended,
    isRemote,
    timestamp: data.timestamp,
    brs: (flags & CANFD_FLAG.BRS) !== 0,
    esi: (flags & CANFD_FLAG.ESI) !== 0,
  };
}

// ============================================================================
// 设备类
// ============================================================================

/**
 * CANFD-WIFI-100U-TCP 设备类
 *
 * 以太网 CANFD 设备，通过 TCP 连接到设备
 *
 * 约束：
 * - 无法设置波特率和终端电阻
 * - 以 client 模式连接到设备
 * - 仅有一个通道 (channel_0)
 * - 无法调用 isOnline 接口
 */
export class CanfdWifi100uTcp {
  private driver: ZlgCanDriver;
  private config: CanfdWifi100uTcpConfig;
  private deviceHandle: number = INVALID_DEVICE_HANDLE;
  private channelHandle: number = INVALID_CHANNEL_HANDLE;
  private readonly channelIndex = 0;

  constructor(config: CanfdWifi100uTcpConfig) {
    this.config = {
      deviceIndex: 0,
      ...config,
    };
    this.driver = getDriver();
  }

  // ============================================================================
  // 设备状态管理
  // ============================================================================

  /**
   * 打开设备
   *
   * 执行以下操作：
   * 1. 初始化驱动
   * 2. 打开设备
   * 3. 配置连接参数 (ip, port, client 模式)
   * 4. 开启 CANFD 增强和 ALL_DATA 协议
   * 5. 初始化并启动通道
   */
  open(): void {
    if (this.isOpen()) {
      return;
    }

    // 初始化驱动
    this.driver.initialize();

    // 打开设备
    this.deviceHandle = this.driver.openDevice(
      // ZCAN_DEVICE_TYPE.ZCAN_CANFDWIFI_100U_TCP,
      ZCAN_DEVICE_TYPE.ZCAN_CANFDNET_200U_TCP, // dll 库问题, 临时使用这个设备号, 之后会修复
      this.config.deviceIndex!,
    );

    try {
      // 配置连接参数
      this.driver.setValue(this.deviceHandle, `${this.channelIndex}/ip`, this.config.ip);
      this.driver.setValue(this.deviceHandle, `${this.channelIndex}/work_port`, this.config.port.toString());
      this.driver.setValue(this.deviceHandle, `${this.channelIndex}/work_mode`, String(TCP_WORK_MODE.TCP_CLIENT));

      // 设置发送回显 (设备级)
      if (this.config.echo !== false) {
        this.driver.setValue(this.deviceHandle, `${this.channelIndex}/set_device_tx_echo`, '1');
      }

      // 开启 CANFD 增强
      this.driver.setValue(this.deviceHandle, `${this.channelIndex}/canfd_exp`, '1');

      // 设置协议支持
      this.driver.setValue(this.deviceHandle, `${this.channelIndex}/protocol`, String(ZCAN_DATA_TYPE.ALL_DATA));

      // 初始化通道 (以太网设备不需要配置波特率)
      this.channelHandle = this.driver.initCAN(this.deviceHandle, this.channelIndex, {
        can_type: 1, // CANFD
        acc_code: 0,
        acc_mask: 0xFFFFFFFF,
        filter: 0,
        mode: 0,
      });

      // 启动通道
      this.driver.startCAN(this.channelHandle);
    } catch (error) {
      // 如果初始化失败，关闭设备
      this.closeInternal();
      throw error;
    }
  }

  /**
   * 关闭设备
   */
  close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.closeInternal();
  }

  /**
   * 内部关闭方法
   */
  private closeInternal(): void {
    if (this.deviceHandle !== INVALID_DEVICE_HANDLE) {
      try {
        this.driver.closeDevice(this.deviceHandle);
      } catch {
        // 忽略关闭错误
      }
      this.deviceHandle = INVALID_DEVICE_HANDLE;
      this.channelHandle = INVALID_CHANNEL_HANDLE;
    }
  }

  /**
   * 检查设备是否已打开
   */
  isOpen(): boolean {
    return this.deviceHandle !== INVALID_DEVICE_HANDLE && this.channelHandle !== INVALID_CHANNEL_HANDLE;
  }

  /**
   * 确保设备已打开
   */
  private ensureOpen(): void {
    if (!this.isOpen()) {
      throw new ZlgCanError('Device', undefined, '设备未打开');
    }
  }

  // ============================================================================
  // 报文收发
  // ============================================================================

  /**
   * 接收报文
   * @param maxCount 最大接收数量，默认 100
   * @param timeout 超时时间 (ms)，默认 0 (不等待)
   * @param type 报文类型，默认 'all'
   * @returns 接收到的报文数组
   */
  receive(maxCount: number = 100, timeout: number = 0, type: MessageType = 'all'): (CanMessage | CanFdMessage)[] {
    this.ensureOpen();

    const result: (CanMessage | CanFdMessage)[] = [];

    // 接收 CAN 报文
    if (type === 'can' || type === 'all') {
      const canData = this.driver.receive(this.channelHandle, maxCount, timeout);
      for (const data of canData) {
        result.push(fromZcanReceiveData(data));
      }
    }

    // 接收 CANFD 报文
    if (type === 'canfd' || type === 'all') {
      const canfdData = this.driver.receiveFD(this.channelHandle, maxCount, timeout);
      for (const data of canfdData) {
        result.push(fromZcanReceiveFdData(data));
      }
    }

    // 按时间戳排序 (仅 type='all' 时需要)
    if (type === 'all') {
      result.sort((a, b) => {
        const ta = typeof a.timestamp === 'bigint' ? Number(a.timestamp) : (a.timestamp || 0);
        const tb = typeof b.timestamp === 'bigint' ? Number(b.timestamp) : (b.timestamp || 0);
        return ta - tb;
      });
    }

    return result;
  }

  /**
   * 立即发送报文
   * @param message 要发送的报文
   */
  transmit(message: CanMessage | CanFdMessage): void {
    this.ensureOpen();
    const echo = this.config.echo !== false;

    if (isCanFdMessage(message)) {
      const data = toZcanTransmitFdData(message, ZCAN_TRANSMIT_TYPE.NORMAL, echo);
      const sent = this.driver.transmitFD(this.channelHandle, [data]);
      if (sent !== 1) {
        throw new ZlgCanError('transmit', undefined, '发送 CANFD 报文失败');
      }
    } else {
      const data = toZcanTransmitData(message, ZCAN_TRANSMIT_TYPE.NORMAL, echo);
      const sent = this.driver.transmit(this.channelHandle, [data]);
      if (sent !== 1) {
        throw new ZlgCanError('transmit', undefined, '发送 CAN 报文失败');
      }
    }
  }

  /**
   * 批量发送报文
   * @param messages 要发送的报文数组 (可混合 CAN 和 CANFD)
   * @returns 成功发送的数量
   */
  transmitBatch(messages: (CanMessage | CanFdMessage)[]): number {
    this.ensureOpen();
    const echo = this.config.echo !== false;

    // 分离 CAN 和 CANFD 报文
    const canMessages: CanMessage[] = [];
    const canfdMessages: CanFdMessage[] = [];

    for (const msg of messages) {
      if (isCanFdMessage(msg)) {
        canfdMessages.push(msg);
      } else {
        canMessages.push(msg);
      }
    }

    let totalSent = 0;

    // 发送 CAN 报文
    if (canMessages.length > 0) {
      const data = canMessages.map((msg) => toZcanTransmitData(msg, ZCAN_TRANSMIT_TYPE.NORMAL, echo));
      totalSent += this.driver.transmit(this.channelHandle, data);
    }

    // 发送 CANFD 报文
    if (canfdMessages.length > 0) {
      const data = canfdMessages.map((msg) => toZcanTransmitFdData(msg, ZCAN_TRANSMIT_TYPE.NORMAL, echo));
      totalSent += this.driver.transmitFD(this.channelHandle, data);
    }

    return totalSent;
  }

  /**
   * 清空接收缓冲区
   */
  clearBuffer(): void {
    this.ensureOpen();
    this.driver.clearBuffer(this.channelHandle);
  }

  /**
   * 获取缓冲区报文数量
   * @param type 报文类型，默认 'all'
   * @returns 报文数量
   */
  getBufferCount(type: MessageType = 'all'): number {
    this.ensureOpen();

    let count = 0;

    if (type === 'can' || type === 'all') {
      count += this.driver.getReceiveNum(this.channelHandle, ZCAN_DATA_TYPE.CAN);
    }

    if (type === 'canfd' || type === 'all') {
      count += this.driver.getReceiveNum(this.channelHandle, ZCAN_DATA_TYPE.CANFD);
    }

    return count;
  }

  // ============================================================================
  // 周期发送
  // ============================================================================

  /**
   * 添加周期发送报文
   * @param config 周期发送配置
   */
  addAutoSend(config: AutoSendConfig): void {
    this.ensureOpen();
    const echo = this.config.echo !== false;

    if (isCanFdMessage(config.message)) {
      const obj: IZcanfdAutoTransmitObj = {
        enable: config.enable ? 1 : 0,
        index: config.index,
        interval: config.interval,
        obj: toZcanTransmitFdData(config.message, ZCAN_TRANSMIT_TYPE.NORMAL, echo),
      };
      this.driver.setValue(this.deviceHandle, `${this.channelIndex}/auto_send`, obj);
    } else {
      const obj: IZcanAutoTransmitObj = {
        enable: config.enable ? 1 : 0,
        index: config.index,
        interval: config.interval,
        obj: toZcanTransmitData(config.message, ZCAN_TRANSMIT_TYPE.NORMAL, echo),
      };
      this.driver.setValue(this.deviceHandle, `${this.channelIndex}/auto_send`, obj);
    }
  }

  /**
   * 应用周期发送配置，开始发送
   */
  applyAutoSend(): void {
    this.ensureOpen();
    this.driver.setValue(this.deviceHandle, `${this.channelIndex}/apply_auto_send`, '0');
  }

  /**
   * 清除所有周期发送
   */
  clearAutoSend(): void {
    this.ensureOpen();
    this.driver.setValue(this.deviceHandle, `${this.channelIndex}/clear_auto_send`, '0');
  }

  /**
   * 获取周期发送报文数量
   * @param isFd 是否为 CANFD 报文
   * @returns 报文数量
   */
  getAutoSendCount(isFd: boolean = false): number {
    this.ensureOpen();
    const path = isFd
      ? `${this.channelIndex}/get_auto_send_canfd_count/1`
      : `${this.channelIndex}/get_auto_send_can_count/1`;
    const result = this.driver.getValue(this.deviceHandle, path);
    return typeof result === 'number' ? result : parseInt(String(result), 10) || 0;
  }

  /**
   * 获取周期发送报文数据
   * @param index 报文索引
   * @param isFd 是否为 CANFD 报文
   * @returns 报文数据，如果不存在返回 null
   */
  getAutoSendData(index: number, isFd: boolean = false): CanMessage | CanFdMessage | null {
    this.ensureOpen();
    const path = isFd
      ? `${this.channelIndex}/get_auto_send_canfd_data/${index}`
      : `${this.channelIndex}/get_auto_send_can_data/${index}`;

    try {
      const result = this.driver.getValue(this.deviceHandle, path);
      // 根据返回的数据类型进行转换
      // 注意：实际实现可能需要根据 DLL 返回的具体格式进行调整
      if (typeof result === 'object' && result !== null) {
        return result as CanMessage | CanFdMessage;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // 队列发送
  // ============================================================================

  /**
   * 获取发送队列可用长度
   * @returns 可用长度
   */
  getAvailableTxCount(): number {
    this.ensureOpen();
    const path = `${this.channelIndex}/get_device_available_tx_count/1`;
    const result = this.driver.getValue(this.deviceHandle, path);
    return typeof result === 'number' ? result : parseInt(String(result), 10) || 0;
  }

  /**
   * 队列发送报文
   *
   * 通过设置延时标志，批量发送带延时的报文列表
   *
   * @param items 队列发送项数组
   * @returns 成功发送的数量
   */
  transmitQueue(items: QueueSendItem[]): number {
    this.ensureOpen();

    // 分离 CAN 和 CANFD 报文
    const canItems: { data: IZcanTransmitData; delay: number }[] = [];
    const canfdItems: { data: IZcanTransmitFdData; delay: number }[] = [];

    for (const item of items) {
      if (isCanFdMessage(item.message)) {
        canfdItems.push({
          data: toZcanTransmitFdData(item.message),
          delay: item.delay,
        });
      } else {
        canItems.push({
          data: toZcanTransmitData(item.message),
          delay: item.delay,
        });
      }
    }

    let totalSent = 0;

    // 发送 CAN 报文
    if (canItems.length > 0) {
      const canData = canItems.map((item) => {
        const data = { ...item.data };

        // __pad: bit7 = 队列发送标志, bit5 = 回显
        let pad = TX_FLAG.DELAY_SEND_FLAG;  // 0x80 队列发送标志
        if (this.config.echo !== false) {
          pad |= TX_FLAG.ECHO_FLAG;         // 0x20 回显标志（默认开启）
        }

        data.frame = {
          ...data.frame,
          __pad: pad,
          __res0: item.delay & 0xFF,         // 延时低字节
          __res1: (item.delay >> 8) & 0xFF,  // 延时高字节
        };
        return data;
      });
      totalSent += this.driver.transmit(this.channelHandle, canData);
    }

    // 发送 CANFD 报文
    if (canfdItems.length > 0) {
      const canfdData = canfdItems.map((item) => {
        const data = { ...item.data };

        // flags: bit7 = 队列发送标志, bit5 = 回显, bit0 = BRS
        let flags = data.frame.flags || 0;
        flags |= TX_FLAG.DELAY_SEND_FLAG;  // 0x80 队列发送标志
        if (this.config.echo !== false) {
          flags |= TX_FLAG.ECHO_FLAG;      // 0x20 回显标志（默认开启）
        }

        data.frame = {
          ...data.frame,
          flags: flags,
          __res0: item.delay & 0xFF,         // 延时低字节
          __res1: (item.delay >> 8) & 0xFF,  // 延时高字节
        };
        return data;
      });
      totalSent += this.driver.transmitFD(this.channelHandle, canfdData);
    }

    return totalSent;
  }

  /**
   * 清空延时发送队列
   */
  clearDelayQueue(): void {
    this.ensureOpen();
    this.driver.setValue(this.deviceHandle, `${this.channelIndex}/clear_delay_send_queue`, '0');
  }
}
