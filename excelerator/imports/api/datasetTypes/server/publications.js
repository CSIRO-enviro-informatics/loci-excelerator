// All links-related publications

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import DatasetTypes from '../datasetTypes';

Meteor.publish('datasetTypes.all', function () {
  return DatasetTypes.find();
});
