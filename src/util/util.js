let platform = ''

export function isIos (cb) {
  if (platform) {
    cb(platform === 'ios')
  } else {
    wx.getSystemInfo({
      success: (info) => {
        platform = info.platform
        cb(platform === 'ios')
      }
    })
  }
}

export function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

export function hexToArrayBuffer (hex) {
  if (typeof hex !== 'string') {
    throw new TypeError('Expected input to be a string')
  }

  if ((hex.length % 2) !== 0) {
    throw new RangeError('Expected string to be an even number of characters')
  }

  let view = new Uint8Array(hex.length / 2)

  for (let i = 0, j = 0; i < hex.length; i += 2,j++) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }

  return view.buffer
}

export function arrayBufferToHex(arrayBuffer) {
  if (typeof arrayBuffer !== 'object' ||
      arrayBuffer === null || 
      typeof arrayBuffer.byteLength !== 'number') {
    throw new TypeError('Expected input to be an ArrayBuffer')
  }

  var view = new Uint8Array(arrayBuffer)
  var result = ''
  var value

  for (var i = 0; i < view.length; i++) {
    value = view[i].toString(16)
    result += (value.length === 1 ? ('0' + value) : value)
  }

  return result
}