# CANFD-WIFI-100U-TCP 设备接口

以太网 CANFD 设备驱动，通过 TCP 连接到 ZLG CANFD-WIFI-100U 设备。

## 约束

- 无法设置波特率和终端电阻（需在设备端配置）
- 以 TCP Client 模式连接到设备
- 仅支持单通道 (channel_0)
- 不支持 `isOnline` 接口

## 快速开始

```typescript
import { CanfdWifi100uTcp } from 'zlg-candevice';

const device = new CanfdWifi100uTcp({
  ip: '192.168.1.100',
  port: 8000,
});

// 打开设备
device.open();

// 发送 CAN 报文
device.transmit({
  id: 0x123,
  data: Buffer.from([0x01, 0x02, 0x03]),
});

// 接收报文
const messages = device.receive();

// 关闭设备
device.close();
```

## 配置选项

```typescript
interface CanfdWifi100uTcpConfig {
  ip: string;           // 设备 IP 地址
  port: number;         // 工作端口
  deviceIndex?: number; // 设备索引，默认 0
  echo?: boolean;       // 发送回显，默认 true
}
```

## 报文类型

### CAN 报文

```typescript
interface CanMessage {
  id: number;                      // 报文 ID
  data: Buffer | number[];         // 数据内容 (最大 8 字节)
  isExtended?: boolean;            // 扩展帧 (29-bit ID)
  isRemote?: boolean;              // 远程帧
  timestamp?: bigint | number;     // 时间戳 (接收时有效)
}
```

### CANFD 报文

```typescript
interface CanFdMessage extends CanMessage {
  brs?: boolean;  // 比特率切换
  esi?: boolean;  // 错误状态指示
}
```

CANFD 报文数据长度支持: 0-8, 12, 16, 20, 24, 32, 48, 64 字节。

## API 参考

### 设备状态管理

| 方法 | 说明 |
|------|------|
| `open()` | 打开设备并初始化通道 |
| `close()` | 关闭设备 |
| `isOpen()` | 检查设备是否已打开 |

### 报文收发

| 方法 | 说明 |
|------|------|
| `receive(maxCount?, timeout?, type?)` | 接收报文 |
| `transmit(message)` | 发送单条报文 |
| `transmitBatch(messages)` | 批量发送报文 |
| `clearBuffer()` | 清空接收缓冲区 |
| `getBufferCount(type?)` | 获取缓冲区报文数量 |

#### receive 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| maxCount | number | 100 | 最大接收数量 |
| timeout | number | 0 | 超时时间 (ms)，0 表示不等待 |
| type | MessageType | 'all' | 报文类型: 'can' / 'canfd' / 'all' |

### 周期发送

| 方法 | 说明 |
|------|------|
| `addAutoSend(config)` | 添加周期发送报文 |
| `applyAutoSend()` | 应用配置并开始发送 |
| `clearAutoSend()` | 清除所有周期发送 |
| `getAutoSendCount(isFd?)` | 获取周期发送报文数量 |
| `getAutoSendData(index, isFd?)` | 获取周期发送报文数据 |

#### AutoSendConfig

```typescript
interface AutoSendConfig {
  index: number;                      // 列表索引 (0-n)
  enable: boolean;                    // 是否启用
  interval: number;                   // 发送间隔 (ms)
  message: CanMessage | CanFdMessage; // 报文内容
}
```

#### 周期发送示例

```typescript
// 添加周期发送
device.addAutoSend({
  index: 0,
  enable: true,
  interval: 100,  // 100ms 间隔
  message: { id: 0x100, data: [0x01, 0x02] },
});

// 应用配置
device.applyAutoSend();

// 停止并清除
device.clearAutoSend();
```

### 队列发送

| 方法 | 说明 |
|------|------|
| `getAvailableTxCount()` | 获取发送队列可用长度 |
| `transmitQueue(items)` | 队列发送带延时的报文 |
| `clearDelayQueue()` | 清空延时发送队列 |

#### QueueSendItem

```typescript
interface QueueSendItem {
  message: CanMessage | CanFdMessage; // 报文内容
  delay: number;                      // 延时时间 (ms)
}
```

#### 队列发送示例

```typescript
// 发送带延时的报文序列
device.transmitQueue([
  { message: { id: 0x100, data: [0x01] }, delay: 0 },
  { message: { id: 0x101, data: [0x02] }, delay: 50 },  // 延时 50ms
  { message: { id: 0x102, data: [0x03] }, delay: 100 }, // 延时 100ms
]);
```

## 完整示例

### 基本收发

```typescript
import { CanfdWifi100uTcp } from 'zlg-candevice';

const device = new CanfdWifi100uTcp({
  ip: '192.168.1.100',
  port: 8000,
});

try {
  device.open();

  // 发送标准帧
  device.transmit({
    id: 0x123,
    data: [0x01, 0x02, 0x03, 0x04],
  });

  // 发送扩展帧
  device.transmit({
    id: 0x12345678,
    data: [0x01, 0x02],
    isExtended: true,
  });

  // 发送 CANFD 报文 (带 BRS)
  device.transmit({
    id: 0x200,
    data: Buffer.alloc(64, 0xAA),
    brs: true,
  });

  // 接收报文
  const messages = device.receive(100, 1000);
  for (const msg of messages) {
    console.log(`ID: 0x${msg.id.toString(16)}, Data: ${msg.data.toString('hex')}`);
  }
} finally {
  device.close();
}
```

### 批量发送

```typescript
const messages = [
  { id: 0x100, data: [0x01] },
  { id: 0x101, data: [0x02] },
  { id: 0x102, data: [0x03], brs: true }, // CANFD
];

const sent = device.transmitBatch(messages);
console.log(`成功发送 ${sent} 条报文`);
```

### 错误处理

```typescript
import { CanfdWifi100uTcp, ZlgCanError } from 'zlg-candevice';

try {
  device.open();
  device.transmit({ id: 0x123, data: [0x01] });
} catch (error) {
  if (error instanceof ZlgCanError) {
    console.error(`ZLG 错误: ${error.message}`);
  } else {
    throw error;
  }
}
```
