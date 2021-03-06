//This file will contain some app centric stuff.

import { ReactiveVar } from 'meteor/reactive-var';
import { Mongo } from 'meteor/mongo';
import { Random } from 'meteor/random'
import Helpers from './helpers'
import Datasets from './api/datasets/datasets';
import Linksets from './api/linksets/linksets';
import Papa from 'papaparse';
import { DATASETS } from './helpers'
import DatasetTypes from './api/datasetTypes/datasetTypes';

export const EXCEL_ALLOWED = [DATASETS.asgs2016, DATASETS.geofabric, DATASETS.gnaf16];

const JobBuilders = new Mongo.Collection(null);
window.JobBuilders = JobBuilders;

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

export const App = {
    dataId: new ReactiveVar(null),
    isFileOver: new ReactiveVar(false),
    JobBuilders: JobBuilders,
    Helpers,
    files: {},
    uploaders: {},

    humanFileSize(size) {
        var i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    },
    error(err) {
        alert(err);
    },
    message(msg) {
        alert(msg);
    },
    addNewBuilder(file) {
        var clientSideFileId = Random.id();
        this.files[clientSideFileId] = file;

        function insertBuilder(datasetType) {
            if(datasetType) {
                var classTypes = getCompatableDatasetTypes(datasetType);
                var bases = classTypes.filter(x => x.baseType);
            } else {
                bases = [];
            }
            JobBuilders.insert({
                created: new Date(),
                fileId: clientSideFileId,
                fileName: file.name,
                fileSize: file.size,
                hasHeaders: true,
                params: {
                    columnIndex: 0, //default for now
                    inputClassUri: datasetType ? datasetType.uri : null,
                    inputDatasetUri: datasetType ? datasetType.datasetUri : null,
                    outputClassUri: bases.length == 1 ? bases[0].uri : null,
                    outputDatasetUri: bases.length == 1 ? bases[0].datasetUri : null
                },
                status: bases.length == 1 ? 'ready' : 'incomplete'
            })
        }

        guessFileInputDataset(file).then(datasetType => {
            insertBuilder(datasetType);
        }).catch(err => {
            insertBuilder();
        });
    },
    addNewBuilderFromJob(job) {
        JobBuilders.insert({
            jobId: job._id,
            // created: new Date(),
            jobCreated: job.created,
            // fileId: clientSideFileId,
            fileName: job.data.fileName,
            fileSize: job.data.fileSize,
            hasHeaders: job.data.hasHeaders,
            params: {
                columnIndex: job.data.from.columnIndex,
                inputClassUri: job.data.from.classTypeUri,
                inputDatasetUri: job.data.from.datasetUri,
                outputClassUri: job.data.to.classTypeUri,
                outputDatasetUri: job.data.to.datasetUri,
            },
            status: 'submitted'
        })
    }
}

// App.addNewBuilder(testFile);

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
    if (dataTransfer && dataTransfer.files.length > 0) {
        for (var i = 0; i < dataTransfer.files.length; i++) {
            App.addNewBuilder(dataTransfer.files[i]);
        }
    }

    return false;
});

async function guessFileInputDataset(file) {
    return new Promise((resolve, reject) => {
        var rowCount = 0;
        var rows = [];
        Papa.parse(file, {
            header: false,
            preview: 2,
            complete: function (result, file) {
                //assuming first column
                var sampleUri = result.data[1][0];
                Meteor.call("getObjectDatasetType", sampleUri, (error, result) => {
                    if(error) {
                        reject();
                    } else {
                        resolve(result);
                    }
                })
            }
        });
    });
}

export function getCompatableDatasetTypes(datasetType) {
    var datasets = getCompatableDatasets(datasetType.datasetUri);
    return DatasetTypes.find({
        datasetUri: {
            $in: datasets.map(x => x.uri)
        }
    }).fetch();
}

export function getCompatableDatasets(uri) {
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
    //Allow excelerator to covert within the same dataset
    datasetsUris.add(uri);

    var allowed = Array.from(datasetsUris).filter(x => EXCEL_ALLOWED.includes(x));
    return Datasets.find({ uri: { $in: allowed } }, { sort: { title: 1 } }).fetch();
}