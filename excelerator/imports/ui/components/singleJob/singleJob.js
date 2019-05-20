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
        if(this.error) return "error";
        if(this.jobId) {
            var job = Jobs.findOne({ _id: this.jobId });
            return job.status;
        }
        return this.status;
    },
    statusClass() {
        if(this.error) return "text-danger";
        switch(this.status) {
            case "ready":
            case "complete":
                return 'text-success';
            default:
                return 'text-warning';
        }
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
    building() {
        return this.status == "incomplete" || this.status == "ready";
    },
    uploader() {
        return this.uploadId && App.uploaders[this.uploadId];
    },
    currentJob() {
        return Jobs.findOne({ _id: this.jobId });
    },
    outputfile() {
        var jobId = Template.instance().data.jobId;
        var job = Jobs.findOne({ _id: jobId });
        return job && job.result && Uploads.findOne({ _id: job.result.fileId });
    },
});

Template.singleJob.events({
    'click .input-select': function (e, t) {
        e.preventDefault();
        var build = Template.currentData();
        build.params.inputUri = this.uri;
        delete build.params.outputUri;
        App.JobBuilders.update(build._id, {
            $set: {
                params: build.params,
                status: "incomplete"
            }
        });
    },
    'click .output-select': function (e, t) {
        e.preventDefault();
        var build = Template.currentData();
        App.JobBuilders.update(build._id, {
            $set: {
                "params.outputUri": this.uri,
                status: "ready"
            }
        });
    },
    'click .close': function(e, t) {
        var build = Template.currentData(); 
        App.JobBuilders.remove(build._id);
    },
});