import './iderdownCreator.html';
import './iderdownJob';
import '../help/help';
import '../help/geofabricHelp';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core.js'

import '../uploadForm/uploadForm'
import Datasets from '../../../api/datasets/datasets';
import Linksets from '../../../api/linksets/linksets';
import DatasetTypes from '../../../api/datasetTypes/datasetTypes';
import Jobs from '../../../api/jobs/jobs';
import { DATASETS } from '../../../helpers'

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
        Meteor.subscribe('uploads.user', App.dataId.get());
    })
});

Template.iderdownCreator.helpers({
    hasJobs() {
        return !!Jobs.find({ type: 'iderdown' }).count();
    },
    jobs() {
        return Jobs.find({ type: 'iderdown' }, { sort: { created: 1, jobCreated: 1, _id: 1 } });
    },
});

Template.iderdownForm.onCreated(function () {
    var tpl = this;
    tpl.formState = new ReactiveVar({
        params: {}
    });

    //testing
    tpl.formState.set({
        params: {
            outputUri: "http://linked.data.gov.au/dataset/asgs2016",
            outputTypeUri: "http://linked.data.gov.au/def/asgs#MeshBlock",
            filterUri: "http://linked.data.gov.au/dataset/asgs2016",
            filterTypeUri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
            idText: "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804,\nhttp://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/10402109004"
        }
    })
})

Template.iderdownForm.helpers({
    context() {
        return Template.instance().formState.get();
    },
    outputDatasets() {
        //hack to limit dataset
        var allowed = [DATASETS.asgs2016, DATASETS.geofabric, DATASETS.gnaf]
        return Datasets.find({ uri: { $in: allowed } }, { sort: { title: 1 } });
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
        return DatasetTypes.find({ datasetUri: this.params.outputUri, withinTypes: { $exists: true } });
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
    isFilterSubTypeDisabled(params, filterTypeUri) {
        var outputTypeUri = DatasetTypes.findOne({ uri: params.outputTypeUri });
        return outputTypeUri.withinTypes.indexOf(filterTypeUri) == -1 ? "disabled" : "";
    },
    isActive(a, b) {
        return a == b ? "active" : "";
    },
    isDisabled() {
        var ready = this.params.filterUri &&
            this.params.filterTypeUri &&
            this.params.outputUri &&
            this.params.outputTypeUri &&
            this.params.idText;
        return ready ? {} : { disabled: "" };
    },
    showWarning() {
        return this.params.outputUri == DATASETS.geofabric;
    }
})

Template.iderdownForm.events({
    'click .output-select': function (e, t) {
        e.preventDefault();
        var data = t.formState.get()
        data.params.outputUri = this.uri;
        var outputType = DatasetTypes.findOne({ datasetUri: this.uri });
        data.params.outputTypeUri = outputType.uri; //select first

        //set filter too, while we are not using the linksets
        data.params.filterUri = this.uri;
        data.params.filterTypeUri = outputType.withinTypes[0];

        t.formState.set(data);
    },
    'click .output-sub-type-select': function (e, t) {
        e.preventDefault();
        var data = t.formState.get()
        data.params.outputTypeUri = this.uri;
        var outputType = DatasetTypes.findOne({ uri: this.uri });
        data.params.filterTypeUri = outputType.withinTypes[0];
        t.formState.set(data);
    },
    // 'click .filter-select': function (e, t) {
    //     e.preventDefault();
    //     var data = t.formState.get()
    //     data.params.filterUri = this.uri;
    //     data.params.filterTypeUri = DatasetTypes.findOne({ datasetUri: this.uri }).uri; //select first
    //     t.formState.set(data);
    // },
    'click .filter-sub-type-select': function (e, t) {
        e.preventDefault();
        var data = t.formState.get()
        data.params.filterTypeUri = this.uri;
        t.formState.set(data);
    },
    'keyup #idTextArea': function (e, t) {
        e.preventDefault();
        var text = e.target.value;
        var data = t.formState.get()
        data.params.idText = text;
        t.formState.set(data);
    },
    'click #submitIdJob': function (e, t) {
        var job = new Job(Jobs, 'iderdown', {
            // email: "",
            userId: App.dataId.get(),
            params: this.params
        });
        job.save((err, id) => {
            // t.formState.set({})
        });
    }
})