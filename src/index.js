/**
 * 蓝牙使用
 * 1. 打开蓝牙适配器 - openBluetoothAdapter
 * 2. 搜索附近设备 - startBluetoothDevicesDiscovery
 * 3. 确认设备
 * 4. 连接设备 - createBLEConnection
 * 5. 获取 Service - getBLEDeviceServices
 * 6. 获取 Characteristics - getBLEDeviceCharacteristics === 连接上(双向认证成功算真正连接上)
 * 7. 通信
 *  1. 写 - writeBLECharacteristicValue: value
 *  2. 读 - onBLECharacteristicValueChange: res.value
 */
import { init, get } from './dt'
import { Options, DevicesMap, DevicesIdMap } from './share'
import { isObject } from './util/util'
import Emitter from './util/emitter'

export default function bt (options) {
  if (isObject(options)) {
    Object.keys(Options).forEach(key => {
      if (options.hasOwnProperty(key)) {
        Options[key] = options[key]
      }
    })
  }

  init()
}
bt.get = get

bt.options = Options
bt.devicesMap = DevicesMap
bt.devicesIdMap = DevicesIdMap

bt._listeners = Object.create(null)
Emitter(bt)
