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
        return App.JobBuilders.find({ status: 'incomplete' }) == 0;
    },
    isDisabled() {
        return App.JobBuilders.find({ status: 'incomplete' }).count() > 0 ? { disabled: "" } : {};
    },
    dragging() {
        return App.isFileOver.get();
    },
});

Template.jobCreator.events({
    'click #submitJobs': async function (e, t) {
        var id = App.dataId.get();

        var builds = App.JobBuilders.find().fetch();
        builds.forEach(x => App.JobBuilders.update(x._id, {
            $set: {
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
                    hasHeaders: build.hasHeaders,
                    from: {
                        fileId: fileObj._id,
                        datasetUri: build.params.inputUri,
                        columnIndex: build.params.columnIndex
                    },
                    to: {
                        datasetUri: build.params.outputUri,
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
