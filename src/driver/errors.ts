/**
 * ZLG CAN 驱动错误处理
 */

import { ZCAN_ERROR } from './constants';

/**
 * 错误码到错误信息的映射
 */
export const ZCAN_ERROR_MESSAGES: Record<number, string> = {
  // CAN 总线错误
  [ZCAN_ERROR.CAN_OVERFLOW]: 'CAN 溢出',
  [ZCAN_ERROR.CAN_ERRALARM]: 'CAN 错误报警',
  [ZCAN_ERROR.CAN_PASSIVE]: 'CAN 被动错误',
  [ZCAN_ERROR.CAN_LOSE]: 'CAN 仲裁丢失',
  [ZCAN_ERROR.CAN_BUSERR]: 'CAN 总线错误',
  [ZCAN_ERROR.CAN_BUSOFF]: 'CAN 总线关闭',
  [ZCAN_ERROR.CAN_BUFFER_OVERFLOW]: 'CAN 缓冲区溢出',
  // 设备错误
  [ZCAN_ERROR.DEVICEOPENED]: '设备已打开',
  [ZCAN_ERROR.DEVICEOPEN]: '打开设备失败',
  [ZCAN_ERROR.DEVICENOTOPEN]: '设备未打开',
  [ZCAN_ERROR.BUFFEROVERFLOW]: '缓冲区溢出',
  [ZCAN_ERROR.DEVICENOTEXIST]: '设备不存在',
  [ZCAN_ERROR.LOADKERNELDLL]: '加载内核驱动失败',
  [ZCAN_ERROR.CMDFAILED]: '执行命令失败',
  [ZCAN_ERROR.BUFFERCREATE]: '创建缓冲区失败',
  // CANETE 错误
  [ZCAN_ERROR.CANETE_PORTOPENED]: 'CANETE 端口已打开',
  [ZCAN_ERROR.CANETE_INDEXUSED]: 'CANETE 索引已使用',
  // 网络错误
  [ZCAN_ERROR.REF_TYPE_ID]: '引用类型 ID 错误',
  [ZCAN_ERROR.CREATE_SOCKET]: '创建 Socket 失败',
  [ZCAN_ERROR.OPEN_CONNECT]: '打开连接失败',
  [ZCAN_ERROR.NO_STARTUP]: '未启动',
  [ZCAN_ERROR.NO_CONNECTED]: '未连接',
  [ZCAN_ERROR.SEND_PARTIAL]: '部分发送',
  [ZCAN_ERROR.SEND_TOO_FAST]: '发送过快',
};

/**
 * 获取错误信息
 */
export function getErrorMessage(operation: string, errorCode?: number): string {
  if (errorCode !== undefined && ZCAN_ERROR_MESSAGES[errorCode]) {
    return `${operation} 失败: ${ZCAN_ERROR_MESSAGES[errorCode]} (0x${errorCode.toString(16)})`;
  }
  return `${operation} 失败`;
}

/**
 * ZLG CAN 驱动异常类
 */
export class ZlgCanError extends Error {
  constructor(
    public readonly operation: string,
    public readonly errorCode?: number,
    message?: string,
  ) {
    super(message || getErrorMessage(operation, errorCode));
    this.name = 'ZlgCanError';
  }
}
