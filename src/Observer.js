import Emitter from './Emitter'
import Socket from 'socket.io-client'
import _ from 'lodash'

export default class {

  constructor(connection, store, opts) {
    opts = opts || {}

    if (typeof connection == 'string') {
      this.Socket = Socket(connection);
    } else {
      this.Socket = connection
    }

    if (store) this.store = store;

    //for nested structured stores (e.g. Nuxt style stores) execute SOCKET_<event> to those prefixed with a store name.
    this.applyToNestedStores = opts.applyToNestedStores

    this.onEvent()
  }

  onEvent() {
    this.Socket.onevent = (packet) => {
      Emitter.emit(packet.data[0], packet.data[1]);
      if (this.store) this.commitStore('SOCKET_' + packet.data[0], packet.data[1])
    };

    let _this = this;

    ["connect", "error", "disconnect", "reconnect", "reconnect_attempt", "reconnecting", "reconnect_error", "reconnect_failed", "connect_error", "connect_timeout", "connecting", "ping", "pong"]
      .forEach((value) => {
        _this.Socket.on(value, (data) => {
          Emitter.emit(value, data);
          if (_this.store) {
            _this.commitStore('SOCKET_' + value.toUpperCase(), data)
          }
        })
      })
  }

  commitStore(type, payload) {
    let _this = this;
    if (type.split('_')[0].toUpperCase() === 'SOCKET') {
      _.filter(Object.keys(this.store._mutations), (mut) => {
        return _this.applyToNestedStores ? mut.split('/').pop() === type : mut.toString() === type
      }).map((mut) => {
        this.store.commit(mut, payload)
      })
    }
  }

}
