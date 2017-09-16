import {CATEGORY} from '../labels';
import init from './init';
import call from './call';
import program from './program';

export default {
  init,
  [CATEGORY.CALL]: [call],//TODO sloppy visitor
  [CATEGORY.PROGRAM]: [program]
};
