import { Options } from '../share'
import { connect, getService } from '../dt'
import { isIos, hexToArrayBuffer } from '../util/util'
import {
  FAIL_TYPE_CONNECT,
} from '../util/constants'

export function initBt (dev) {
  dev.deviceWR = null

  /**
   * 写队列
   */
  dev._writeQueue = []
}

export function btMixin (Device) {
  Device.prototype._receiveValue = function (str) {
    dev.trigger('msg', Options.changeBackValue(str))
  }

  Device.prototype.connect = function () {
    if (this.isUnConnected() && this._deviceId) {
      this._startConnect()
      connect(this._deviceId, () => {
        this._changeConnectState(true)
      },
      (err) => {
        this._changeConnectState(false)
        this.trigger('fail', FAIL_TYPE_CONNECT, err)
      })
    }
  }

  Device.prototype.disconnect = function () {
    this._disconnect()
  }

  Device.prototype._getService = function () {
    getService(this._deviceId)
  }

  Device.prototype._receiveWR = function (deviceWR) {
    this.deviceWR = deviceWR

    this._ready()
  }

  Device.prototype.write = function () {
    if (this.isUnConnected()) {
      this.connect()
    }

    if (this._writeTimes > 255) {
      console.error('write too many times!')
      this.trigger('fail', FAIL_TYPE_WRITE, 'write too many times!')

      wx.closeBLEConnection({
        deviceId
      })
      return
    }

    this._writeQueue.push([].slice(arguments, 0))
    this._write()
  }

  Device.prototype._write = function () {
    if (this.isReady() && !this._writing && this._writeQueue.length) {
      const data = Options.changeToValue(this._writeQueue.shift())
      this._subWrite(hexToArrayBuffer(data))
    }
  }

  Device.prototype._subWrite = function ({ buffer, length }) {
    const value = buffer.slice(0, 30)
    this._isWriting = true
    wx.writeBLECharacteristicValue({
      ...this.deviceWR,
      value,
      success: () => {
        if (length > 30) {
          isIos((is) => {
            const subBuffer = {
              buffer: buffer.slice(30),
              length: length - 30,
            }
            if (is) {
              this._subWrite(subBuffer)
            } else {
              setTimeout(() => {
                this._subWrite(subBuffer)
              }, 250)
            }
          })
        } else {
          /**
           * 发送完毕
           * 300之后才假装真的完成了
           */
          setTimeout(() => {
            this._isWriting = false
            this._qWrite()
          }, 300)
        }
      },
      fail: (res) => {
        /**
         * 当前包失败，重新发送
         * 直到发送完毕
         */
        console.log('writeBLECharacteristicValue fail', res.errMsg)
        this._subWrite({ buffer, length })
      }
    })
  }
}