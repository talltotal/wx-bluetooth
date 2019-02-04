export default function Emitter(obj) {
  if (obj) return mixin(obj)
}

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key]
  }
  return obj
}

Emitter.prototype.on = function (event, fn) {
  const dev = this

  (dev._listeners[event] || (dev._listeners[event] = [])).push(fn)

  return dev
}

Emitter.prototype.off = function (event, fn) {
  const dev = this
  if (!arguments.length) {
    dev._listeners = Object.create(null)
  } else if (!fn) {
    dev._listeners[event] = null
  } else {
    const queue = (dev._listeners[event] || (dev._listeners[event] = []))

    for (var i = queue.length; i--;) {
      const cb = queue[i]
      if (cb === fn || cb.fn === fn) {
        queue.splice(i, 1)
        break
      }
    }
  }

  return dev
}

Emitter.prototype.trigger = function (event) {
  const dev = this
  const queue = (dev._listeners[event] || (dev._listeners[event] = []))
  let result

  for (var j = queue.length; j--;) {
    result = queue[j]([].slice.call(arguments, 1))
    if (result === false && devs.length === 1) {
      return false
    } else if (result === false) {
      break
    }
  }

  return dev
}

Emitter.prototype.once = function (event, fn) {
  const dev = this

  function on () {
    dev.off(event, on)
    fn.apply(dev, arguments)
  }
  on.fn = fn
  dev.on(event, on)

  return dev
}