import './jobCreator.html';
import '../singleJob/singleJob';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core.js'

import '../uploadForm/uploadForm'
import Datasets from '../../../api/datasets/datasets';
import DatasetTypes from '../../../api/datasetTypes/datasetTypes';
import Linksets from '../../../api/linksets/linksets';
import Uploads from '../../../api/uploads/uploads'
import Jobs from '../../../api/jobs/jobs';

window.Linksets = Linksets;
window.Datasets = Datasets;
window.Uploads = Uploads;
window.DatasetTypes = DatasetTypes;
window.Jobs = Jobs;

Template.jobCreator.onCreated(function () {
    var tpl = this;

    Meteor.subscribe('datasets.all');
    Meteor.subscribe('linksets.all');
    Meteor.subscribe('datasetTypes.all');
    Meteor.subscribe("jobs.all");
    Tracker.autorun(function () {
        Meteor.subscribe("jobs.id", App.dataId.get());
        Meteor.subscribe('uploads.user', App.dataId.get());
    })
    Tracker.autorun(function () {
        //show all old jobs by creating fake jobbuilders
        var jobs = Jobs.find({type: 'convert', hide: {$in: [null, false]}}, {fields: { _id: 1, created: 1, data: 1 }});
        jobs.forEach(job => {
            var builder = JobBuilders.findOne({$or: [{jobId: job._id}, {pendingId: true}]});
            if(!builder) {
                App.addNewBuilderFromJob(job);
            }
        })
    })

});

Template.jobCreator.helpers({
    hasStarted() {
        return !!App.JobBuilders.find().count();
    },
    jobBuilders() {
        return App.JobBuilders.find({}, { sort: { created: 1, jobCreated: 1, _id: 1 } });
    },
    canSubmit() {
        return App.JobBuilders.find({ status: 'ready' }).count() > 0;
    },
    isDisabled() {
        return App.JobBuilders.find({ status: 'ready' }).count() == 0 ? { disabled: "" } : {};
    },
    dragging() {
        return App.isFileOver.get();
    },
    readyCount() {
        return App.JobBuilders.find({ status: 'ready' }).count();
    }
});

Template.jobCreator.events({
    'click #submitJobs': async function (e, t) {
        var id = App.dataId.get();

        var builds = App.JobBuilders.find({jobId: null}).fetch();
        builds.forEach(x => App.JobBuilders.update(x._id, {
            $set: {
                pendingId: true,
                status: "started"
            }
        }))

        builds.forEach(async build => {
            var file = App.files[build.fileId];

            try {
                var fileObj = await uploadFile(file, build);
                var job = new Job(Jobs, 'convert', {
                    // email: "",
                    userId: id,
                    fileName: build.fileName,
                    fileSize: build.fileSize,
                    hasHeaders: build.hasHeaders,
                    from: {
                        fileId: fileObj._id,
                        classTypeUri: build.params.inputClassUri,
                        columnIndex: build.params.columnIndex,
                        datasetUri: build.params.inputDatasetUri,
                    },
                    to: {
                        classTypeUri: build.params.outputClassUri,
                        datasetUri: build.params.outputDatasetUri,
                        aggregationFunc: App.Helpers.aggregationMethods.SUM
                    }
                });
                job.save((err, id) => {
                    JobBuilders.update(build._id, {
                        $set: {
                            jobId: id,
                            status: "submitted"
                        }
                    });
                });
            } catch (err) {
                JobBuilders.update(build._id, { $set: { error: err.message } });
            }
        })
    },
    'click #addMore': function (e, t) {
        //this is a bit crap. relying on uploadForm for be rendered
        $('input[type=file]').click();
    }
});

function uploadFile(file, build) {
    return new Promise((resolve, reject) => {
        var id = App.dataId.get();
        const upload = Uploads.insert({
            file: file,
            streams: 'dynamic',
            chunkSize: 'dynamic',
            meta: {
                userId: id
            },
        }, false);

        upload.on('start', function (error, fileObj) {
            var id = this.config.fileId;
            App.uploaders[id] = this;
            JobBuilders.update(build._id, {
                $set: {
                    uploadId: id,
                    status: 'uploading'
                }
            });
        });

        upload.on('end', function (error, fileObj) {
            if (error)
                reject(error);
            else {
                var id = this.config.fileId;
                JobBuilders.update(build._id, {
                    // $unset: { uploadId: "" },
                    $set: { uploadComplete: true }
                });
                delete App.uploaders[id];
                resolve(fileObj);
            }
        });

        upload.start();
    })
}
