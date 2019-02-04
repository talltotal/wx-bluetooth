import Emitter from '../util/emitter'

export function initEvent (dev) {
  dev._listeners = Object.create(null)
}

export function eventsMixin (Device) {
  Emitter(Device.prototype)
}