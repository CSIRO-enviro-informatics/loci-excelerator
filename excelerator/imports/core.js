//This file will contain some app centric stuff.

import { ReactiveVar } from 'meteor/reactive-var';

export const App = {
    dataId: new ReactiveVar(null),
    isFileOver: new ReactiveVar(false),
    selectedFile: new ReactiveVar(null),
    selectedFileJobParams: new ReactiveVar({}),

    humanFileSize(size) {
        var i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    },
    error(err) {
        alert(err);
    },
    message(msg) {
        alert(msg);
    }
}

const addListener = (target, events, func) => {
    events.forEach((event) => {
        target.addEventListener(event, func, { passive: false, capture: false });
    });
};

let _el = null;
addListener(window, ['dragenter', 'dragover'], (e) => {
    e.stopPropagation();
    e.preventDefault();
    _el = e.target;
    App.isFileOver.set(true);
    e.dataTransfer.dropEffect = 'copy';
    return false;
});

addListener(window, ['dragleave'], (e) => {
    e.stopPropagation();
    if (_el === e.target) {
        App.isFileOver.set(false);
    }
    return false;
});

addListener(window, ['drop'], (e) => {
    e.stopPropagation();
    e.preventDefault();
    App.isFileOver.set(false);

    var dataTransfer = e.dataTransfer;
    if (dataTransfer && dataTransfer.files.length == 1) {
        App.selectedFile.set(dataTransfer.files[0]);
        App.selectedFileJobParams.set({});
    } else {
        App.message("You can only drop 1 file at a time.");
    }
    return false;
});