class RuntimeListenerEvent {
  constructor(type, callback) {
    this.type = type;
    this.callback = callback;
  }
};

export default class RuntimeListener {
  constructor(type) {
    this.type = type;
    this.triggers = {};
  }
  on(type, callback) {
    let event = new RuntimeListenerEvent(type, callback);
    // not registered yet
    if (this.triggers[type] === void 0) {
      this.triggers[type] = [];
    }
    this.triggers[type].push(event);
  }
  trigger(event, trigger) {
    // validate
    if (!this.triggers.hasOwnProperty(trigger)) {
      console.error(`Unexpected listener event ${trigger}`);
      return;
    }
    let triggers = this.triggers[trigger];
    for (let ii = 0; ii < triggers.length; ++ii) {
      triggers[ii].callback(event);
    };
  }
};
