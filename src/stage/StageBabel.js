import Stage from "./index";

export default class StageBabel extends Stage {
  constructor(...args) {
    super(...args);
  }

  get script() {
    return this.patch(this.input);
  }

  initScript() {
  }
};
