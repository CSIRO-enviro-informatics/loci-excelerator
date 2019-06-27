import { Meteor } from 'meteor/meteor';
import './help.html';

Template.exceleratorHelp.helpers({
    limit() {
        return Meteor.settings.public.jobTimeoutMins;
    }
})