import {CATEGORY} from '../labels';
import init from './init';
import call from './call';

export default {
  init,
  [CATEGORY.CALL]: [call]//TODO sloppy visitor
};
