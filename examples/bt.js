(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.bt = factory());
}(this, function () { 'use strict';

  /**
   * 统一维护的设备列表
   * 理解设备有两个唯一码：
   * 在微信方deviceId是设备唯一码；
   * 业务方可自定义根据蓝牙设备信息的其他规则所得的唯一码
   */
  const DevicesMap = {};
  const DevicesIdMap = {};

  /**
   * 配置项
   * searchTimeout 搜索超时时间：0-持续搜索直到停止；!0-毫秒数后停止搜索
   * searchInterval 上报设备的间隔:0-找到新设备立即上报
   * filterDevices 对新找到的蓝牙设备的过滤函数，也可做排序等操作，
   * getUid 根据蓝牙设备信息，获取业务唯一码
   * canAdd2DeivceMap 对新找到的蓝牙设备的再一次匹配判断
   * changeToValue 发送蓝牙数据的业务处理函数
   * changeBackValue 收到蓝牙数据的业务处理函数
   */
  const Options = {
    searchTimeout: 60000,
    searchInterval: 4000,
    filterDevices (devs) { return devs },
    getUid (dev) { return dev.deviceId },
    canAdd2DeivceMap () { return true },
    changeToValue (data) { return data },
    changeBackValue (data) { return data },
  };

  const CONNECT_STATE_UNLINK = -1;
  const CONNECT_STATE_LINKING = 0;
  const CONNECT_STATE_LINKED = 1;

  function initState (dev) {
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
    dev._connect = CONNECT_STATE_UNLINK;
    dev._writing = false;
    dev._writeTimes = 0;
  }

  function stateMixin (Device) {
    Device.prototype.changeConnectState = function (connected) {
      const pre = this._connect;
      if (connected && pre !== CONNECT_STATE_LINKED) {
        this._connect = CONNECT_STATE_LINKED;
        if (this.trigger('connect')) {
          this.getService();
        }
      } else if (!connected && pre !== CONNECT_STATE_UNLINK) {
        dev._connect = CONNECT_STATE_UNLINK;
        dev._writeTimes = 0;
        this.trigger('disconnect');
      }
    };

    Device.prototype.startConnect = function () {
      this._connect = CONNECT_STATE_LINKING;
    };

    Device.prototype.isConnected = function () {
      return this._connect === CONNECT_STATE_LINKED
    };

    Device.prototype.isUnConnected = function () {
      return this._connect === CONNECT_STATE_UNLINK
    };
  }

  let platform = '';

  function isIos (cb) {
    if (platform) {
      cb(platform === 'ios');
    } else {
      wx.getSystemInfo({
        success: (info) => {
          platform = info.platform;
          cb(platform === 'ios');
        }
      });
    }
  }

  function isObject (obj) {
    return obj !== null && typeof obj === 'object'
  }

  function hexToArrayBuffer (hex) {
    if (typeof hex !== 'string') {
      throw new TypeError('Expected input to be a string')
    }

    if ((hex.length % 2) !== 0) {
      throw new RangeError('Expected string to be an even number of characters')
    }

    let view = new Uint8Array(hex.length / 2);

    for (let i = 0, j = 0; i < hex.length; i += 2,j++) {
      view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    return view.buffer
  }

  function arrayBufferToHex(arrayBuffer) {
    if (typeof arrayBuffer !== 'object' ||
        arrayBuffer === null || 
        typeof arrayBuffer.byteLength !== 'number') {
      throw new TypeError('Expected input to be an ArrayBuffer')
    }

    var view = new Uint8Array(arrayBuffer);
    var result = '';
    var value;

    for (var i = 0; i < view.length; i++) {
      value = view[i].toString(16);
      result += (value.length === 1 ? ('0' + value) : value);
    }

    return result
  }

  function initBt (dev) {
    dev.deviceWR = null;

    /**
     * 写队列
     */
    dev._writeQueue = [];
  }

  function btMixin (Device) {
    Device.prototype.connect = function () {
      if (this.isUnConnected() && this._deviceId) {
        this.startConnect();
        connect(this._deviceId, () => {
          this.changeConnectState(true);
          this._write();
        },
        () => {
          this.changeConnectState(false);
          this.trigger('connectFail');
        });
      }
    };

    Device.prototype.getService = function () {
      getService(this._deviceId);
    };

    Device.prototype.canWrite = function (deviceWR) {
      this.deviceWR = deviceWR;

      this.trigger('ready');
    };

    Device.prototype.write = function () {
      if (this.isUnConnected()) {
        this.connect();
      }

      if (this._writeTimes > 255) {
        console.error('write too many times!');
        wx.closeBLEConnection({
          deviceId
        });
        return
      }

      this._writeQueue.push([].slice(arguments, 0));
      this._write();
    };

    Device.prototype._write = function () {
      if (this.isConnected() && !this._writing && this._writeQueue.length) {
        const data = Options.changeToValue(this._writeQueue[0]);
        this._subWrite(hexToArrayBuffer(data));
      }
    };

    Device.prototype._subWrite = function ({ buffer, length }) {
      const value = buffer.slice(0, 30);
      this._isWriting = true;
      wx.writeBLECharacteristicValue({
        ...this.deviceWR,
        value,
        success: () => {
          if (length > 30) {
            isIos((is) => {
              const subBuffer = {
                buffer: buffer.slice(30),
                length: length - 30,
              };
              if (is) {
                this._subWrite(subBuffer);
              } else {
                setTimeout(() => {
                  this._subWrite(subBuffer);
                }, 250);
              }
            });
          } else {
            /**
             * 发送完毕
             * 300之后才假装真的完成了
             */
            setTimeout(() => {
              this._isWriting = false;
              this._qWrite();
            }, 300);
          }
        },
        fail: (res) => {
          /**
           * 当前包失败，重新发送
           * 直到发送完毕
           */
          console.log('writeBLECharacteristicValue fail', res.errMsg);
          this._subWrite({ buffer, length });
        }
      });
    };
  }

  function Emitter(obj) {
    if (obj) return mixin(obj)
  }

  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj
  }

  Emitter.prototype.on = function (event, fn) {
    const dev = this

    (dev._listeners[event] || (dev._listeners[event] = [])).push(fn);

    return dev
  };

  Emitter.prototype.off = function (event, fn) {
    const dev = this;
    if (!arguments.length) {
      dev._listeners = Object.create(null);
    } else if (!fn) {
      dev._listeners[event] = null;
    } else {
      const queue = (dev._listeners[event] || (dev._listeners[event] = []));

      for (var i = queue.length; i--;) {
        const cb = queue[i];
        if (cb === fn || cb.fn === fn) {
          queue.splice(i, 1);
          break
        }
      }
    }

    return dev
  };

  Emitter.prototype.trigger = function (event) {
    const dev = this;
    const queue = (dev._listeners[event] || (dev._listeners[event] = []));
    let result;

    for (var j = queue.length; j--;) {
      result = queue[j]([].slice.call(arguments, 1));
      if (result === false && devs.length === 1) {
        return false
      } else if (result === false) {
        break
      }
    }

    return dev
  };

  Emitter.prototype.once = function (event, fn) {
    const dev = this;

    function on () {
      dev.off(event, on);
      fn.apply(dev, arguments);
    }
    on.fn = fn;
    dev.on(event, on);

    return dev
  };

  function initEvent (dev) {
    dev._listeners = Object.create(null);
  }

  function eventsMixin (Device) {
    Emitter(Device.prototype);
  }

  /**
   * 设备类
   * 
   */
  function Device ({ uid, deviceId }) {
    /**
     * 设备的两个唯一码
     */
    this._deviceId = deviceId;
    this._uid = uid;

    /**
     * 设备额外数据
     * 存储业务数据
     */
    this._data = null;

    initBt(this);
    initState(this);
    initEvent(this);
  }

  Device.prototype.setDeviceId = function (deviceId) {
    this._deviceId = deviceId;
  };
  Device.prototype.setData = function (data) {
    this._data = data;
  };

  btMixin(Device);
  stateMixin(Device);
  eventsMixin(Device);

  let isInitBt = false;
  let isSearching = false;
  let searchTimeoutId = null;

  function init () {
    if (isInitBt) return

    // 1. 打开蓝牙适配器
    openAdapter();

    // 2. 增加监听器
    addListener();

    isInitBt = true;
  }

  function openAdapter () {
    wx.openBluetoothAdapter({
      success: res => {
        console.log('openBluetoothAdapter success', res);
      },
      fail: res => {
        console.log('openBluetoothAdapter fail', res);
        bt.trigger('fail', '开启蓝牙失败', 1);
        if (res.errCode === 10001) {
          _checkBluetooth();
        } else {
          wx.showToast({ icon: 'none', title: res.errMsg || '开启蓝牙失败' });
        }
      }
    });
  }

  function addListener () {
    // 1 找到设备
    wx.onBluetoothDeviceFound(({ devices }) => {
      if (!isSearching) return

      devices = Options.filterDevice(devices);

      const len = devices.length;
      for (let i = 0; i < len; i ++) {
        const dev = devices[i];
        const deviceId = dev.deviceId;
        if (!DevicesMap[deviceId] && Options.canAdd2DeivceMap(dev)) {
          const uid = Options.getUid(dev);
          let newDevInst = null;
          if (DevicesIdMap[uid]) {
            newDevInst = DevicesIdMap[uid];
            newDevInst.setDeviceId(deviceId);
          } else {
            newDevInst = new Device({ uid, deviceId });
            DevicesIdMap[uid] = newDevInst;
          }
          DevicesMap[deviceId] = newDevInst;
          newDevInst.trigger('find');
        }
      }
    });

    // 2 设备蓝牙状态变更
    wx.onBLEConnectionStateChange(({ deviceId, connected }) => {
      const dev = DevicesMap[deviceId];
      if (!dev) return

      dev.changeConnectState(connected);
    });

    // 3 蓝牙适配器状态变更
    wx.onBluetoothAdapterStateChange((res) => {
      console.log('onBluetoothAdapterStateChange', res);
      if (res.available) {
        this.available = true;
      }
      if (res.available && res.discovering && this.listenChange) {
        this.listenChange = false;
        this._startBluetoothDevicesDiscovery();
      }
    });

    // 4 获取到蓝牙数据
    wx.onBLECharacteristicValueChange(({ value, deviceId }) => {
      const dev = DevicesMap[deviceId];

      if (!dev) return

      const str = arrayBufferToHex(value);
      dev.trigger('msg', Options.changeBackValue(str));
    });
  }

  function get () {
    if (arguments.length) {
      const uid = arguments[0];
      if (DevicesIdMap[uid]) {
        // 蓝牙找到过
        return DevicesIdMap[uid]
      } else {
        const newDevInst = new Device({ uid });
        DevicesIdMap[uid] = newDevInst;
        search();
        return newDevInst
      }
    }
  }

  function getService (deviceId) {
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: ({ services }) => {
        const len = services.length;
        for (let i = 0; i < len; i++) {
          // TODO: 如何确定通道
          const service = services[i];
          if (service.isPrimary && (i === 1)) {
            getCharacteristics(service.uuid, deviceId);
            break 
          }
        }
      },
      fail: (info) => {
        console.log('getBLEDeviceServices fail', JSON.stringify(info));
      }
    });
  }

  /* 获取蓝牙特征值 */
  function getCharacteristics (serviceId, deviceId) {
    // 获取蓝牙设备某个服务中的所有 characteristic（特征值）
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: ({ characteristics }) => {
        const len = characteristics.length;
        let deviceWR = null;
        let hasNotify = false;
        for (let i = 0; i < len; i++) {
          let item = characteristics[i];
          /**
           * write
           */
          if (item.properties.write) {
            deviceWR = {
              deviceId,
              serviceId: serviceId,
              characteristicId: item.uuid            
            };
          }
          if (item.properties.notify || item.properties.indicate) {
            /* 通道订阅 */
            hasNotify = true;
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
            });
          }
        }
        /**
         * 开始蓝牙交互
         * 先处理监听，再写
         * 没有write也没有notify？？？
         */
        if (deviceWR && hasNotify) {
          const dev = DevicesMap[deviceId];
          dev.canWrite(deviceWR);
        } else {
          console.log('?');
        }
      },
      fail (res) {
        console.error('getBLEDeviceCharacteristics', res);
      }
    });
  }

  function search () {
    if (isSearching) return

    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      interval: Options.searchInterval,
      success: () => {
        isSearching = true;
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          _checkBluetooth();
        }
        console.log('startBluetoothDevicesDiscovery fail', res);
      }
    });

    /* 设置搜索超时时间 */
    if (Options.searchTimeout) {
      clearTimeout(searchTimeoutId);
      searchTimeoutId = setTimeout(() => {
        /* 如果还在搜索的话，关掉搜索 */
        if (isSearching) {
          bt.trigger('timeout');
          stopSearch();
        }
      }, Options.searchTimeout);
    }
  }

  function stopSearch () {
    if (!isSearching) return

    clearTimeout(this.timeId);
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        isSearching = false;
      }
    });
  }

  function connect (deviceId, onSuccess, onFail) {
    wx.createBLEConnection({
      deviceId: deviceId,
      success: () => {
        onSuccess();
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          _checkBluetooth();
        }
        onFail();
      }
    });
  }

  function _checkBluetooth () {
    wx.showModal({
      content: '手机蓝牙尚未开启，请在系统设置或快捷方式中打开手机蓝牙。',
      confirmText: '立即开启',
      cancelText: '稍后再说',
      success (res) {
        if (res.confirm) {
          this.listenChange = true;
        } else if (res.cancel) {
          this.listenChange = false;
          bt.trigger('cancel', null, 1);
        }
      }
    });
  }

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

  function bt (options) {
    if (isObject(options)) {
      Object.keys(Options).forEach(key => {
        if (options.hasOwnProperty(key)) {
          Options[key] = options[key];
        }
      });
    }

    init();
  }
  bt.get = get;

  bt.options = Options;
  bt.devicesMap = DevicesMap;
  bt.devicesIdMap = DevicesIdMap;

  bt._listeners = Object.create(null);
  Emitter(bt);

  return bt;

}));
