class RuntimeListenerEvent {
  constructor(type, callback) {
    this.type = type;
    this.callback = callback;
  }
};

export default class RuntimeListener {
  constructor(category) {
    this.category = category;
    this.triggers = {};
  }
  on(type, callback) {
    let event = new RuntimeListenerEvent(type, callback);
    // not registered yet
    if (this.triggers[type] === void 0) {
      this.triggers[type] = [];
    }
    this.triggers[type].push(event);
    // allow stream calls
    return this;
  }
  trigger(event, trigger) {
    // any triggers registered?
    if (!this.triggers.hasOwnProperty(trigger)) return;
    let triggers = this.triggers[trigger];
    for (let ii = 0; ii < triggers.length; ++ii) {
      triggers[ii].callback(event);
    };
  }
};
