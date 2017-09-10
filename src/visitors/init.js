export default function (babel) {
  const {types: t, template} = babel;
  const stageDeclaration = template('const stage = Iroh.stages[key];');

  return {
    visitor: {
      Program(path, state) {
        const stageId = state.opts.stage.key,
           stageName = t.identifier(stageId)// TODO use path.scope.generateUidIdentifier
        ;
        state.dynamicData.stageVariable = stageName;
        state.dynamicData.hash = 0;
        path.unshiftContainer('body', stageDeclaration({
          stage: stageName,
          key: t.stringLiteral(String(stageId)),
        }));
      }
    }
  };
}
