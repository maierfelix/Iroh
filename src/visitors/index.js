import {CATEGORY} from '../labels';
import init from './init';
import call from './call';
import program from './program';
import assign from './assign';

export default {
  init,
  [CATEGORY.CALL]: [call],//TODO sloppy visitor
  [CATEGORY.PROGRAM]: [program],
  [CATEGORY.ASSIGN]: [assign],
};
