# zlg-candevice

ZLG CAN 设备 Node.js 驱动，使用 [koffi](https://koffi.dev/) 调用 ZLG 官方 DLL 库实现 CAN/CANFD 数据收发。

## 特性

- 支持 CAN 和 CANFD 协议
- 支持 x64 和 x86 双架构
- TypeScript 类型支持
- 设备层封装，简化使用

## 支持设备

- CANFD-WIFI-100U-TCP (以太网 CANFD 设备)

## 系统要求

- Windows 操作系统
- Node.js 16+

## 安装

```bash
npm install git@github.com:larryonline/zlg-candevice.js.git
```

## 快速开始

```typescript
import { CanfdWifi100uTcp } from 'zlg-candevice';

// 创建设备实例
const device = new CanfdWifi100uTcp({
  ip: '192.168.1.100',
  port: 8000,
});

// 打开设备
device.open();

// 发送 CAN 报文
device.transmit({
  id: 0x123,
  data: [0x01, 0x02, 0x03, 0x04],
});

// 发送 CANFD 报文
device.transmit({
  id: 0x456,
  data: Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]),
  brs: true,  // 比特率切换
});

// 接收报文
const messages = device.receive(100, 1000);  // 最多 100 条，超时 1000ms
for (const msg of messages) {
  console.log(`ID: 0x${msg.id.toString(16)}, Data: ${msg.data.toString('hex')}`);
}

// 关闭设备
device.close();
```

## API

### CanfdWifi100uTcp

以太网 CANFD 设备类。

#### 构造函数

```typescript
new CanfdWifi100uTcp(config: CanfdWifi100uTcpConfig)
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ip | string | 是 | 设备 IP 地址 |
| port | number | 是 | 工作端口 |
| deviceIndex | number | 否 | 设备索引，默认 0 |
| echo | boolean | 否 | 发送回显，默认 true |

#### 方法

| 方法 | 说明 |
|------|------|
| `open()` | 打开设备 |
| `close()` | 关闭设备 |
| `isOpen()` | 检查设备是否已打开 |
| `transmit(message)` | 发送单条报文 |
| `transmitBatch(messages)` | 批量发送报文 |
| `receive(maxCount, timeout, type)` | 接收报文 |
| `clearBuffer()` | 清空接收缓冲区 |
| `getBufferCount(type)` | 获取缓冲区报文数量 |
| `addAutoSend(config)` | 添加周期发送报文 |
| `applyAutoSend()` | 应用周期发送配置 |
| `clearAutoSend()` | 清除所有周期发送 |
| `transmitQueue(items)` | 队列发送报文（带延时） |
| `clearDelayQueue()` | 清空延时发送队列 |

### 报文类型

```typescript
// CAN 报文
interface CanMessage {
  id: number;              // 报文 ID
  data: Buffer | number[]; // 数据内容
  isExtended?: boolean;    // 是否为扩展帧 (29-bit ID)
  isRemote?: boolean;      // 是否为远程帧
  timestamp?: bigint;      // 时间戳 (接收时有效)
}

// CANFD 报文
interface CanFdMessage extends CanMessage {
  brs?: boolean;           // 比特率切换
  esi?: boolean;           // 错误状态指示
}
```

## 架构

```
src/
├── index.ts              # 入口文件
├── driver/               # 驱动层 - DLL 接口封装
│   ├── index.ts          # 驱动类
│   ├── types.ts          # 类型定义
│   ├── constants.ts      # 常量定义
│   ├── errors.ts         # 错误处理
│   └── loader.ts         # DLL 加载器
└── device/               # 设备层 - 设备功能封装
    ├── index.ts          # 设备导出
    └── canfd-wifi-100u-tcp.ts  # CANFD-WIFI-100U-TCP 设备
```

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行单元测试
npm run test:unit

# 运行硬件在环测试 (需要连接设备)
npm run test:hil
```

## 许可证

本项目采用 [BSD 3-Clause](LICENSE) 许可证。

注意：本项目依赖的 ZLG 官方 DLL 库有独立的 BSD 3-Clause 许可证，详见 `libs/zlg_canlib/zlgcan License.txt`。
