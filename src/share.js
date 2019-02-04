/**
 * 统一维护的设备列表
 * 理解设备有两个唯一码：
 * 在微信方deviceId是设备唯一码；
 * 业务方可自定义根据蓝牙设备信息的其他规则所得的唯一码
 */
export const DevicesMap = {}
export const DevicesIdMap = {}

/**
 * 配置项
 * searchTimeout 搜索超时时间：0-持续搜索直到停止；!0-毫秒数后停止搜索
 * searchInterval 上报设备的间隔:0-找到新设备立即上报
 * filterDevices 对新找到的蓝牙设备的过滤函数，也可做排序等操作，
 * getUid 根据蓝牙设备信息，获取业务唯一码
 * changeToValue 发送蓝牙数据的业务处理函数
 * changeBackValue 收到蓝牙数据的业务处理函数
 */
export const Options = {
  searchTimeout: 60000,
  searchInterval: 4000,
  filterDevices (devs) { return devs },
  getUid (dev) { return dev.deviceId },
  changeToValue (data) { return data },
  changeBackValue (str) { return str },
}