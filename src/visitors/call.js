export default function (babel) {
  const {types: t, template} = babel;
  const watcher = template('DEBUG_FUNCTION_CALL(hash, ctx, object, call, args)');

  return {
    visitor: {
      CallExpression: {
        exit(path, state) {
          const node = path.node,
             callee = node.callee,
             hash = state.dynamicData.hash++;
          if(!path.node.loc) {
            return;
          }

          state.opts.stage.nodes[hash] = {
            hash: hash,
            node: t.cloneDeep(node)
          };

          path.replaceWith(
             watcher({
               DEBUG_FUNCTION_CALL: template(state.opts.stage.getLink("DEBUG_FUNCTION_CALL"))(),
               hash: t.numericLiteral(hash),
               ctx: t.identifier('this'),
               object: resolveCallee(callee),
               call: resolveCall(callee),
               args: t.arrayExpression(node.arguments)
             })
          );
          path.skip();
        }
      }
    }
  };

  function resolveCallee(callee) {
    if (t.isMemberExpression(callee)) {
      return callee.object;
    }
    return callee;
  }

  function resolveCall(callee) {
    if (t.isMemberExpression(callee)) {
      const property = callee.property;
      if (t.isMemberExpression(callee, {computed: false})) {
        return t.stringLiteral(property.name);
      }
      return property;
    }
    return t.nullLiteral();
  }
}
