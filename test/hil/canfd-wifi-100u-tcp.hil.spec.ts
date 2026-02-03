/**
 * CANFD-WIFI-100U-TCP HIL (Hardware-in-the-Loop) 测试
 *
 * 连接真实设备进行功能验证
 *
 * 测试环境:
 * - 设备: CANFD-WIFI-100U
 * - 连接: TCP/IP (client 模式)
 * - 外部设备: 需要另一台 CAN 设备配合接收测试
 */

import { expect } from 'chai';
import {
  CanfdWifi100uTcp,
  CanMessage,
  CanFdMessage,
  AutoSendConfig,
  QueueSendItem,
} from '../../src/device/canfd-wifi-100u-tcp';
import { skip } from 'node:test';

// ============================================================================
// 测试配置
// ============================================================================

const HIL_CONFIG = {
  ip: '10.10.10.178',
  port: 8000,
};

// 测试超时时间 (ms)
const TEST_TIMEOUT = 10000;
const DEVICE_OPERATION_DELAY = 100;

// 测试报文
const TEST_CAN_MSG: CanMessage = {
  id: 0x100,
  data: [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08],
};

const TEST_CAN_EXT_MSG: CanMessage = {
  id: 0x12345678,
  data: [0xAA, 0xBB, 0xCC, 0xDD],
  isExtended: true,
};

const TEST_CANFD_MSG: CanFdMessage = {
  id: 0x200,
  data: Buffer.alloc(32, 0x55),
  brs: true,
};

const TEST_CANFD_64_MSG: CanFdMessage = {
  id: 0x300,
  data: Buffer.alloc(64, 0xAA),
  brs: true,
  esi: false,
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 延时函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// HIL 测试
// ============================================================================

describe('CANFD-WIFI-100U-TCP HIL 测试', function () {
  // 设置全局超时
  this.timeout(TEST_TIMEOUT);

  let device: CanfdWifi100uTcp;

  beforeEach(() => {
    device = new CanfdWifi100uTcp(HIL_CONFIG);
  });

  afterEach(() => {
    // 确保设备关闭
    try {
      device.close();
    } catch {
      // 忽略关闭错误
    }
  });

  // ==========================================================================
  // 设备状态管理
  // ==========================================================================

  describe('设备状态管理', () => {
    it('应能成功打开设备', async () => {
      device.open();
      expect(device.isOpen(), '设备应处于打开状态').to.be.true;
    });

    it('重复打开设备不应报错', async () => {
      device.open();
      expect(() => device.open(), '重复打开不应抛出异常').to.not.throw();
      expect(device.isOpen(), '设备应保持打开状态').to.be.true;
    });

    it('应能成功关闭设备', async () => {
      device.open();
      device.close();
      expect(device.isOpen(), '设备应处于关闭状态').to.be.false;
    });

    it('关闭后应能重新打开设备', async () => {
      device.open();
      device.close();
      device.open();
      expect(device.isOpen(), '设备应处于打开状态').to.be.true;
    });

    it('关闭未打开的设备不应报错', () => {
      expect(() => device.close(), '关闭未打开的设备不应抛出异常').to.not.throw();
    });
  });

  // ==========================================================================
  // 发送功能
  // ==========================================================================

  describe('发送功能', () => {
    beforeEach(() => {
      device.open();
    });

    it('应能发送单条 CAN 标准帧', async () => {
      expect(() => device.transmit(TEST_CAN_MSG), '发送 CAN 标准帧不应抛出异常').to.not.throw();
      await delay(DEVICE_OPERATION_DELAY);
    });

    it('应能发送单条 CAN 扩展帧', async () => {
      expect(() => device.transmit(TEST_CAN_EXT_MSG), '发送 CAN 扩展帧不应抛出异常').to.not.throw();
      await delay(DEVICE_OPERATION_DELAY);
    });

    it('应能发送单条 CANFD 报文 (32字节)', async () => {
      expect(() => device.transmit(TEST_CANFD_MSG), '发送 CANFD 报文不应抛出异常').to.not.throw();
      await delay(DEVICE_OPERATION_DELAY);
    });

    it('应能发送单条 CANFD 报文 (64字节)', async () => {
      expect(() => device.transmit(TEST_CANFD_64_MSG), '发送 64 字节 CANFD 报文不应抛出异常').to.not.throw();
      await delay(DEVICE_OPERATION_DELAY);
    });

    it('应能批量发送 CAN 报文', async () => {
      const messages: CanMessage[] = [
        { id: 0x101, data: [0x01] },
        { id: 0x102, data: [0x02, 0x03] },
        { id: 0x103, data: [0x04, 0x05, 0x06] },
      ];

      const sent = device.transmitBatch(messages);
      expect(sent, `批量发送应成功，期望 ${messages.length}，实际 ${sent}`).to.equal(messages.length);
      await delay(DEVICE_OPERATION_DELAY);
    });

    it('应能批量发送 CANFD 报文', async () => {
      const messages: CanFdMessage[] = [
        { id: 0x201, data: Buffer.alloc(16, 0x11), brs: true },
        { id: 0x202, data: Buffer.alloc(32, 0x22), brs: true },
      ];

      const sent = device.transmitBatch(messages);
      expect(sent, `批量发送应成功，期望 ${messages.length}，实际 ${sent}`).to.equal(messages.length);
      await delay(DEVICE_OPERATION_DELAY);
    });

    it('应能批量发送混合报文 (CAN + CANFD)', async () => {
      const messages: (CanMessage | CanFdMessage)[] = [
        { id: 0x110, data: [0x01, 0x02, 0x03] },
        { id: 0x210, data: Buffer.alloc(24, 0x44), brs: true },
        { id: 0x111, data: [0x04, 0x05] },
        { id: 0x211, data: Buffer.alloc(48, 0x55), brs: false, esi: false },
      ];

      const sent = device.transmitBatch(messages);
      expect(sent, `批量发送应成功，期望 ${messages.length}，实际 ${sent}`).to.equal(messages.length);
      await delay(DEVICE_OPERATION_DELAY);
    });

    it('批量发送空数组应返回 0', () => {
      const sent = device.transmitBatch([]);
      expect(sent, '发送空数组应返回 0').to.equal(0);
    });
  });

  // ==========================================================================
  // 缓冲区操作
  // ==========================================================================

  describe('缓冲区操作', () => {
    beforeEach(() => {
      device.open();
    });

    it('应能查询 CAN 缓冲区数量', () => {
      const count = device.getBufferCount('can');
      expect(count, `CAN 缓冲区数量应为非负数，实际: ${count}`).to.be.at.least(0);
    });

    it('应能查询 CANFD 缓冲区数量', () => {
      const count = device.getBufferCount('canfd');
      expect(count, `CANFD 缓冲区数量应为非负数，实际: ${count}`).to.be.at.least(0);
    });

    it('应能查询全部缓冲区数量', () => {
      const canCount = device.getBufferCount('can');
      const canfdCount = device.getBufferCount('canfd');
      const allCount = device.getBufferCount('all');

      expect(
        allCount,
        `全部数量 (${allCount}) 应等于 CAN (${canCount}) + CANFD (${canfdCount})`,
      ).to.equal(canCount + canfdCount);
    });

    it('默认参数应查询全部缓冲区数量', () => {
      const allCount = device.getBufferCount('all');
      const defaultCount = device.getBufferCount();

      expect(defaultCount, `默认查询结果 (${defaultCount}) 应等于 all (${allCount})`).to.equal(allCount);
    });

    it('应能清空缓冲区', () => {
      expect(() => device.clearBuffer(), '清空缓冲区不应抛出异常').to.not.throw();
    });

    it('清空后缓冲区数量应为 0', async () => {
      device.clearBuffer();
      await delay(DEVICE_OPERATION_DELAY);

      const count = device.getBufferCount();
      expect(count, `清空后缓冲区数量应为 0，实际: ${count}`).to.equal(0);
    });
  });

  // ==========================================================================
  // 周期发送
  // ==========================================================================

  describe('周期发送', () => {
    beforeEach(() => {
      device.open();
      // 清除之前的周期发送配置
      try {
        device.clearAutoSend();
      } catch {
        // 忽略错误
      }
    });

    afterEach(async () => {
      // 清除周期发送
      try {
        device.clearAutoSend();
        await delay(DEVICE_OPERATION_DELAY);
      } catch {
        // 忽略错误
      }
    });

    it('应能添加 CAN 周期报文', () => {
      const config: AutoSendConfig = {
        index: 0,
        enable: true,
        interval: 100,
        message: { id: 0x400, data: [0x01, 0x02, 0x03, 0x04] },
      };

      expect(() => device.addAutoSend(config), '添加 CAN 周期报文不应抛出异常').to.not.throw();
    });

    it('应能添加 CANFD 周期报文', () => {
      const config: AutoSendConfig = {
        index: 1,
        enable: true,
        interval: 200,
        message: { id: 0x500, data: Buffer.alloc(32, 0xAA), brs: true },
      };

      expect(() => device.addAutoSend(config), '添加 CANFD 周期报文不应抛出异常').to.not.throw();
    });

    it('应能添加多个周期报文', () => {
      const configs: AutoSendConfig[] = [
        { index: 0, enable: true, interval: 100, message: { id: 0x401, data: [0x01] } },
        { index: 1, enable: true, interval: 150, message: { id: 0x402, data: [0x02] } },
        { index: 2, enable: true, interval: 200, message: { id: 0x403, data: [0x03] } },
      ];

      for (const config of configs) {
        expect(() => device.addAutoSend(config), `添加索引 ${config.index} 的周期报文不应抛出异常`).to.not.throw();
      }
    });

    it('应能应用周期发送', async () => {
      const config: AutoSendConfig = {
        index: 0,
        enable: true,
        interval: 100,
        message: { id: 0x410, data: [0x11, 0x22, 0x33] },
      };

      device.addAutoSend(config);
      expect(() => device.applyAutoSend(), '应用周期发送不应抛出异常').to.not.throw();

      // 等待一段时间让周期发送生效
      await delay(500);
    });

    it('应能清除周期发送', async () => {
      const config: AutoSendConfig = {
        index: 0,
        enable: true,
        interval: 100,
        message: { id: 0x420, data: [0x44, 0x55] },
      };

      device.addAutoSend(config);
      device.applyAutoSend();
      await delay(200);

      expect(() => device.clearAutoSend(), '清除周期发送不应抛出异常').to.not.throw();
    });

    it('应能查询 CAN 周期发送数量', () => {
      const count = device.getAutoSendCount(false);
      expect(count, `CAN 周期发送数量应为非负数，实际: ${count}`).to.be.at.least(0);
    });

    it('应能查询 CANFD 周期发送数量', () => {
      const count = device.getAutoSendCount(true);
      expect(count, `CANFD 周期发送数量应为非负数，实际: ${count}`).to.be.at.least(0);
    });
  });

  // ==========================================================================
  // 队列发送
  // ==========================================================================

  describe('队列发送', () => {
    beforeEach(() => {
      device.open();
    });

    afterEach(async () => {
      // 清空延时队列
      try {
        device.clearDelayQueue();
        await delay(DEVICE_OPERATION_DELAY);
      } catch {
        // 忽略错误
      }
    });

    it('应能查询可用队列长度', () => {
      const count = device.getAvailableTxCount();
      expect(count, `可用队列长度应为非负数，实际: ${count}`).to.be.at.least(0);
    });

    it('应能队列发送报文', async () => {
      const items: QueueSendItem[] = [
        { message: { id: 0x600, data: [0x01] }, delay: 0 },
        { message: { id: 0x601, data: [0x02] }, delay: 10 },
        { message: { id: 0x602, data: [0x03] }, delay: 20 },
      ];

      const sent = device.transmitQueue(items);
      expect(sent, `队列发送应成功，期望 ${items.length}，实际 ${sent}`).to.equal(items.length);
      await delay(100);
    });

    it('应能队列发送 CANFD 报文', async () => {
      const items: QueueSendItem[] = [
        { message: { id: 0x700, data: Buffer.alloc(16, 0x11), brs: true }, delay: 0 },
        { message: { id: 0x701, data: Buffer.alloc(32, 0x22), brs: true }, delay: 50 },
      ];

      const sent = device.transmitQueue(items);
      expect(sent, `队列发送应成功，期望 ${items.length}，实际 ${sent}`).to.equal(items.length);
      await delay(200);
    });

    it('应能清空延时队列', () => {
      expect(() => device.clearDelayQueue(), '清空延时队列不应抛出异常').to.not.throw();
    });
  });

  // ==========================================================================
  // 接收功能 [需要外部设备发送]
  // ==========================================================================

  describe('接收功能 [需要外部设备发送]', () => {
    beforeEach(() => {
      device.open();
      device.clearBuffer();
    });

    it('receive 方法应能正常调用', () => {
      const messages = device.receive(100, 0);
      expect(Array.isArray(messages), 'receive 应返回数组').to.be.true;
    });

    it('receive 应支持 type 参数 (can)', () => {
      const messages = device.receive(100, 0, 'can');
      expect(Array.isArray(messages), 'receive(can) 应返回数组').to.be.true;
    });

    it('receive 应支持 type 参数 (canfd)', () => {
      const messages = device.receive(100, 0, 'canfd');
      expect(Array.isArray(messages), 'receive(canfd) 应返回数组').to.be.true;
    });

    it('receive 应支持 type 参数 (all)', () => {
      const messages = device.receive(100, 0, 'all');
      expect(Array.isArray(messages), 'receive(all) 应返回数组').to.be.true;
    });

    // 以下测试需要外部设备配合发送报文
    // 如果没有外部设备，这些测试会因为没有收到报文而跳过验证

    it('[交互] 应能接收外部发送的 CAN 报文', async function () {
      console.log('    请使用外部设备发送 CAN 报文...');
      await delay(3000);

      const messages = device.receive(100, 0, 'can');
      if (messages.length > 0) {
        console.log(`    收到 ${messages.length} 条 CAN 报文`);
        const msg = messages[0];
        expect(msg.id, '报文 ID 应为数字').to.be.a('number');
        expect(msg.data, '报文数据应存在').to.exist;
      } else {
        console.log('    未收到报文 (如果没有外部设备发送，这是正常的)');
      }
    });

    it('[交互] 应能接收外部发送的 CANFD 报文', async function () {
      console.log('    请使用外部设备发送 CANFD 报文...');
      await delay(3000);

      const messages = device.receive(100, 0, 'canfd');
      if (messages.length > 0) {
        console.log(`    收到 ${messages.length} 条 CANFD 报文`);
        const msg = messages[0] as CanFdMessage;
        expect(msg.id, '报文 ID 应为数字').to.be.a('number');
        expect(msg.data, '报文数据应存在').to.exist;
        expect('brs' in msg || 'esi' in msg, '应为 CANFD 报文').to.be.true;
      } else {
        console.log('    未收到报文 (如果没有外部设备发送，这是正常的)');
      }
    });
  });
});
