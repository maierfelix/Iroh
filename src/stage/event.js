import { INSTR } from "../labels";

import * as events from "./events";

export default class RuntimeEvent {
  constructor(type, instance) {
    this.type = type;
    // base properties
    this.hash = -1;
    this.indent = -1;
    this.location = null;
    this.instance = instance;
    // TODO
    // turn all events into seperate classes
    // so we can save a lot garbage
  }
  getEventClass(type) {
    let prop = `Event_${type.toUpperCase()}`;
    return events[prop] || null;
  }
  trigger(trigger) {
    // trigger all attached listeners
    this.instance.triggerListeners(this.type, this, trigger);
  }
};
