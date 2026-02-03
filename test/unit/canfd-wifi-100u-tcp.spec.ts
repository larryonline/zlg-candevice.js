/**
 * CANFD-WIFI-100U-TCP 设备层单元测试
 * 使用 mock 验证设备层逻辑的正确性
 */

import { expect } from 'chai';
import {
  CanfdWifi100uTcp,
  CanMessage,
  CanFdMessage,
  AutoSendConfig,
  QueueSendItem,
  MessageType,
} from '../../src/device/canfd-wifi-100u-tcp';
import { ZlgCanError } from '../../src/driver/errors';
import { CAN_FLAG, CANFD_FLAG } from '../../src/driver/constants';

describe('CanfdWifi100uTcp', () => {
  const TEST_CONFIG = {
    ip: '192.168.1.100',
    port: 8000,
    deviceIndex: 0,
  };

  describe('构造函数', () => {
    it('应正确保存配置', () => {
      const device = new CanfdWifi100uTcp(TEST_CONFIG);
      expect(device, '设备实例应存在').to.exist;
    });

    it('deviceIndex 应默认为 0', () => {
      const device = new CanfdWifi100uTcp({ ip: '192.168.1.1', port: 8000 });
      expect(device, '设备实例应存在').to.exist;
    });
  });

  describe('isOpen', () => {
    it('新创建的设备应处于关闭状态', () => {
      const device = new CanfdWifi100uTcp(TEST_CONFIG);
      expect(device.isOpen(), '新设备应处于关闭状态').to.be.false;
    });
  });

  describe('设备未打开时的操作', () => {
    let device: CanfdWifi100uTcp;

    beforeEach(() => {
      device = new CanfdWifi100uTcp(TEST_CONFIG);
    });

    it('receive 应抛出设备未打开异常', () => {
      expect(() => device.receive(), '未打开设备时调用 receive 应抛出异常').to.throw(ZlgCanError);
    });

    it('transmit 应抛出设备未打开异常', () => {
      const msg: CanMessage = { id: 0x100, data: Buffer.from([1, 2, 3]) };
      expect(() => device.transmit(msg), '未打开设备时调用 transmit 应抛出异常').to.throw(ZlgCanError);
    });

    it('clearBuffer 应抛出设备未打开异常', () => {
      expect(() => device.clearBuffer(), '未打开设备时调用 clearBuffer 应抛出异常').to.throw(ZlgCanError);
    });

    it('addAutoSend 应抛出设备未打开异常', () => {
      const config: AutoSendConfig = {
        index: 0,
        enable: true,
        interval: 100,
        message: { id: 0x100, data: [1, 2, 3] },
      };
      expect(() => device.addAutoSend(config), '未打开设备时调用 addAutoSend 应抛出异常').to.throw(ZlgCanError);
    });

    it('applyAutoSend 应抛出设备未打开异常', () => {
      expect(() => device.applyAutoSend(), '未打开设备时调用 applyAutoSend 应抛出异常').to.throw(ZlgCanError);
    });

    it('clearAutoSend 应抛出设备未打开异常', () => {
      expect(() => device.clearAutoSend(), '未打开设备时调用 clearAutoSend 应抛出异常').to.throw(ZlgCanError);
    });

    it('getAutoSendCount 应抛出设备未打开异常', () => {
      expect(() => device.getAutoSendCount(), '未打开设备时调用 getAutoSendCount 应抛出异常').to.throw(ZlgCanError);
    });

    it('getAutoSendData 应抛出设备未打开异常', () => {
      expect(() => device.getAutoSendData(0), '未打开设备时调用 getAutoSendData 应抛出异常').to.throw(ZlgCanError);
    });

    it('getAvailableTxCount 应抛出设备未打开异常', () => {
      expect(() => device.getAvailableTxCount(), '未打开设备时调用 getAvailableTxCount 应抛出异常').to.throw(ZlgCanError);
    });

    it('transmitQueue 应抛出设备未打开异常', () => {
      const items: QueueSendItem[] = [{ message: { id: 0x100, data: [1] }, delay: 10 }];
      expect(() => device.transmitQueue(items), '未打开设备时调用 transmitQueue 应抛出异常').to.throw(ZlgCanError);
    });

    it('clearDelayQueue 应抛出设备未打开异常', () => {
      expect(() => device.clearDelayQueue(), '未打开设备时调用 clearDelayQueue 应抛出异常').to.throw(ZlgCanError);
    });

    it('close 在设备未打开时不应抛出异常', () => {
      expect(() => device.close(), '关闭未打开的设备不应抛出异常').to.not.throw();
    });
  });

  describe('CAN/CANFD 报文类型判断', () => {
    it('不含 brs/esi 的报文应被识别为 CAN 报文', () => {
      const msg: CanMessage = { id: 0x100, data: [1, 2, 3] };
      expect('brs' in msg, '普通 CAN 报文不应包含 brs 属性').to.be.false;
      expect('esi' in msg, '普通 CAN 报文不应包含 esi 属性').to.be.false;
    });

    it('含 brs 的报文应被识别为 CANFD 报文', () => {
      const msg: CanFdMessage = { id: 0x100, data: [1, 2, 3], brs: true };
      expect('brs' in msg, 'CANFD 报文应包含 brs 属性').to.be.true;
    });

    it('含 esi 的报文应被识别为 CANFD 报文', () => {
      const msg: CanFdMessage = { id: 0x100, data: [1, 2, 3], esi: false };
      expect('esi' in msg, 'CANFD 报文应包含 esi 属性').to.be.true;
    });
  });

  describe('报文数据格式', () => {
    it('CanMessage 应支持 Buffer 类型数据', () => {
      const msg: CanMessage = {
        id: 0x100,
        data: Buffer.from([0x01, 0x02, 0x03, 0x04]),
      };
      expect(Buffer.isBuffer(msg.data), '数据应为 Buffer 类型').to.be.true;
      expect((msg.data as Buffer).length, `数据长度应为 4，实际: ${(msg.data as Buffer).length}`).to.equal(4);
    });

    it('CanMessage 应支持 number[] 类型数据', () => {
      const msg: CanMessage = {
        id: 0x100,
        data: [0x01, 0x02, 0x03, 0x04],
      };
      expect(Array.isArray(msg.data), '数据应为数组类型').to.be.true;
      expect(msg.data.length, `数据长度应为 4，实际: ${msg.data.length}`).to.equal(4);
    });

    it('CanMessage 应支持扩展帧标志', () => {
      const msg: CanMessage = {
        id: 0x12345678,
        data: [1, 2, 3],
        isExtended: true,
      };
      expect(msg.isExtended, '扩展帧标志应为 true').to.be.true;
    });

    it('CanMessage 应支持远程帧标志', () => {
      const msg: CanMessage = {
        id: 0x100,
        data: [],
        isRemote: true,
      };
      expect(msg.isRemote, '远程帧标志应为 true').to.be.true;
    });

    it('CanFdMessage 应支持 BRS 标志', () => {
      const msg: CanFdMessage = {
        id: 0x100,
        data: Buffer.alloc(64),
        brs: true,
      };
      expect(msg.brs, 'BRS 标志应为 true').to.be.true;
    });

    it('CanFdMessage 应支持 ESI 标志', () => {
      const msg: CanFdMessage = {
        id: 0x100,
        data: Buffer.alloc(64),
        esi: true,
      };
      expect(msg.esi, 'ESI 标志应为 true').to.be.true;
    });
  });

  describe('AutoSendConfig 配置', () => {
    it('应包含必要的配置字段', () => {
      const config: AutoSendConfig = {
        index: 0,
        enable: true,
        interval: 100,
        message: { id: 0x100, data: [1, 2, 3] },
      };

      expect(config.index, `index 应为 0，实际: ${config.index}`).to.equal(0);
      expect(config.enable, 'enable 应为 true').to.be.true;
      expect(config.interval, `interval 应为 100，实际: ${config.interval}`).to.equal(100);
      expect(config.message.id, `message.id 应为 0x100，实际: 0x${config.message.id.toString(16)}`).to.equal(0x100);
    });

    it('应支持 CANFD 报文', () => {
      const config: AutoSendConfig = {
        index: 1,
        enable: true,
        interval: 50,
        message: { id: 0x200, data: Buffer.alloc(32), brs: true },
      };

      expect('brs' in config.message, '报文应包含 brs 属性').to.be.true;
    });
  });

  describe('QueueSendItem 配置', () => {
    it('应包含报文和延时字段', () => {
      const item: QueueSendItem = {
        message: { id: 0x100, data: [1, 2, 3] },
        delay: 10,
      };

      expect(item.message.id, `message.id 应为 0x100，实际: 0x${item.message.id.toString(16)}`).to.equal(0x100);
      expect(item.delay, `delay 应为 10，实际: ${item.delay}`).to.equal(10);
    });

    it('应支持 CANFD 报文', () => {
      const item: QueueSendItem = {
        message: { id: 0x200, data: Buffer.alloc(64), brs: true, esi: false },
        delay: 20,
      };

      expect('brs' in item.message, '报文应包含 brs 属性').to.be.true;
    });
  });

  describe('CAN_FLAG 常量', () => {
    it('EFF_FLAG 应为扩展帧标志位', () => {
      expect(CAN_FLAG.EFF_FLAG, `EFF_FLAG 应为 0x80000000，实际: 0x${CAN_FLAG.EFF_FLAG.toString(16)}`).to.equal(0x80000000);
    });

    it('RTR_FLAG 应为远程帧标志位', () => {
      expect(CAN_FLAG.RTR_FLAG, `RTR_FLAG 应为 0x40000000，实际: 0x${CAN_FLAG.RTR_FLAG.toString(16)}`).to.equal(0x40000000);
    });

    it('SFF_MASK 应为标准帧 ID 掩码 (11-bit)', () => {
      expect(CAN_FLAG.SFF_MASK, `SFF_MASK 应为 0x7FF，实际: 0x${CAN_FLAG.SFF_MASK.toString(16)}`).to.equal(0x7FF);
    });

    it('EFF_MASK 应为扩展帧 ID 掩码 (29-bit)', () => {
      expect(CAN_FLAG.EFF_MASK, `EFF_MASK 应为 0x1FFFFFFF，实际: 0x${CAN_FLAG.EFF_MASK.toString(16)}`).to.equal(0x1FFFFFFF);
    });
  });

  describe('CANFD_FLAG 常量', () => {
    it('BRS 应为比特率切换标志', () => {
      expect(CANFD_FLAG.BRS, `BRS 应为 0x01，实际: 0x${CANFD_FLAG.BRS.toString(16)}`).to.equal(0x01);
    });

    it('ESI 应为错误状态指示标志', () => {
      expect(CANFD_FLAG.ESI, `ESI 应为 0x02，实际: 0x${CANFD_FLAG.ESI.toString(16)}`).to.equal(0x02);
    });
  });

  describe('MessageType 类型', () => {
    it('应支持 can 类型', () => {
      const type: MessageType = 'can';
      expect(type, `type 应为 'can'，实际: ${type}`).to.equal('can');
    });

    it('应支持 canfd 类型', () => {
      const type: MessageType = 'canfd';
      expect(type, `type 应为 'canfd'，实际: ${type}`).to.equal('canfd');
    });

    it('应支持 all 类型', () => {
      const type: MessageType = 'all';
      expect(type, `type 应为 'all'，实际: ${type}`).to.equal('all');
    });
  });

  describe('设备未打开时的新增接口', () => {
    let device: CanfdWifi100uTcp;

    beforeEach(() => {
      device = new CanfdWifi100uTcp(TEST_CONFIG);
    });

    it('transmitBatch 应抛出设备未打开异常', () => {
      const messages: CanMessage[] = [
        { id: 0x100, data: [1, 2, 3] },
        { id: 0x101, data: [4, 5, 6] },
      ];
      expect(() => device.transmitBatch(messages), '未打开设备时调用 transmitBatch 应抛出异常').to.throw(ZlgCanError);
    });

    it('getBufferCount 应抛出设备未打开异常', () => {
      expect(() => device.getBufferCount(), '未打开设备时调用 getBufferCount 应抛出异常').to.throw(ZlgCanError);
    });

    it('getBufferCount 带 type 参数应抛出设备未打开异常', () => {
      expect(() => device.getBufferCount('can'), '未打开设备时调用 getBufferCount("can") 应抛出异常').to.throw(ZlgCanError);
      expect(() => device.getBufferCount('canfd'), '未打开设备时调用 getBufferCount("canfd") 应抛出异常').to.throw(ZlgCanError);
      expect(() => device.getBufferCount('all'), '未打开设备时调用 getBufferCount("all") 应抛出异常').to.throw(ZlgCanError);
    });

    it('receive 带 type 参数应抛出设备未打开异常', () => {
      expect(() => device.receive(100, 0, 'can'), '未打开设备时调用 receive(..., "can") 应抛出异常').to.throw(ZlgCanError);
      expect(() => device.receive(100, 0, 'canfd'), '未打开设备时调用 receive(..., "canfd") 应抛出异常').to.throw(ZlgCanError);
      expect(() => device.receive(100, 0, 'all'), '未打开设备时调用 receive(..., "all") 应抛出异常').to.throw(ZlgCanError);
    });
  });

  describe('transmitBatch 参数验证', () => {
    it('应支持混合 CAN 和 CANFD 报文', () => {
      const messages: (CanMessage | CanFdMessage)[] = [
        { id: 0x100, data: [1, 2, 3] },
        { id: 0x200, data: Buffer.alloc(32), brs: true },
        { id: 0x101, data: [4, 5, 6] },
        { id: 0x201, data: Buffer.alloc(64), brs: false, esi: true },
      ];

      // 验证数组包含混合类型
      const canCount = messages.filter((m) => !('brs' in m) && !('esi' in m)).length;
      const canfdCount = messages.filter((m) => 'brs' in m || 'esi' in m).length;

      expect(canCount, `CAN 报文数量应为 2，实际: ${canCount}`).to.equal(2);
      expect(canfdCount, `CANFD 报文数量应为 2，实际: ${canfdCount}`).to.equal(2);
    });

    it('应支持空数组', () => {
      const messages: (CanMessage | CanFdMessage)[] = [];
      expect(messages.length, '空数组长度应为 0').to.equal(0);
    });

    it('应支持纯 CAN 报文数组', () => {
      const messages: CanMessage[] = [
        { id: 0x100, data: [1, 2, 3] },
        { id: 0x101, data: [4, 5, 6] },
        { id: 0x102, data: [7, 8] },
      ];

      const allCan = messages.every((m) => !('brs' in m) && !('esi' in m));
      expect(allCan, '所有报文应为 CAN 类型').to.be.true;
    });

    it('应支持纯 CANFD 报文数组', () => {
      const messages: CanFdMessage[] = [
        { id: 0x200, data: Buffer.alloc(32), brs: true },
        { id: 0x201, data: Buffer.alloc(64), brs: false, esi: true },
      ];

      const allCanfd = messages.every((m) => 'brs' in m || 'esi' in m);
      expect(allCanfd, '所有报文应为 CANFD 类型').to.be.true;
    });
  });
});
