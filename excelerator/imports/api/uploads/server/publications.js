// All links-related publications

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Uploads } from '../uploads.js';

Meteor.publish('uploads.files.user', function (userId) {
  check(url, String);
  check(title, String);

  return Uploads.find().cursor;
});
