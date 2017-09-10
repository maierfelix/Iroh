import fs from 'fs';
import path from 'path';
import vm from 'vm';
import Iroh from '../../src';
import sinon from 'sinon';
import {expect} from 'chai';
import flatten from 'lodash.flatten';

describe('babylon parser tests', function () {
    let stage;

    beforeEach(function () {
        stage = loadFixtures(this);
    });

    it('call', function () {
        const beforeStub = sinon.stub(),
            afterStub = sinon.stub();

        stage.addListener(Iroh.CALL)
            .on("before", beforeStub)
            .on("after", afterStub);

        const sandbox = {Iroh};
        vm.runInNewContext(stage.script, sandbox);

        expect(sandbox.result).to.deep.equal([4, 9]);
        assertEvents('before', beforeStub.args, {
            hash: [5, 7],
            indent: [1, 1],
            arguments: [[2], [3]],
            context: [sandbox, sandbox],
            object: [null, null],
            call: [sandbox.square, sandbox.square],
            callee: [null, null],
            external: [false, false]
        });
        assertEvents('after', afterStub.args, {
            hash: [5, 7],
            indent: [1, 1],
            arguments: [[2], [3]],
            return: [4, 9],
            context: [sandbox, sandbox],
            object: [null, null],
            call: [sandbox.square, sandbox.square],
            callee: [null, null],
            external: [false, false]
        });
    });


    function loadFixtures(testContext) {
        const fixturePath = getFixturesPath(testContext.currentTest),
            fixtureSource = fs.readFileSync(fixturePath, {encoding: 'utf8'}),
            stage = new Iroh.StageBabel(fixtureSource);
        return stage;
    }

    function getFixturesPath(test) {
        const suitesTestsPath = [];
        while (test) {
            suitesTestsPath.unshift(test.title);
            test = test.parent;
        }

        const localSuitesPath = suitesTestsPath.slice(2, -1),
            fileName = suitesTestsPath.pop();
        return path.join(__dirname, 'fixtures', ...localSuitesPath, `${fileName}.js`);
    }

    function assertEvents(type, args, expectable) {
        args = flatten(args);
        for (const key in expectable) {
            expect(args.map(ev => ev[key])).to.deep.equal(expectable[key], `${key} in "${type}" event`);
        }
    }
});