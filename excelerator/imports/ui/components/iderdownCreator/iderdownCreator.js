import './iderdownCreator.html';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core.js'

import '../uploadForm/uploadForm'
import Datasets from '../../../api/datasets/datasets';
import Linksets from '../../../api/linksets/linksets';
import DatasetTypes from '../../../api/datasetTypes/datasetTypes';
import Jobs from '../../../api/jobs/jobs';

window.Datasets = Datasets;
window.DatasetTypes = DatasetTypes;
window.Jobs = Jobs;

Template.iderdownCreator.onCreated(function () {
    var tpl = this;

    Meteor.subscribe('datasets.all');
    Meteor.subscribe('linksets.all');
    Meteor.subscribe('datasetTypes.all');
    // Meteor.subscribe("jobs.all");
    Tracker.autorun(function () {
        Meteor.subscribe("jobs.id", App.dataId.get());
    })
});

Template.iderdownCreator.helpers({
    hasStarted() {
        return !!App.Jobs.find({ type: 'iderdown' }).count();
    },
    jobs() {
        return App.Jobs.find({ type: 'iderdown' }, { sort: { created: 1, jobCreated: 1, _id: 1 } });
    },
});

Template.iderdownCreator.events({
    'click #submitJobs': async function (e, t) {
    },
    'click #addMore': function (e, t) {
    }
});


Template.iderdownForm.onCreated(function () {
    var tpl = this;
    tpl.formState = new ReactiveVar({
        params: {}
    });
})

Template.iderdownForm.helpers({
    context() {
        return Template.instance().formState.get();
    },
    outputDatasets() {
        return Datasets.find({}, { sort: { title: 1 } });
    },
    outputDataset() {
        var ds = Datasets.findOne({ uri: this.params.outputUri });
        return ds ? ds.title : "Unknown";
    },
    outputSubType() {
        var dst = DatasetTypes.findOne({ uri: this.params.outputTypeUri });
        return dst ? dst.title : "Unknown";
    },
    outputSubTypes() {
        return DatasetTypes.find({ datasetUri: this.params.outputUri });
    },
    filterDatasets() {
        var params = this.params;
        if (params && params.outputUri) {
            var uri = params.outputUri;
            var datasetsUris = new Set();
            Linksets.find({
                $or: [{
                    subjectsTarget: uri
                }, {
                    objectsTarget: uri
                }]
            }).forEach(ls => {
                datasetsUris.add(ls.objectsTarget == uri ? ls.subjectsTarget : ls.objectsTarget);
            })
            datasetsUris.add(uri); //add self as we can convert internally
            return Datasets.find({ 
                uri: { $in: Array.from(datasetsUris) }                 
            }, { sort: { title: 1 } });
        }
    },
    filterDataset() {
        var ds = Datasets.findOne({ uri: this.params.filterUri });
        return ds ? ds.title : "Unknown";
    },
    filterSubType() {
        var dst = DatasetTypes.findOne({ uri: this.params.filterTypeUri });
        return dst ? dst.title : "Unknown";
    },
    filterSubTypes() {
        return DatasetTypes.find({ datasetUri: this.params.filterUri });
    },
    isActive(a, b) {
        return a == b ? "active" : "";
    },
})

Template.iderdownForm.events({
    'click .output-select': function (e, t) {
        e.preventDefault();
        var data = t.formState.get()
        data.params.outputUri = this.uri;        
        data.params.outputTypeUri = DatasetTypes.findOne({datasetUri: this.uri}).uri; //select first
        t.formState.set(data);
    },
    'click .output-sub-type-select': function (e, t) {
        e.preventDefault();
        var data = t.formState.get()
        data.params.outputTypeUri = this.uri;
        t.formState.set(data);
    },
    'click .filter-select': function (e, t) {
        e.preventDefault();
        var data = t.formState.get()
        data.params.filterUri = this.uri;
        data.params.filterTypeUri = DatasetTypes.findOne({datasetUri: this.uri}).uri; //select first
        t.formState.set(data);
    },
    'click .filter-sub-type-select': function (e, t) {
        e.preventDefault();
        var data = t.formState.get()
        data.params.filterTypeUri = this.uri;
        t.formState.set(data);
    },

})