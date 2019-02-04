import { initState, stateMixin } from './state'
import { initBt, btMixin } from './bt'
import { initEvent, eventsMixin } from './event'

/**
 * 设备类
 * 
 */
export function Device ({ uid, deviceId }) {
  /**
   * 设备的两个唯一码
   */
  this._deviceId = deviceId
  this._uid = uid

  /**
   * 设备额外数据
   * 存储业务数据
   */
  this._data = null

  initBt(this)
  initState(this)
  initEvent(this)
}

Device.prototype.setDeviceId = function (deviceId) {
  this._deviceId = deviceId
}
Device.prototype.setData = function (data) {
  this._data = data
}

btMixin(Device)
stateMixin(Device)
eventsMixin(Device)