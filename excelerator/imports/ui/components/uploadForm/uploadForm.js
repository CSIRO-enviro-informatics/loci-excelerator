import './uploadForm.html';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import Uploads from '../../../api/uploads/uploads'
import { App } from '../../../core.js'

Template.uploadForm.onCreated(function () {
});

Template.uploadForm.helpers({
});

Template.uploadForm.events({
    // "dragover #dropzone, dragenter #dropzone": function (e, t) {
    //     e.preventDefault();
    //     e.stopPropagation();
    //     e.originalEvent.dataTransfer.dropEffect = 'copy';
    //     t.dragging.set(true);
    // },
    // "drop #dropzone": function (e, t) {
    //     var dataTransfer = e.originalEvent.dataTransfer;
    //     if (dataTransfer && dataTransfer.files.length == 1) {
    //         e.preventDefault();
    //         e.stopPropagation();
    //         e.originalEvent.dataTransfer.dropEffect = 'copy';
    //         selectFile(dataTransfer.files[0]);
    //         t.dragging.set(false);
    //     } else {
    //         App.message("You can only drop 1 file at a time.");
    //     }
    // },
    "click #dropzone": function (e, t) {
        $('input[type=file]').click();
    },
    "change input[type=file]": function (e, t) {
        var files = e.target.files;
        if (files && files.length == 1) {
            selectFile(files[0]);
        }
    }
});

function selectFile(file) {
    App.selectedFile.set(file);
}