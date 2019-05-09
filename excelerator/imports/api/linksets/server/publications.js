// All links-related publications

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Linksets from '../linksets.js';

Meteor.publish('linksets.all', function () {
  return Linksets.find();
});
