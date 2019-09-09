import './iderdownJob.html';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core.js'

import '../uploadForm/uploadForm'
import Datasets from '../../../api/datasets/datasets';
import Uploads from '../../../api/uploads/uploads'
import Jobs from '../../../api/jobs/jobs';

Template.iderdownJob.helpers({
    jobText() {
        var outputType = DatasetTypes.findOne({ uri: this.data.params.outputTypeUri });
        var filterType = DatasetTypes.findOne({ uri: this.data.params.filterTypeUri });

        return `${outputType.title} by ${filterType.title}`;
    },
    humanFileSize() {
        return App.humanFileSize(this.fileSize);
    },
    datasets() {
        return Datasets.find({}, { sort: { title: 1 } });
    },
    status() {
        if (this.status == 'ready') {
            var stat = 'queued'
            if (!isNaN(this.queuePos))
                stat += ` #${this.queuePos + 1}`;
            return stat;
        } else
            return this.status;
    },
    statusClass() {
        if (this.status == 'error') return "text-danger";
        switch (this.status) {
            case "ready":
            case "complete":
                return 'text-success';
            default:
                return 'text-warning';
        }
    },
    outputfile() {
        return Uploads.findOne({ _id: this.result.fileId });
    },
    failedText() {
        return this.failures[0].message;
    },
    waiting() {
        return this.status == 'waiting' || this.status == 'ready';
    }
});

Template.iderdownJob.events({
    'click .close': function (e, t) {
        var jobObj = this;
        var j = new Job(Jobs, jobObj);
        //cancel if from the queue if possible
        j.cancel({}, (err, res) => {
            Meteor.call("jobs.hide", jobObj._id, function () {
            });    
        })
    },
});
