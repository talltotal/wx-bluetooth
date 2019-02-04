import { Options, DevicesMap, DevicesIdMap } from './share'
import { Device } from './device/index'
import BT from './index'
import { arrayBufferToHex } from './util/util'

let isInitBt = false
let isSearching = false
let searchTimeoutId = null

export function init () {
  if (isInitBt) return

  // 1. 打开蓝牙适配器
  openAdapter()

  // 2. 增加监听器
  addListener()

  isInitBt = true
}

export function openAdapter () {
  wx.openBluetoothAdapter({
    success: res => {
      console.log('openBluetoothAdapter success', res)
    },
    fail: res => {
      console.log('openBluetoothAdapter fail', res)
      BT.trigger('fail', '开启蓝牙失败', 1)
      if (res.errCode === 10001) {
        _checkBluetooth()
      } else {
        wx.showToast({ icon: 'none', title: res.errMsg || '开启蓝牙失败' })
      }
    }
  })
}

export function addListener () {
  // 1 找到设备
  wx.onBluetoothDeviceFound(({ devices }) => {
    if (!isSearching) return

    devices = Options.filterDevice(devices)

    const len = devices.length
    for (let i = 0; i < len; i ++) {
      const dev = devices[i]
      const deviceId = dev.deviceId
      if (!DevicesMap[deviceId] && Options.canAdd2DeivceMap(dev)) {
        const uid = Options.getUid(dev)
        let newDevInst = null
        if (DevicesIdMap[uid]) {
          newDevInst = DevicesIdMap[uid]
          newDevInst.setDeviceId(deviceId)
        } else {
          newDevInst = new Device({ uid, deviceId })
          DevicesIdMap[uid] = newDevInst
        }
        DevicesMap[deviceId] = newDevInst
        newDevInst.trigger('find')
      }
    }
  })

  // 2 设备蓝牙状态变更
  wx.onBLEConnectionStateChange(({ deviceId, connected }) => {
    const dev = DevicesMap[deviceId]
    if (!dev) return

    dev.changeConnectState(connected)
  })

  // 3 蓝牙适配器状态变更
  wx.onBluetoothAdapterStateChange((res) => {
    console.log('onBluetoothAdapterStateChange', res)
    if (res.available) {
      this.available = true
    }
    if (res.available && res.discovering && this.listenChange) {
      this.listenChange = false
      this._startBluetoothDevicesDiscovery()
    }
  })

  // 4 获取到蓝牙数据
  wx.onBLECharacteristicValueChange(({ value, deviceId }) => {
    const dev = DevicesMap[deviceId]

    if (!dev) return

    const str = arrayBufferToHex(value)
    dev.trigger('msg', Options.changeBackValue(str))
  })
}

export function get () {
  if (arguments.length) {
    const uid = arguments[0]
    if (DevicesIdMap[uid]) {
      // 蓝牙找到过
      return DevicesIdMap[uid]
    } else {
      const newDevInst = new Device({ uid })
      DevicesIdMap[uid] = newDevInst
      search()
      return newDevInst
    }
  } else {

  }
}

export function getService (deviceId) {
  wx.getBLEDeviceServices({
    deviceId: deviceId,
    success: ({ services }) => {
      const len = services.length
      for (let i = 0; i < len; i++) {
        // TODO: 如何确定通道
        const service = services[i]
        if (service.isPrimary && (i === 1)) {
          getCharacteristics(service.uuid, deviceId)
          break 
        }
      }
    },
    fail: (info) => {
      console.log('getBLEDeviceServices fail', JSON.stringify(info))
    }
  })
}

/* 获取蓝牙特征值 */
function getCharacteristics (serviceId, deviceId) {
  // 获取蓝牙设备某个服务中的所有 characteristic（特征值）
  wx.getBLEDeviceCharacteristics({
    deviceId,
    serviceId,
    success: ({ characteristics }) => {
      const len = characteristics.length
      let deviceWR = null
      let hasNotify = false
      for (let i = 0; i < len; i++) {
        let item = characteristics[i]
        /**
         * write
         */
        if (item.properties.write) {
          deviceWR = {
            deviceId,
            serviceId: serviceId,
            characteristicId: item.uuid            
          }
        }
        if (item.properties.notify || item.properties.indicate) {
          /* 通道订阅 */
          hasNotify = true
          wx.notifyBLECharacteristicValueChange({
            deviceId,
            serviceId,
            characteristicId: item.uuid,
            state: true,
          })
        }
      }
      /**
       * 开始蓝牙交互
       * 先处理监听，再写
       * 没有write也没有notify？？？
       */
      if (deviceWR && hasNotify) {
        const dev = DevicesMap[deviceId]
        dev.canWrite(deviceWR)
      } else {
        console.log('?')
      }
    },
    fail (res) {
      console.error('getBLEDeviceCharacteristics', res)
    }
  })
}

export function search () {
  if (isSearching) return

  wx.startBluetoothDevicesDiscovery({
    allowDuplicatesKey: true,
    interval: Options.searchInterval,
    success: () => {
      isSearching = true
    },
    fail: (res) => {
      if (res.errCode === 10001) {
        _checkBluetooth()
      }
      console.log('startBluetoothDevicesDiscovery fail', res)
    }
  })

  /* 设置搜索超时时间 */
  if (Options.searchTimeout) {
    clearTimeout(searchTimeoutId)
    searchTimeoutId = setTimeout(() => {
      /* 如果还在搜索的话，关掉搜索 */
      if (isSearching) {
        BT.trigger('timeout')
        stopSearch()
      }
    }, Options.searchTimeout)
  }
}

export function stopSearch () {
  if (!isSearching) return

  clearTimeout(this.timeId)
  wx.stopBluetoothDevicesDiscovery({
    success: () => {
      isSearching = false
    }
  })
}

export function connect (deviceId, onSuccess, onFail) {
  wx.createBLEConnection({
    deviceId: deviceId,
    success: () => {
      onSuccess()
    },
    fail: (res) => {
      if (res.errCode === 10001) {
        _checkBluetooth()
      }
      onFail()
    }
  })
}

function _checkBluetooth () {
  wx.showModal({
    content: '手机蓝牙尚未开启，请在系统设置或快捷方式中打开手机蓝牙。',
    confirmText: '立即开启',
    cancelText: '稍后再说',
    success (res) {
      if (res.confirm) {
        this.listenChange = true
      } else if (res.cancel) {
        this.listenChange = false
        BT.trigger('cancel', null, 1)
      }
    }
  })
}
