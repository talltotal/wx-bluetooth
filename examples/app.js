var BT = require('./bt')

App({
  onLaunch () {
    BT({
      searchTimeout: 30000,
      searchInterval: 4000,
      filterDevices (devs) { return devs },
      getUid (dev) { return dev.deviceId },
      canAdd2DeivceMap () { return true },
      changeToValue (data) { return data },
      changeBackValue (data) { return data },
    })
  }
})