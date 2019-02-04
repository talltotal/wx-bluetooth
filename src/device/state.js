const CONNECT_STATE_UNLINK = -1
const CONNECT_STATE_LINKING = 0
const CONNECT_STATE_LINKED = 1

export function initState (dev) {
  /**
   * _connect 连接状态:
   * - -1 未连接
   * - 0 正在连接
   * - 1 已连接
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
  Device.prototype.changeConnectState = function (connected) {
    const pre = this._connect
    if (connected && pre !== CONNECT_STATE_LINKED) {
      this._connect = CONNECT_STATE_LINKED
      if (this.trigger('connect')) {
        this.getService()
      }
    } else if (!connected && pre !== CONNECT_STATE_UNLINK) {
      dev._connect = CONNECT_STATE_UNLINK
      dev._writeTimes = 0
      this.trigger('disconnect')
    }
  }

  Device.prototype.startConnect = function () {
    this._connect = CONNECT_STATE_LINKING
  }

  Device.prototype.isConnected = function () {
    return this._connect === CONNECT_STATE_LINKED
  }

  Device.prototype.isUnConnected = function () {
    return this._connect === CONNECT_STATE_UNLINK
  }
}