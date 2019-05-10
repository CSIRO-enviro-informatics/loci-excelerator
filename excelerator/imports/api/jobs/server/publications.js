// All links-related publications

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Jobs from '../jobs';

Meteor.publish('jobs.all', function () {
    return Jobs.find();
});

Meteor.publish('jobs.id', function (id) {
  return Jobs.find({"data.userId": id});
});
