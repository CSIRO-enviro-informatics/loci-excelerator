import Uploads from './api/uploads/uploads'
import { Meteor } from 'meteor/meteor'
import fs from 'fs';
import Papa from 'papaparse';
import Linksets from './api/linksets/linksets';
import { getQueryResults, KNOWN_PREDS } from './linksetApi';
import Helpers from './helpers';
import { isNumber } from 'util';

export function convert(job, cb) {

    // var count = 1;
    // var timerId = Meteor.setInterval(() => {
    //     count++;
    //     job.progress(count * 10, 100);
    //     if (count == 10) {
    //         Meteor.clearInterval(timerId);
    //         // job.done();
    //         // cb()
    //         realWork();
    //     }
    // }, 2000);

    realWork(); //This was a function for the progress stuff above. Take it out 

    function realWork() {

        var jobData = job.data;

        var file = Uploads.findOne({ _id: jobData.from.fileId });
        var inputFile = file.get('path');
        var outputFile = `${Meteor.settings.public.uploads.path}/converted_${file.get("_id")}`;

        const inputStream = fs.createReadStream(inputFile);
        const outputStream = fs.createWriteStream(outputFile);
        const csvStream = inputStream.pipe(Papa.parse(Papa.NODE_STREAM_INPUT));

        function failAndCleanUp(err) {
            console.log(err);
            inputStream.destroy();
            outputStream.destroy();
            csvStream.destroy();
            job.fail();
            cb();
        }

        //read all in memeory implementation
        var data = [];

        csvStream.on('data', function (item) {
            data.push(item);
        });

        csvStream.on('error', (err) => {
            failAndCleanUp(err);
        })

        csvStream.on('end', () => {
            try {
                processData(data, job, outputStream);
            } catch (err) {
                failAndCleanUp(err);
            }
        })

        outputStream.on('error', (err) => {
            failAndCleanUp(err);
        })

        outputStream.on('finish', () => {
            var metadata = file.get('meta');

            Uploads.addFile(outputFile, {
                fileName: `converted - ${file.get('name')}`,
                type: "text/csv",
                meta: {
                    userId: metadata.userId,
                    inputFileId: jobData.from.fileId,
                    jobId: job._id
                },
            }, (err, fileObj) => {
                if (err) {
                    job.fail();
                } else {
                    var fileId = fileObj._id;
                    job.done({ fileId });
                }
                cb();
            });
        })
    }
}

function processData(data, job, outputStream) {
    var jobData = job.data;
    var linkset = Linksets.findOne({ subjectsTarget: jobData.from.datasetUri, objectsTarget: jobData.to.datasetUri });
    var isReverse = false; //is the dataset going from subject to object
    if (!linkset) {
        isReverse = true;
        linkset = Linksets.findOne({ subjectsTarget: jobData.to.datasetUri, objectsTarget: jobData.from.datasetUri });
    }

    if (!linkset) {
        throw new Meteor.Error(`No linkset exists to map these datasets ${jobData.from.datasetUri} --> ${jobData.to.datasetUri}`);
    }

    var predicates = linkset.linkPredicates;

    //Need to put MB areas in the graph
    var dataCache = {};
    var skipped = [];

    data.forEach((row, i) => {
        if (jobData.from.header && i == 0)
            row.push(jobData.to.datasetUri);
        else {
            var fromUri = row[jobData.from.columnIndex];
            if (!fromUri)
                throw new Meteor.Error(`Undefined uri in row ${i}`);

            predicates.forEach(pred => {
                if (pred === KNOWN_PREDS.sfWithin) {
                    var toObjects = getStatements(fromUri, isReverse, pred, linkset.uri);

                    if (isReverse) {
                        //contains many

                    } else {
                        //assuming within one
                        if (toObjects.length > 1) {
                            throw new Meteor.Error(`${fromUri} in row ${i} is within many, and we dont handle that yet.`);
                        } else if (toObjects.length == 0) {
                            skipped.push(row);
                        } else {
                            var toUri = toObjects[0].uri;
                            if (!dataCache[toUri]) {
                                var zeros = {};
                                row.forEach((val, colIndex) => {
                                    if(colIndex != jobData.from.columnIndex) {
                                        dataCache[toUri][colIndex] = 0;
                                    }
                                });
                                dataCache[toUri] = zeros;
                            }
                            
                            row.forEach((val, colIndex) => {
                                if(colIndex != jobData.from.columnIndex) {
                                    switch(jobData.to.aggregationFunc) {
                                        case Helpers.aggregationMethods.COUNT:
                                            dataCache[toUri][colIndex] += val;
                                            break;
                                        default: 
                                            throw new Meteor.Error(`Aggregation method '${jobData.to.aggregationFunc}' not yet implemented`);    
                                    }
                                }
                            });
    
                        }
                    }
                } else {
                    throw new Meteor.Error(`Unknown predicate in linkset ${pred}`);
                }
            })
            row.push("Shane Test");
        }
    })

    data.forEach((row, i) => {
        if (jobData.from.header && i == 0)
            row.push(jobData.to.datasetUri);
        else {
            row.push("Shane Test");
        }
        // var rowText = row.join(', '); need to factor in delimiters
        var rowText = Papa.unparse([row], { header: false });
        outputStream.write(rowText + "\n");
    })
    outputStream.end();
}

function getStatements(fromUri, isReverse, predUri, linksetUri) {
    var toVar = "?to";
    var wrappedUri = `<${fromUri}>`;
    var subjectText = isReverse ? toVar : wrappedUri;
    var objectText = isReverse ? wrappedUri : toVar;
    var query = `PREFIX void: <http://rdfs.org/ns/void#>
PREFIX loci: <http://linked.data.gov.au/def/loci#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX dct: <http://purl.org/dc/terms/>
SELECT *
WHERE {
    ?s dct:isPartOf <${linksetUri}> ;
       rdf:subject ${subjectText} ;
       rdf:predicate <${predUri}> ;
       rdf:object ${objectText} .
    ${toVar} rdf:type ?t .
}`;

    var results = getQueryResults(query);
    try {
        var result = getQueryResults(linksetQuery);
        var json = JSON.parse(result.content);
        var bindings = json.results.bindings;
        var matches = bindings.map(b => ({ uri: b.to.value, type: b.t.value }))
        return matches;
    } catch (e) {
        console.log(e)
        throw e;
    }
}