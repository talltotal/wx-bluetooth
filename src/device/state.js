import {
  CONNECT_STATE_UNLINK,
  CONNECT_STATE_LINKING,
  CONNECT_STATE_LINKED,
  CONNECT_STATE_READY,
  CONNECT_STATE_UNLINING,
} from '../util/constants'

export function initState (dev) {
  /**
   * _connect 连接状态:
   * - -1 未连接
   * - 0 正在连接
   * - 1 已连接
   * - -2 正在断开
   * 
   * _writing 写状态：
   * - true 可读写
   * - false 正在写
   */
  dev._connect = CONNECT_STATE_UNLINK
  dev._writing = false
  dev._writeTimes = 0
}

export function stateMixin (Device) {
  Device.prototype._disconnect = function () {
    this._connect = CONNECT_STATE_UNLINING
    wx.closeBLEConnection({
      deviceId: this._deviceId
    })
  }

  Device.prototype._ready = function () {
    this._connect = CONNECT_STATE_READY
    this.trigger('ready')
    this._write()
  }

  Device.prototype._changeConnectState = function (connected) {
    const pre = this._connect
    if (connected && pre !== CONNECT_STATE_LINKED) {
      this._connect = CONNECT_STATE_LINKED
      if (this.trigger('connect')) {
        this._getService()
      }
    } else if (!connected && pre !== CONNECT_STATE_UNLINK) {
      dev._connect = CONNECT_STATE_UNLINK
      dev._writeTimes = 0
      this.trigger('disconnect')
    }
  }

  Device.prototype._startConnect = function () {
    this._connect = CONNECT_STATE_LINKING
  }

  Device.prototype.isConnected = function () {
    return this._connect === CONNECT_STATE_LINKED || this._connect === CONNECT_STATE_READY
  }

  Device.prototype.isReady = function () {
    return this._connect === CONNECT_STATE_READY
  }

  Device.prototype.isUnConnected = function () {
    return this._connect === CONNECT_STATE_UNLINK
  }
}