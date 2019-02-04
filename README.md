## use

配置项:
- searchTimeout 搜索超时时间：0-持续搜索直到停止；!0-毫秒数后停止搜索
- searchInterval 上报设备的间隔:0-找到新设备立即上报
- filterDevices() 对新找到的蓝牙设备的过滤函数，也可做排序等操作，
- getUid() 根据蓝牙设备信息，获取业务唯一码
- changeToValue() 发送蓝牙数据的业务处理函数
- changeBackValue() 收到蓝牙数据的业务处理函数

蓝牙事件：
- fail
  - 开启蓝牙失败
- timeout 搜索超时

设备事件：
- fail
  - FAIL_TYPE_CONNECT
  - FAIL_TYPE_SERVICE
  - FAIL_TYPE_CHARACTERISTIC
  - FAIL_TYPE_WRITE
- find 找到设备
- connect 连接
- ready 可通信
- disconnect 断开
- msg 收到消息

设备方法：
- setData(data) 绑定业务数据
- connect() 蓝牙连接
- disconnect() 断开连接
- isConnected() 蓝牙是否连接
- write(data) 发送蓝牙数据，在发送前会将data传入`options.changeToValue`获取最后的传输的字符串
- on(event, fn)
- off([event, fn])
- once(event, fn)
- trigger(event)


```js
import BT from '@talltotal/wx-bluetooth'

BT({
  searchTimeout: 30000,
  searchInterval: 4000,
  filterDevices (devs) {
    return devs
      .filter(item => item.name === 'My-Device')
      .sort((a,b) => (a.RSSI - b.RSSI))
  },
  getUid (dev) { return dev.deviceId },
  changeToValue (data) {
    if (data.encryption) {
      return encryption(data)
    } else {
      return data.str
    }
  },
  changeBackValue (str) { return str },
})
const dev123 = BT.get('123')
  .setData({
    key: '12321',
    admin: 'talltotal',
  })
  .once('find', () => {
    dev123.connect()
    dev123.write({
      str: 'hello world',
      encryption: false,
    })
  })

dev123.write({
  str: 'hello world',
  encryption: true,
})
```