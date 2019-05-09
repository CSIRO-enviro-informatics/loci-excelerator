// All links-related publications

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Datasets from '../datasets';

Meteor.publish('datasets.all', function () {
  return Datasets.find();
});
