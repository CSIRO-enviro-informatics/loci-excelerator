// Methods related to datasets

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Jobs from './jobs';

Meteor.methods({
    'jobs.hide': function(jobId) {
        Jobs.update(jobId, {$set: {hide: true}});
    }
});
