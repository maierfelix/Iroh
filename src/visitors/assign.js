import { OP } from "../labels";

export default function (babel) {
  const {types: t, template} = babel;
  const assign = template('left = DEBUG_ASSIGN(hash, op, obj, prop, value)')
  ;

  return {
    visitor: {
      AssignmentExpression: {
        exit(path, state) {
          const node = path.node,
             hash = state.dynamicData.hash++;
          if (!path.node.loc) {
            return;
          }

          state.opts.stage.nodes[hash] = {
            hash: hash,
            node: t.cloneDeep(node)
          };

          path.replaceWith(
             assign({
               left: path.node.left,
               DEBUG_ASSIGN: template(state.opts.stage.getLink("DEBUG_ASSIGN"))(),
               hash: t.numericLiteral(hash),
               op: convertOperatorToCode(path.node.operator),
               obj: resolveObject(path.node.left),
               prop: resolveProperty(path.node.left),
               value: path.node.right
             })
          );
        }
      }
    }
  };

  function resolveObject(left) {// TODO possible generic with `call.js` helpers
    if (t.isMemberExpression(left)) {
      return left.object;
    }
    return t.stringLiteral(left.name);
  }

  function resolveProperty(left) {// TODO possible generic with `call.js` helpers
    if (t.isMemberExpression(left)) {
      const property = left.property;
      if (t.isMemberExpression(left, {computed: false})) {
        return t.stringLiteral(property.name);
      }
      return property;
    }
    return t.nullLiteral();
  }

  function convertOperatorToCode(operator) {
    if (operator !== "=") {
      operator = operator.substr(0, operator.length - 1);
    }
    return t.numericLiteral(OP[operator]);
  }
}
