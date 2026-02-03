# zlg-candevice

[中文文档](README.cn.md)

Node.js driver for ZLG CAN devices, using [koffi](https://koffi.dev/) to call ZLG official DLL library for CAN/CANFD data transmission and reception.

## Features

- Support for CAN and CANFD protocols
- Support for both x64 and x86 architectures
- TypeScript type support
- Device layer abstraction for simplified usage

## Supported Devices

- CANFD-WIFI-100U-TCP (Ethernet CANFD device)

## System Requirements

- Windows operating system
- Node.js 16+

## Installation

```bash
npm install git@github.com:larryonline/zlg-candevice.js.git
```

## Quick Start

```typescript
import { CanfdWifi100uTcp } from 'zlg-candevice';

// Create device instance
const device = new CanfdWifi100uTcp({
  ip: '192.168.1.100',
  port: 8000,
});

// Open device
device.open();

// Send CAN message
device.transmit({
  id: 0x123,
  data: [0x01, 0x02, 0x03, 0x04],
});

// Send CANFD message
device.transmit({
  id: 0x456,
  data: Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]),
  brs: true,  // Bit Rate Switch
});

// Receive messages
const messages = device.receive(100, 1000);  // Max 100 messages, 1000ms timeout
for (const msg of messages) {
  console.log(`ID: 0x${msg.id.toString(16)}, Data: ${msg.data.toString('hex')}`);
}

// Close device
device.close();
```

## API

### CanfdWifi100uTcp

Ethernet CANFD device class.

#### Constructor

```typescript
new CanfdWifi100uTcp(config: CanfdWifi100uTcpConfig)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ip | string | Yes | Device IP address |
| port | number | Yes | Working port |
| deviceIndex | number | No | Device index, default 0 |
| echo | boolean | No | Transmit echo, default true |

#### Methods

| Method | Description |
|--------|-------------|
| `open()` | Open device |
| `close()` | Close device |
| `isOpen()` | Check if device is open |
| `transmit(message)` | Send single message |
| `transmitBatch(messages)` | Send multiple messages |
| `receive(maxCount, timeout, type)` | Receive messages |
| `clearBuffer()` | Clear receive buffer |
| `getBufferCount(type)` | Get buffer message count |
| `addAutoSend(config)` | Add periodic send message |
| `applyAutoSend()` | Apply periodic send configuration |
| `clearAutoSend()` | Clear all periodic sends |
| `transmitQueue(items)` | Queue send messages (with delay) |
| `clearDelayQueue()` | Clear delay send queue |

### Message Types

```typescript
// CAN message
interface CanMessage {
  id: number;              // Message ID
  data: Buffer | number[]; // Data content
  isExtended?: boolean;    // Extended frame (29-bit ID)
  isRemote?: boolean;      // Remote frame
  timestamp?: bigint;      // Timestamp (valid on receive)
}

// CANFD message
interface CanFdMessage extends CanMessage {
  brs?: boolean;           // Bit Rate Switch
  esi?: boolean;           // Error State Indicator
}
```

## Architecture

```
src/
├── index.ts              # Entry point
├── driver/               # Driver layer - DLL interface wrapper
│   ├── index.ts          # Driver class
│   ├── types.ts          # Type definitions
│   ├── constants.ts      # Constants
│   ├── errors.ts         # Error handling
│   └── loader.ts         # DLL loader
└── device/               # Device layer - Device functionality wrapper
    ├── index.ts          # Device exports
    └── canfd-wifi-100u-tcp.ts  # CANFD-WIFI-100U-TCP device
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run unit tests
npm run test:unit

# Run hardware-in-the-loop tests (requires connected device)
npm run test:hil
```

## License

This project is licensed under the [BSD 3-Clause](LICENSE) license.

Note: The ZLG official DLL library used by this project has its own BSD 3-Clause license, see `libs/zlg_canlib/zlgcan License.txt`.
