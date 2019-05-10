import './jobCreator.html';
import '../uploadForm/fileDetails';

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

var testFile = new File([`owner_name,wcode,station_no,short_name,long_name,spatial_reference_system,latitude,longitude,parameter,from,to
Icon Water Limited,w00002,340000,Cotter U/S Stockyard,Cotter River upstream Stockyard Creek,WGS84 (3D),-35.4819,148.819,WaterCourseDischarge,2003-08-20 14:00:00,2012-02-29 14:00:00
Icon Water Limited,w00002,41001701,Numeralla @ Chakola,Numeralla River @ Chakola,WGS84 (3D),-36.1105,149.196,WaterCourseDischarge,2010-01-07 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,41001702,Murr U/S Angle Xing,Murrumbidgee River U/S Angle Crossing,WGS84 (3D),-35.5857,149.114,WaterCourseDischarge,2009-11-11 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410700,Cotter R. at Kiosk,Cotter River at Kiosk,WGS84 (3D),-35.324,148.942,WaterCourseDischarge,1910-02-25 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410705,Molonglo at Burbong,Molonglo River at Burbong,WGS84 (3D),-35.3356,149.313,WaterCourseDischarge,1929-03-13 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410711,Gudgenby R. at Naas,Gudgenby River at Naas,WGS84 (3D),-35.5954,149.046,WaterCourseDischarge,1962-03-01 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410713,Paddy's at Riverlea,Paddy's River at Riverlea,WGS84 (3D),-35.3828,148.967,WaterCourseDischarge,1957-03-28 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410719,Cotter above Bendora,Cotter River above Bendora,AGD66,-35.4833,148.833,WaterCourseDischarge,1962-11-06 14:00:00,1972-01-26 14:00:00
Icon Water Limited,w00002,410725,Cotter Vanitys Xing,Cotter River at Vanity's Crossing,WGS84 (3D),-35.3461,148.889,WaterCourseDischarge,1987-11-17 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410730,Cotter R. at Gingera,Cotter River at Gingera,WGS84 (3D),-35.5881,148.822,WaterCourseDischarge,1963-07-02 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410731,Gudgenby at Tennent,Gudgenby River at Tennent,WGS84 (3D),-35.5722,149.068,WaterCourseDischarge,1964-11-11 14:00:00,2019-04-15 14:00:00
Icon Water Limited,w00002,410733,Condor at Threeways,Condor Creek at Threeways,WGS84 (3D),-35.3302,148.888,WaterCourseDischarge,1964-07-28 14:00:00,2019-04-15 14:00:00
Icon`], "testing file.csv");

App.selectedFile.set(testFile);

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
    showFileSelect() {
        return !App.selectedFile.get();
    },
    showFileDetails() {
        return App.selectedFile.get();
    },
    datasets() {
        return Datasets.find({}, { sort: { title: 1 } });
    },
    isInputActive() {
        var params = App.selectedFileJobParams.get();
        return params.inputUri == this.uri && "active";
    },
    isOutputActive() {
        var params = App.selectedFileJobParams.get();
        return params.outputUri == this.uri && "active";
    },
    availableOutputs() {
        var params = App.selectedFileJobParams.get();
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
    canSubmit() {
        var params = App.selectedFileJobParams.get();
        return params && params.inputUri && params.outputUri;
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
        return Uploads.findOne({_id: result.fileId});
    },
});

Template.jobCreator.events({
    'click .input-dataset-btn': function (e, t) {
        var params = App.selectedFileJobParams.get();
        params.inputUri = this.uri;
        delete params.outputUri;
        App.selectedFileJobParams.set(params);
    },
    'click .output-dataset-btn': function (e, t) {
        var params = App.selectedFileJobParams.get();
        params.outputUri = this.uri;
        App.selectedFileJobParams.set(params);
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
