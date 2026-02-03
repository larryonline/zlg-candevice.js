/**
 * 错误处理单元测试
 * 验证 ZlgCanError 异常类和错误信息映射的正确性
 */

import { expect } from 'chai';
import {
  ZlgCanError,
  ZCAN_ERROR_MESSAGES,
  getErrorMessage,
} from '../../src/driver/errors';
import { ZCAN_ERROR } from '../../src/driver/constants';

describe('错误处理测试', () => {
  describe('ZCAN_ERROR_MESSAGES', () => {
    it('应包含所有 ZCAN_ERROR 错误码的映射', () => {
      const errorCodes = Object.values(ZCAN_ERROR);
      const mappedCodes = Object.keys(ZCAN_ERROR_MESSAGES).map(Number);

      errorCodes.forEach((code) => {
        expect(
          mappedCodes,
          `错误码 0x${code.toString(16)} 应有对应的错误信息`,
        ).to.include(code);
      });
    });

    it('DEVICEOPENED 错误码应映射到正确的错误信息', () => {
      const message = ZCAN_ERROR_MESSAGES[ZCAN_ERROR.DEVICEOPENED];
      expect(message, `DEVICEOPENED 错误信息: ${message}`).to.equal('设备已打开');
    });

    it('DEVICENOTOPEN 错误码应映射到正确的错误信息', () => {
      const message = ZCAN_ERROR_MESSAGES[ZCAN_ERROR.DEVICENOTOPEN];
      expect(message, `DEVICENOTOPEN 错误信息: ${message}`).to.equal('设备未打开');
    });

    it('CAN_BUSOFF 错误码应映射到正确的错误信息', () => {
      const message = ZCAN_ERROR_MESSAGES[ZCAN_ERROR.CAN_BUSOFF];
      expect(message, `CAN_BUSOFF 错误信息: ${message}`).to.equal('CAN 总线关闭');
    });
  });

  describe('getErrorMessage', () => {
    it('有错误码时应返回包含操作名称和错误信息的消息', () => {
      const message = getErrorMessage('ZCAN_OpenDevice', ZCAN_ERROR.DEVICENOTEXIST);
      expect(message, `错误消息: ${message}`).to.include('ZCAN_OpenDevice');
      expect(message, `错误消息: ${message}`).to.include('设备不存在');
      expect(message, `错误消息: ${message}`).to.include('0x1000');
    });

    it('无错误码时应返回仅包含操作名称的消息', () => {
      const message = getErrorMessage('ZCAN_CloseDevice');
      expect(message, `错误消息: ${message}`).to.equal('ZCAN_CloseDevice 失败');
    });

    it('未知错误码时应返回仅包含操作名称的消息', () => {
      const unknownCode = 0x99999999;
      const message = getErrorMessage('ZCAN_Test', unknownCode);
      expect(message, `错误消息: ${message}`).to.equal('ZCAN_Test 失败');
    });
  });

  describe('ZlgCanError', () => {
    it('应正确设置 name 属性', () => {
      const error = new ZlgCanError('ZCAN_OpenDevice');
      expect(error.name, `error.name: ${error.name}`).to.equal('ZlgCanError');
    });

    it('应正确设置 operation 属性', () => {
      const operation = 'ZCAN_InitCAN';
      const error = new ZlgCanError(operation);
      expect(error.operation, `error.operation: ${error.operation}`).to.equal(operation);
    });

    it('应正确设置 errorCode 属性', () => {
      const errorCode = ZCAN_ERROR.DEVICENOTOPEN;
      const error = new ZlgCanError('ZCAN_StartCAN', errorCode);
      expect(error.errorCode, `error.errorCode: 0x${error.errorCode?.toString(16)}`).to.equal(errorCode);
    });

    it('无错误码时 errorCode 应为 undefined', () => {
      const error = new ZlgCanError('ZCAN_CloseDevice');
      expect(error.errorCode, 'error.errorCode 应为 undefined').to.be.undefined;
    });

    it('应自动生成包含操作名称的错误消息', () => {
      const error = new ZlgCanError('ZCAN_OpenDevice');
      expect(error.message, `error.message: ${error.message}`).to.include('ZCAN_OpenDevice');
      expect(error.message, `error.message: ${error.message}`).to.include('失败');
    });

    it('有错误码时应自动生成包含错误信息的消息', () => {
      const error = new ZlgCanError('ZCAN_OpenDevice', ZCAN_ERROR.DEVICENOTEXIST);
      expect(error.message, `error.message: ${error.message}`).to.include('设备不存在');
      expect(error.message, `error.message: ${error.message}`).to.include('0x1000');
    });

    it('应支持自定义错误消息', () => {
      const customMessage = '自定义错误消息';
      const error = new ZlgCanError('ZCAN_Test', undefined, customMessage);
      expect(error.message, `error.message: ${error.message}`).to.equal(customMessage);
    });

    it('应继承自 Error 类', () => {
      const error = new ZlgCanError('ZCAN_OpenDevice');
      expect(error, 'error 应为 Error 实例').to.be.instanceOf(Error);
      expect(error, 'error 应为 ZlgCanError 实例').to.be.instanceOf(ZlgCanError);
    });

    it('应能被 try-catch 捕获', () => {
      let caught = false;
      let caughtError: ZlgCanError | null = null;

      try {
        throw new ZlgCanError('ZCAN_OpenDevice', ZCAN_ERROR.DEVICEOPEN);
      } catch (e) {
        if (e instanceof ZlgCanError) {
          caught = true;
          caughtError = e;
        }
      }

      expect(caught, '异常应被捕获').to.be.true;
      expect(caughtError?.operation, `捕获的异常 operation: ${caughtError?.operation}`).to.equal('ZCAN_OpenDevice');
      expect(caughtError?.errorCode, `捕获的异常 errorCode: 0x${caughtError?.errorCode?.toString(16)}`).to.equal(ZCAN_ERROR.DEVICEOPEN);
    });
  });
});
