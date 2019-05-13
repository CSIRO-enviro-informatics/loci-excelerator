import './jobCreator.html';
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

Template.jobCreator.onCreated(function () {
    var tpl = this;

    tpl.currentUpload = new ReactiveVar(false);
    tpl.currentJobId = new ReactiveVar();

    Meteor.subscribe('datasets.all');
    Meteor.subscribe('linksets.all');
    Meteor.subscribe("jobs.all");
    Tracker.autorun(function () {
        Meteor.subscribe("jobs.id", App.dataId.get());
        Meteor.subscribe('uploads.user', App.dataId.get());
    })
});

Template.jobCreator.helpers({
    hasStarted() {
        return !!App.JobBuilders.find().count();
    },
    jobBuilders() {
        return App.JobBuilders.find();
    },
    canSubmit() {
        return App.JobBuilders.find({status: 'incomplete'}) == 0;
    },
    isDisabled() {
        return App.JobBuilders.find({status: 'incomplete'}).count() > 0 ? {disabled: ""} : {};
    },
    dragging() {
        return App.isFileOver.get();
    }
});

Template.jobCreator.events({
    'click #submitJobs': function (e, t) {
        var file = App.selectedFile.get();
        var params = App.selectedFileJobParams.get();
        var id = App.dataId.get();

        uploadFile(file, t, function (err, fileObj) {
            if (err) {
                App.error(err);
            } else {
                var job = new Job(Jobs, 'convert', {
                    // email: "",
                    userId: id,
                    from: {
                        fileId: fileObj._id,
                        datasetUri: params.inputUri,
                        columnIndex: 0
                    },
                    to: {
                        datasetUri: params.outputUri,
                        aggregationFunc: 'count'
                    }
                });
                job.save((err, id) => {
                    t.currentJobId.set(id);
                });
            }
        })
    }
});

function uploadFile(file, template, cb) {
    var id = App.dataId.get();
    const upload = Uploads.insert({
        file: file,
        streams: 'dynamic',
        chunkSize: 'dynamic',
        meta: {
            userId: id 
        },
    }, false);

    upload.on('start', function () {
        template.currentUpload.set(this);
    });

    upload.on('end', function (error, fileObj) {
        template.currentUpload.set(false);
        cb(error, fileObj)
    });

    upload.start();
}
