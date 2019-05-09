import './jobCreator.html';
import '../uploadForm/fileDetails';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core.js'

import '../uploadForm/uploadForm'

Template.jobCreator.onCreated(function helloOnCreated() {
});

Template.jobCreator.helpers({
    showFileSelect() {
        return !App.selectedFile.get();
    },
    showFileDetails() {
        return App.selectedFile.get();
    }
});

Template.jobCreator.events({
    'click button'(event, instance) {
        // increment the counter when button is clicked
        instance.counter.set(instance.counter.get() + 1);
    },
});
