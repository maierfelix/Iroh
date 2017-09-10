import flatten from 'lodash.flatten';
import uniq from 'lodash.uniq';
import Stage from "./index";
import visitors from '../visitors';
import {parse, transform, traverse} from 'babel-core';

export default class StageBabel extends Stage {
  constructor(...args) {
    super(...args);
  }

  get script() {
    return this.patch(this.input);
  }

  patch(input) {
    const categories = Object.keys(this.listeners)
          .filter(k => this.listeners[k].length),
       plugins = uniq(flatten([
         visitors.init,
         ...categories.map(category => visitors[category])
       ])),
       mergedPlugins = (babel) => {
         return {
           visitor: traverse.visitors.merge(
              plugins.map(fn => fn(babel).visitor)
           )
         };
       },
       transformed = transform(
          input,
          {
            // TODO need use user's .babelrc(after work of our plugins)
            plugins: [
              [
                mergedPlugins,
                {
                  stage: {
                    key: this.key,
                    nodes: {},
                    symbols: {},
                    getLink: this.getLink.bind(this)
                  }
                }
              ]
            ]
          }
       ),
       stageFromOptions = transformed.options.plugins[0][1].stage
    ;

    // TODO is really need, and how should works? Maybe need clone original node before any transformation?
    // @see https://astexplorer.net/, path.node.original for example
    this.nodes = stageFromOptions.nodes;
    this.symbols = stageFromOptions.symbols;

    return transformed.code;
  }

  initScript() {
  }
};
