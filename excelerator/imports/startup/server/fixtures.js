// Fill the DB with example data on startup

import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
    Meteor.call('updateLinksets', function () {
    });
    Meteor.call('addDatasetTypes', function () {

    });
});
