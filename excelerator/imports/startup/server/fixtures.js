// Fill the DB with example data on startup

import { Meteor } from 'meteor/meteor';
import Datasets from '../../api/datasets/datasets'
import Linksets from '../../api/linksets/linksets'

Meteor.startup(() => {
    Meteor.call('updateLinksets', function() {
    });
});
