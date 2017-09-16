import flatten from 'lodash.flatten';
import uniq from 'lodash.uniq';
import Stage from "./index";
import visitors from '../visitors/index';
import {transform, traverse} from 'babel-core';

export default class StageBabel extends Stage {
  constructor(input, opts = {}) {
    opts = Object.assign({
      fullTransformation: false
    }, opts);
    super(input, opts);
  }

  get script() {
    return this.patch(this.input);
  }

  patch(input) {
    const categories = this._getTransformCategories(),
       plugins = this._getPluginsByTransformCategories(categories),
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

  _getTransformCategories() {
    let transformCategories = Object.keys(this.listeners);
    if (!this.options.fullTransformation) {
      transformCategories = transformCategories.filter(k => this.listeners[k].length);
    }
    return transformCategories;
  }

  _getPluginsByTransformCategories(categories) {
    let plugins = [
      visitors.init,
      ...categories.map(category => visitors[category])
    ];
    return uniq(flatten(
       plugins
          .filter(plugin => plugin)
    ));
  }

  initScript() {
  }
};
