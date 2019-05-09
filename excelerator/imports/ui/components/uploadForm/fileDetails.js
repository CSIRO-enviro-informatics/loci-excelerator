import './fileDetails.html'
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { App } from '../../../core'
import Papa from 'papaparse'

Template.fileDetails.onCreated( function () {
    var tpl = this;
    tpl.rows = new ReactiveVar(null);

    Tracker.autorun(async function () {
        var file = App.selectedFile.get();
        if (file) {
            var rows = await getFileDetails(file);
            tpl.rows.set(rows);
            console.log(rows);
        } else {
            tpl.rows.set(null);
            clearFileDetails();
        }
    })
})

const MAX_ROWS = 10;

Template.fileDetails.helpers({
    rows: function () {
        return Template.instance().rows.get();
    },
    cells: function () {
        var row = this;
        return row.map((val) => ({ val }));
    },
    filename: function () {
        var file = App.selectedFile.get();
        return file && file.name;
    },
    size: function() {
        var file = App.selectedFile.get();
        return file && App.humanFileSize(file.size);
    }
})

function clearFileDetails() {
}

async function getFileDetails(file) {
    return new Promise((resolve, reject) => {
        var rowCount = 0;
        var rows = [];
        Papa.parse(file, {
            // worker: true,
            step: function (result, parser) {
                if (rowCount >= 5) {
                    parser.abort();
                } else {
                    rows = rows.concat(result.data);
                    rowCount++;
                }
            },
            complete: function (result, file) {
                //result.meta.aborted
                resolve(rows);
            }
        });
    });
}