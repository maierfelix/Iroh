export default function (babel) {
  const {types: t, template} = babel;
  const frameDeclaration = template('var frameValue = void 0;'),
     enter = template('DEBUG_PROGRAM_ENTER(hash)'),
     value = template('DEBUG_PROGRAM_FRAME_VALUE(frameValue = value)'),
     leave = template('DEBUG_PROGRAM_LEAVE(hash, frameValue)')
  ;

  return {
    visitor: {
      Program: {
        exit(path, state) {
          const node = path.node,
             hash = state.dynamicData.hash++,
             frameValueId = t.identifier("$$frameValue");// TODO use path.scope.generateUidIdentifier
          if(!path.node.loc) {
            return;
          }

          state.opts.stage.nodes[hash] = {
            hash: hash,
            node: t.cloneDeep(node)
          };

          path.unshiftContainer('body', [
            frameDeclaration({
              frameValue: frameValueId
            }),
            enter({
              DEBUG_PROGRAM_ENTER: template(state.opts.stage.getLink("DEBUG_PROGRAM_ENTER"))(),
              hash: t.numericLiteral(hash)
            })
          ]);

          const lastExpression = getLastExpression(path);
          if (lastExpression) {
            lastExpression.replaceWith(
               value({
                 DEBUG_PROGRAM_FRAME_VALUE: template(state.opts.stage.getLink("DEBUG_PROGRAM_FRAME_VALUE"))(),
                 frameValue: frameValueId,
                 value: lastExpression
               })
            );
          }

          path.pushContainer('body', [
            leave({
              DEBUG_PROGRAM_LEAVE: template(state.opts.stage.getLink("DEBUG_PROGRAM_LEAVE"))(),
              hash: t.numericLiteral(hash),
              frameValue: frameValueId
            })
          ]);
        }
      }
    }
  };

  function getLastExpression(path) {
    const children = path.get('body').reverse();
    for (const child of children) {
      if (child.isExpressionStatement()) {
        return child;
      }
    }
    return null;
  }
}
