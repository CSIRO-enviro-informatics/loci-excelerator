//This file will contain some app centric stuff.

import { ReactiveVar } from 'meteor/reactive-var';

export const App = {
    dataId: new ReactiveVar(null),
    selectedFile: new ReactiveVar(null),

    humanFileSize(size) {
        var i = Math.floor( Math.log(size) / Math.log(1024) );
        return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    }
}

