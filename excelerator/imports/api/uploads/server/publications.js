// All links-related publications

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Uploads from '../uploads.js';

Meteor.publish('uploads.user', function (userId) {
    return Uploads.find().cursor;
});
