import './singleJob.html';
import '../uploadForm/fileDetails';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core.js'

import '../uploadForm/uploadForm'
import Datasets from '../../../api/datasets/datasets';
import Linksets from '../../../api/linksets/linksets';
import Uploads from '../../../api/uploads/uploads'
import Jobs from '../../../api/jobs/jobs';

Template.singleJob.onCreated(function () {
    var tpl = this;

    tpl.currentUpload = new ReactiveVar(false);
    tpl.currentJobId = new ReactiveVar();
});

Template.singleJob.helpers({
    humanFileSize() {
        return App.humanFileSize(this.fileSize);
    },
    datasets() {
        return Datasets.find({}, { sort: { title: 1 } });
    },
    status() {
        return this.status;
    },
    inputLabel() {
        var input = Datasets.findOne({ uri: this.params.inputUri });
        return input ? input.title : "Unknown";
    },
    isActive(a, b) {
        return a == b ? "active" : "";
    },
    outputLabel() {
        var output = Datasets.findOne({ uri: this.params.outputUri });
        return output ? output.title : "Unknown";
    },
    availableOutputs() {
        var params = this.params;
        if (params && params.inputUri) {
            var uri = params.inputUri;
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
            return Datasets.find({ uri: { $in: Array.from(datasetsUris) } }, { sort: { title: 1 } });
        }
    },
    currentUpload() {
        return Template.instance().currentUpload.get();
    },
    currentJob() {
        var jobId = Template.instance().currentJobId.get();
        return Jobs.findOne({ _id: jobId });
    },
    outputfile() {
        var jobId = Template.instance().currentJobId.get();
        var job = Jobs.findOne({ _id: jobId });
        var result = job.result;
        return Uploads.findOne({ _id: result.fileId });
    },
});

Template.singleJob.events({
    'click .input-select': function (e, t) {
        var build = Template.currentData();
        build.params.inputUri = this.uri;
        delete build.params.outputUri;
        App.JobBuilders.update(build._id, {
            $set: {
                params: build.params
            }
        });
    },
    'click .output-select': function (e, t) {
        var build = Template.currentData();
        App.JobBuilders.update(build._id, {
            $set: {
                "params.outputUri": this.uri
            }
        });
    },
    'click #submitJob': function (e, t) {
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
