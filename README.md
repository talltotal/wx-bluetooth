## use

蓝牙事件：
- 

设备事件：
- fail
- find
- connect
- disconnect
- msg
- cancel
- change


```
import bt from '@talltotal/wx-bluetooth'

bt.init({

})
const dev123 = bt.get('123')
  .setData({
    key: '12321',
    admin: 'talltotal',
  })
  .once('find', () => {
    dev123.connect()
  })
```