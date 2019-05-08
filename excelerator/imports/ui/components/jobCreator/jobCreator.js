import './jobCreator.html';
import { Template }    from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import '../uploadForm/uploadForm'

Template.jobCreator.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});

Template.jobCreator.helpers({
  counter() {
    return Template.instance().counter.get();
  },
});

Template.jobCreator.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    instance.counter.set(instance.counter.get() + 1);
  },
});
