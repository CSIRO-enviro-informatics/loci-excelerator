import './uploadForm.html';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import Uploads from '../../../api/uploads/uploads'


Template.uploadForm.onCreated(function () {
    this.currentUpload = new ReactiveVar(false);
});

Template.uploadForm.helpers({
    currentUpload() {
        return Template.instance().currentUpload.get();
    }
});

Template.uploadForm.events({
    "dragover #dropzone, dragenter #dropzone": function (e, t) {
        e.preventDefault();
        e.stopPropagation();
        e.originalEvent.dataTransfer.dropEffect = 'copy';
    },
    "drop #dropzone": function (e, t) {
        var dataTransfer = e.originalEvent.dataTransfer;
        if (dataTransfer && dataTransfer.files.length == 1) {
            e.preventDefault();
            e.stopPropagation();
            e.originalEvent.dataTransfer.dropEffect = 'copy';
            uploadFiles(dataTransfer.files[0], t);
        }
    },
    "click #dropzone": function (e, t) {
        $('input[type=file]').click();
    },
    "change input[type=file]": function (e, t) {
        var files = e.target.files;
        if (files && files.length == 1) {
            uploadFiles(files[0], t);
        }
    }
});

function uploadFiles(file, template) {
    const upload = Uploads.insert({
        file: file,
        streams: 'dynamic',
        chunkSize: 'dynamic',
        onProgress: (progress) => console.log(progress),
    }, false);

    upload.on('start', function () {
        window.a = this;
        console.log(this);
        template.currentUpload.set(this);
    });

    upload.on('end', function (error, fileObj) {
        if (error) {
            alert('Error during upload: ' + error);
        } else {
            alert('File "' + fileObj.name + '" successfully uploaded');
        }
        template.currentUpload.set(false);
    });

    upload.start();
}
