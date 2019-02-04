
export const WX_ERR_CORD = {
  '10000': '未初始化蓝牙适配器',
  '10001': '当前蓝牙适配器不可用',
  '10002': '没有找到指定设备',
  '10003': '连接失败',
  '10004': '没有找到指定服务',
  '10005': '没有找到指定特征值',
  '10006': '当前连接已断开',
  '10007': '当前特征值不支持此操作',
  '10008': '其余所有系统上报的异常',
  '10009': '系统版本低于 4.3 不支持BLE',
}

export const FAIL_TYPE_CONNECT = 1
export const FAIL_TYPE_SERVICE = 2
export const FAIL_TYPE_CHARACTERISTIC = 3
export const FAIL_TYPE_WRITE = 4

export const CONNECT_STATE_UNLINK = -1
export const CONNECT_STATE_LINKING = 0
export const CONNECT_STATE_LINKED = 1
export const CONNECT_STATE_READY = 3
export const CONNECT_STATE_UNLINING = -2
