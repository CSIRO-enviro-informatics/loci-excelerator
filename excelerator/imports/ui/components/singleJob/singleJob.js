import './singleJob.html';
import '../uploadForm/fileDetails';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App, getCompatableDatasets, EXCEL_ALLOWED } from '../../../core.js'

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
        //hack to limit dataset
        return Datasets.find({ uri: { $in: EXCEL_ALLOWED } }, { sort: { title: 1 } });
    },
    status() {
        var job = Jobs.findOne({ _id: this.jobId });

        if (this.error)
            return "error";
        if (job) {
            if (job.status == 'ready') {
                var stat = 'queued'
                if (!isNaN(job.queuePos))
                    stat += ` #${job.queuePos + 1}`;
                return stat;
            } else
                return job.status;
        }
        return this.status;
    },
    statusClass() {
        if (this.error) return "text-danger";
        switch (this.status) {
            case "ready":
            case "complete":
                return 'text-success';
            default:
                return 'text-warning';
        }
    },
    inputLabel() {
        var input = Datasets.findOne({ uri: this.params.inputUri });
        return input && EXCEL_ALLOWED.includes(this.params.inputUri) ? input.title : "Unknown";
    },
    isActive(a, b) {
        return a == b ? "active" : "";
    },
    outputLabel() {
        var output = Datasets.findOne({ uri: this.params.outputUri });
        return output && EXCEL_ALLOWED.includes(this.params.inputUri) ? output.title : "Unknown";
    },
    availableOutputs() {
        var params = this.params;
        if (params && params.inputUri) {
            return getCompatableDatasets(params.inputUri);
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
    isDevelopment() {
        return Meteor.isDevelopment;
    },
    failedText() {
        var jobId = Template.instance().data.jobId;
        var job = Jobs.findOne({ _id: jobId });
        return job.failures[0].message;
    },
    waiting() {
        if (this.status == 'submitted') {
            var job = Jobs.findOne({ _id: this.jobId });
            if (job)
                return job.status == 'waiting' || job.status == 'ready';
            else
                return true;
        }
    }
});

Template.singleJob.events({
    'click .input-select': function (e, t) {
        e.preventDefault();
        var build = Template.currentData();
        build.params.inputUri = this.uri;
        var available = getCompatableDatasets(this.uri);
        if(available.length == 1) {
            build.params.outputUri = available[0].uri;
        } else {
            delete build.params.outputUri;
        }

        App.JobBuilders.update(build._id, {
            $set: {
                params: build.params,
                status: build.params.outputUri ? 'ready' : 'incomplete'
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
    'click .close': function (e, t) {
        var build = Template.currentData();
        if (build.jobId) {
            Meteor.call("jobs.hide", build.jobId, function () {
                App.JobBuilders.remove(build._id);
            });
        } else {
            App.JobBuilders.remove(build._id);
        }
    },
    'click #retryJob': function (e, t) {
        var build = this;
        job = new Job(Jobs, Jobs.findOne({ _id: build.jobId }));
        var something = job.rerun({ wait: 0 }, function (err, newId) {
            if (err)
                App.error(err);
            else {
                console.log(`Rerun id: ${newId}`);
                JobBuilders.update(build._id, {
                    $set: {
                        jobId: newId
                    }
                });
            }
        });
    }
});
