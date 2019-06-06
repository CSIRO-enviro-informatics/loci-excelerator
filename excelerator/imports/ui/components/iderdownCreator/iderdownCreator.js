import './iderdownCreator.html';
import '../singleJob/singleJob';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core.js'

import '../uploadForm/uploadForm'
import Datasets from '../../../api/datasets/datasets';
import Linksets from '../../../api/linksets/linksets';
import Uploads from '../../../api/uploads/uploads'
import Jobs from '../../../api/jobs/jobs';

window.Datasets = Datasets;
window.Uploads = Uploads;
window.Jobs = Jobs;

Template.iderdownCreator.onCreated(function () {
    var tpl = this;

    Meteor.subscribe('datasets.all');
    Meteor.subscribe('linksets.all');
    // Meteor.subscribe("jobs.all");
    Tracker.autorun(function () {
        Meteor.subscribe("jobs.id", App.dataId.get());
    })
});

Template.iderdownCreator.helpers({
    hasStarted() {
        return !!App.Jobs.find({type: 'iderdown'}).count();
    },
    jobs() {
        return App.Jobs.find({type: 'iderdown'}, { sort: { created: 1, jobCreated: 1, _id: 1 } });
    },
});

Template.iderdownCreator.events({
    'click #submitJobs': async function (e, t) {
    },
    'click #addMore': function (e, t) {
    }
});


Template.iderdownForm.onCreated(function() {
    var tpl = this;
    tpl.formState = new ReactiveVar({
        params: {}
    });
})

Template.iderdownForm.helpers({
    context() {
        return Template.instance().formState.get();
    },
    datasets() {
        return Datasets.find({}, { sort: { title: 1 } });
    },
    outputDataset() {
        var ds = Datasets.findOne({ uri: this.params.outputUri });
        return ds ? ds.title : "Unknown";
    },
    outputSubType() {
        return "Unknown";
    },
    outputSubTypes() {
        var ds = Datasets.findOne({ uri: this.params.outputUri });        
        return ds ? ds.subTypes : "Unknown";
    },
    filterDataset() {
        var ds = Datasets.findOne({ uri: this.params.filterUri });
        return ds ? ds.title : "Unknown";
    },
    filterSubType() {
        return "Unknown";
    },
    filterSubTypes() {
        var ds = Datasets.findOne({ uri: this.params.filterUri });        
        return ds ? ds.subTypes : "Unknown";
    },
    isActive(a, b) {
        return a == b ? "active" : "";
    },
})

Template.iderdownForm.events({

})