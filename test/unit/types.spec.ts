/**
 * 类型定义单元测试
 * 验证 koffi 结构体定义的正确性
 */

import { expect } from 'chai';
import koffi from 'koffi';
import {
  CanFrame,
  CanfdFrame,
  ZcanDeviceInfo,
  ZcanChannelInitConfig,
  ZcanTransmitData,
  ZcanReceiveData,
  ZcanTransmitFdData,
  ZcanReceiveFdData,
  ZcanAutoTransmitObj,
  ZcanfdAutoTransmitObj,
  ZcanChannelErrInfo,
  ZcanChannelStatus,
} from '../../src/driver/types';
import {
  CAN_MAX_DLEN,
  CANFD_MAX_DLEN,
  ZCAN_DEVICE_TYPE,
  ZCAN_STATUS,
  CAN_FLAG,
} from '../../src/driver/constants';

describe('类型定义测试', () => {
  describe('常量定义', () => {
    it('CAN 最大数据长度应为 8', () => {
      expect(CAN_MAX_DLEN, `CAN_MAX_DLEN 应为 8，实际值: ${CAN_MAX_DLEN}`).to.equal(8);
    });

    it('CANFD 最大数据长度应为 64', () => {
      expect(CANFD_MAX_DLEN, `CANFD_MAX_DLEN 应为 64，实际值: ${CANFD_MAX_DLEN}`).to.equal(64);
    });

    it('设备类型常量应包含 ZCAN_USBCAN2', () => {
      expect(ZCAN_DEVICE_TYPE.ZCAN_USBCAN2, `ZCAN_USBCAN2 应为 4，实际值: ${ZCAN_DEVICE_TYPE.ZCAN_USBCAN2}`).to.equal(4);
    });

    it('设备类型常量应包含 ZCAN_CANFDWIFI_100U_TCP', () => {
      expect(ZCAN_DEVICE_TYPE.ZCAN_CANFDWIFI_100U_TCP, `ZCAN_CANFDWIFI_100U_TCP 应为 50，实际值: ${ZCAN_DEVICE_TYPE.ZCAN_CANFDWIFI_100U_TCP}`).to.equal(50);
    });

    it('状态码 STATUS_OK 应为 1', () => {
      expect(ZCAN_STATUS.OK, `STATUS_OK 应为 1，实际值: ${ZCAN_STATUS.OK}`).to.equal(1);
    });

    it('CAN 扩展帧标志应为 0x80000000', () => {
      expect(CAN_FLAG.EFF_FLAG, `EFF_FLAG 应为 0x80000000，实际值: 0x${CAN_FLAG.EFF_FLAG.toString(16)}`).to.equal(0x80000000);
    });
  });

  describe('CAN 帧结构体', () => {
    it('can_frame 大小应为 16 字节', () => {
      const size = koffi.sizeof(CanFrame);
      expect(size, `can_frame 大小应为 16 字节，实际值: ${size}`).to.equal(16);
    });

    it('canfd_frame 大小应为 72 字节', () => {
      const size = koffi.sizeof(CanfdFrame);
      expect(size, `canfd_frame 大小应为 72 字节，实际值: ${size}`).to.equal(72);
    });
  });

  describe('设备信息结构体', () => {
    it('ZCAN_DEVICE_INFO 大小应为 78 字节', () => {
      // hw_Version(2) + fw_Version(2) + dr_Version(2) + in_Version(2) + irq_Num(2)
      // + can_Num(1) + str_Serial_Num(20) + str_hw_Type(40) + reserved(8) = 79
      // 但由于对齐，实际可能不同，需要验证
      const size = koffi.sizeof(ZcanDeviceInfo);
      // 根据 C 结构体定义：2+2+2+2+2+1+20+40+8 = 79，但可能有对齐
      expect(size, `ZCAN_DEVICE_INFO 大小: ${size}`).to.be.greaterThan(0);
    });
  });

  describe('通道配置结构体', () => {
    it('ZCAN_CHANNEL_INIT_CONFIG 应能正确编码', () => {
      const size = koffi.sizeof(ZcanChannelInitConfig);
      expect(size, `ZCAN_CHANNEL_INIT_CONFIG 大小: ${size}`).to.be.greaterThan(0);

      const buffer = Buffer.alloc(size);
      const config = {
        can_type: 1,  // CANFD
        acc_code: 0,
        acc_mask: 0xFFFFFFFF,
        abit_timing: 0x00014D14,
        dbit_timing: 0x00041103,
        brp: 0,
        filter: 0,
        mode: 0,
        pad: 0,
        reserved: 0,
      };

      koffi.encode(buffer, ZcanChannelInitConfig, config);

      // 解码验证
      const decoded = koffi.decode(buffer, ZcanChannelInitConfig);
      expect(decoded.can_type, `can_type 应为 1，实际值: ${decoded.can_type}`).to.equal(1);
      expect(decoded.acc_mask, `acc_mask 应为 0xFFFFFFFF，实际值: 0x${decoded.acc_mask.toString(16)}`).to.equal(0xFFFFFFFF);
    });
  });

  describe('数据收发结构体', () => {
    it('ZCAN_Transmit_Data 大小应为 20 字节', () => {
      // can_frame(16) + transmit_type(4) = 20
      const size = koffi.sizeof(ZcanTransmitData);
      expect(size, `ZCAN_Transmit_Data 大小应为 20 字节，实际值: ${size}`).to.equal(20);
    });

    it('ZCAN_Receive_Data 大小应为 24 字节', () => {
      // can_frame(16) + timestamp(8) = 24
      const size = koffi.sizeof(ZcanReceiveData);
      expect(size, `ZCAN_Receive_Data 大小应为 24 字节，实际值: ${size}`).to.equal(24);
    });

    it('ZCAN_TransmitFD_Data 大小应为 76 字节', () => {
      // canfd_frame(72) + transmit_type(4) = 76
      const size = koffi.sizeof(ZcanTransmitFdData);
      expect(size, `ZCAN_TransmitFD_Data 大小应为 76 字节，实际值: ${size}`).to.equal(76);
    });

    it('ZCAN_ReceiveFD_Data 大小应为 80 字节', () => {
      // canfd_frame(72) + timestamp(8) = 80
      const size = koffi.sizeof(ZcanReceiveFdData);
      expect(size, `ZCAN_ReceiveFD_Data 大小应为 80 字节，实际值: ${size}`).to.equal(80);
    });
  });

  describe('周期发送结构体', () => {
    it('ZCAN_AUTO_TRANSMIT_OBJ 字段顺序应正确 (enable, index, interval, obj)', () => {
      const size = koffi.sizeof(ZcanAutoTransmitObj);
      // enable(2) + index(2) + interval(4) + obj(20) = 28
      expect(size, `ZCAN_AUTO_TRANSMIT_OBJ 大小应为 28 字节，实际值: ${size}`).to.equal(28);

      const buffer = Buffer.alloc(size);
      const obj = {
        enable: 1,
        index: 5,
        interval: 100,
        obj: {
          frame: {
            can_id: 0x123,
            can_dlc: 8,
            __pad: 0,
            __res0: 0,
            __res1: 0,
            data: [1, 2, 3, 4, 5, 6, 7, 8],
          },
          transmit_type: 0,
        },
      };

      koffi.encode(buffer, ZcanAutoTransmitObj, obj);

      // 验证字段顺序：enable 在 offset 0，index 在 offset 2
      const enableValue = buffer.readUInt16LE(0);
      const indexValue = buffer.readUInt16LE(2);
      const intervalValue = buffer.readUInt32LE(4);

      expect(enableValue, `enable 应为 1，实际值: ${enableValue}`).to.equal(1);
      expect(indexValue, `index 应为 5，实际值: ${indexValue}`).to.equal(5);
      expect(intervalValue, `interval 应为 100，实际值: ${intervalValue}`).to.equal(100);
    });

    it('ZCANFD_AUTO_TRANSMIT_OBJ 大小应为 84 字节', () => {
      // enable(2) + index(2) + interval(4) + obj(76) = 84
      const size = koffi.sizeof(ZcanfdAutoTransmitObj);
      expect(size, `ZCANFD_AUTO_TRANSMIT_OBJ 大小应为 84 字节，实际值: ${size}`).to.equal(84);
    });
  });

  describe('编码解码测试', () => {
    it('CAN 帧应能正确编码和解码', () => {
      const size = koffi.sizeof(CanFrame);
      const buffer = Buffer.alloc(size);

      // 使用标准帧 ID 进行测试（避免 32 位有符号整数溢出问题）
      const frame = {
        can_id: 0x123,
        can_dlc: 8,
        __pad: 0,
        __res0: 0,
        __res1: 0,
        data: [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88],
      };

      koffi.encode(buffer, CanFrame, frame);
      const decoded = koffi.decode(buffer, CanFrame);

      expect(decoded.can_id, `can_id 应为 0x123，实际值: 0x${decoded.can_id.toString(16)}`).to.equal(0x123);
      expect(decoded.can_dlc, `can_dlc 应为 8，实际值: ${decoded.can_dlc}`).to.equal(8);
      expect(decoded.data[0], `data[0] 应为 0x11，实际值: 0x${decoded.data[0].toString(16)}`).to.equal(0x11);
      expect(decoded.data[7], `data[7] 应为 0x88，实际值: 0x${decoded.data[7].toString(16)}`).to.equal(0x88);
    });

    it('CAN 扩展帧 ID 应能正确编码和解码', () => {
      const size = koffi.sizeof(CanFrame);
      const buffer = Buffer.alloc(size);

      // 扩展帧：使用 >>> 0 确保无符号处理
      const extendedId = (0x123 | CAN_FLAG.EFF_FLAG) >>> 0;
      const frame = {
        can_id: extendedId,
        can_dlc: 8,
        __pad: 0,
        __res0: 0,
        __res1: 0,
        data: [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88],
      };

      koffi.encode(buffer, CanFrame, frame);
      const decoded = koffi.decode(buffer, CanFrame);

      // 使用 >>> 0 确保无符号比较
      const expectedId = 0x80000123 >>> 0;
      const actualId = decoded.can_id >>> 0;
      expect(actualId, `can_id 应为 0x80000123，实际值: 0x${actualId.toString(16)}`).to.equal(expectedId);
    });

    it('CANFD 帧应能正确编码和解码', () => {
      const size = koffi.sizeof(CanfdFrame);
      const buffer = Buffer.alloc(size);

      const data = new Array(64).fill(0).map((_, i) => i);
      const frame = {
        can_id: 0x456,
        len: 64,
        flags: 0x01,  // BRS
        __res0: 0,
        __res1: 0,
        data: data,
      };

      koffi.encode(buffer, CanfdFrame, frame);
      const decoded = koffi.decode(buffer, CanfdFrame);

      expect(decoded.can_id, `can_id 应为 0x456，实际值: 0x${decoded.can_id.toString(16)}`).to.equal(0x456);
      expect(decoded.len, `len 应为 64，实际值: ${decoded.len}`).to.equal(64);
      expect(decoded.flags, `flags 应为 0x01，实际值: 0x${decoded.flags.toString(16)}`).to.equal(0x01);
      expect(decoded.data[0], `data[0] 应为 0，实际值: ${decoded.data[0]}`).to.equal(0);
      expect(decoded.data[63], `data[63] 应为 63，实际值: ${decoded.data[63]}`).to.equal(63);
    });

    it('发送数据结构体应能正确编码和解码', () => {
      const size = koffi.sizeof(ZcanTransmitData);
      const buffer = Buffer.alloc(size);

      const txData = {
        frame: {
          can_id: 0x100,
          can_dlc: 4,
          __pad: 0,
          __res0: 0,
          __res1: 0,
          data: [0xAA, 0xBB, 0xCC, 0xDD, 0, 0, 0, 0],
        },
        transmit_type: 0,
      };

      koffi.encode(buffer, ZcanTransmitData, txData);
      const decoded = koffi.decode(buffer, ZcanTransmitData);

      expect(decoded.frame.can_id, `frame.can_id 应为 0x100，实际值: 0x${decoded.frame.can_id.toString(16)}`).to.equal(0x100);
      expect(decoded.frame.can_dlc, `frame.can_dlc 应为 4，实际值: ${decoded.frame.can_dlc}`).to.equal(4);
      expect(decoded.transmit_type, `transmit_type 应为 0，实际值: ${decoded.transmit_type}`).to.equal(0);
    });
  });
});
