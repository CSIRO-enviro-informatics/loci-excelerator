import Uploads from './api/uploads/uploads'
import { Meteor } from 'meteor/meteor'
import fs from 'fs';
import Papa from 'papaparse';
import Linksets from './api/linksets/linksets';
import Datasets from './api/datasets/datasets';
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
            job.fail(err);
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

        csvStream.on('end', Meteor.bindEnvironment(() => {
            try {
                processData(data, job, outputStream);
            } catch (err) {
                failAndCleanUp(err);
            }
        }))

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

    var fromDataset = Datasets.findOne({ uri: jobData.from.datasetUri });
    if (!fromDataset) {
        throw new Meteor.Error(`The from dataset cannot be found ${jobData.from.datasetUri}`);
    }
    var toDataset = Datasets.findOne({ uri: jobData.to.datasetUri });
    if (!toDataset) {
        throw new Meteor.Error(`The to dataset cannot be found ${jobData.to.datasetUri}`);
    }


    var predicates = linkset.linkPredicates;

    //Need to put MB areas in the graph
    var dataCache = {};
    var skipped = [];

    var lastUpdate = new Date();

    data.forEach((row, i) => {
        var sinceUpdate = new Date() - lastUpdate;
        if (sinceUpdate > 1000) {
            lastUpdate = new Date();
            job.progress(i, data.length);
        }

        if (!(jobData.hasHeaders && i == 0)) {
            var fromUri = row[jobData.from.columnIndex];
            if (!fromUri)
                throw new Meteor.Error(`Undefined uri in row ${i}`);

            var predicateSuccess = false; //making assumption that only a single predicate should match a given row.
            predicates.forEach(pred => {
                if (!predicateSuccess) {
                    if (pred === KNOWN_PREDS.sfWithin || pred === KNOWN_PREDS.sfEquals) {
                        var toObjects = getStatements(fromUri, isReverse, pred, linkset.uri);

                        if (isReverse && pred === KNOWN_PREDS.sfWithin) { //the reverse is the same for sfequals
                            //contains many
                            if (toObjects.length != 0) {
                                predicateSuccess = true;
                                var hasAreas = toObjects.every(toObj => !!toObj.area && toObj.fromArea);
                                toObjects.forEach(toObj => {
                                    prepareCache(dataCache, toObj.uri, row, jobData);
                                    if (hasAreas) {
                                        var proportionToGive = toObj.area / toObj.fromArea;
                                        addToCache(dataCache, toObj.uri, row, jobData, val => val * proportionToGive);
                                    } else {
                                        addToCache(dataCache, toObj.uri, row, jobData, val => val);
                                        dataCache[toObj.uri].unapportioned = fromUri; //flags as dont know what to do
                                    }
                                });
                            }
                        } else {
                            //assuming within one
                            if (toObjects.length > 1) {
                                throw new Meteor.Error(`${fromUri} in row ${i} has many '${pred}' statements, and we dont handle that yet.`);
                            } else if (toObjects.length == 1) {
                                predicateSuccess = true;
                                var toUri = toObjects[0].uri;
                                prepareCache(dataCache, toUri, row, jobData);
                                addToCache(dataCache, toUri, row, jobData, val => val);
                            }
                        }
                    } else if (pred === KNOWN_PREDS.transitiveSfOverlap) {
                        var statements = getOverlapStatements(fromUri, isReverse, pred, linkset.uri);

                        if (statements.length != 0) {
                            predicateSuccess = true;
                            statements.forEach(statement => {
                                if (statement.to.unit != statement.from.unit || statement.to.unit != statement.overlap.unit)
                                    throw new Meteor.Error(`Mixed units found for conversion of row ${i}, col ${colIndex}. We dont handle that yet`);

                                var toUri = statement.to.uri;
                                prepareCache(dataCache, toUri, row, jobData);
                                var proportionToGive = statement.overlap.area / statement.from.area;
                                addToCache(dataCache, toUri, row, jobData, val => val * proportionToGive);
                            })
                        }
                    } else {
                        throw new Meteor.Error(`Unknown predicate in linkset ${pred}`);
                    }
                }
            })
            if (!predicateSuccess)
                skipped.push(row); //this row had no matches
        }
    })

    job.progress(data.length, data.length);

    var hasUnknowns = dataCache.find(x => x.unapportioned);

    //write the headers
    if (jobData.hasHeaders) {
        var headerRow = data[0];
        headerRow[jobData.from.columnIndex] = toDataset.title;
        if (hasUnknowns) {
            headerRow.push("Originating URI");
        }
        var rowText = Papa.unparse([headerRow], { header: false });
        outputStream.write(rowText + "\n");
    }

    //write the data rows
    Object.keys(dataCache).sort().forEach((toUri, i) => {
        var totals = dataCache[toUri];
        var rowValues = totals.map((tots, colIndex) => {
            switch (jobData.to.aggregationFunc) {
                case Helpers.aggregationMethods.SUM:
                    return tots.total;
                case Helpers.aggregationMethods.COUNT:
                    return tots.count;
                case Helpers.aggregationMethods.AVG:
                    return tots.total / tots.count;
                default:
                    throw new Meteor.Error(`Aggregation method '${jobData.to.aggregationFunc}' not yet implemented`);
            }
        });
        rowValues[jobData.from.columnIndex] = toUri;

        if (hasUnknowns) {
            if (totals.unapportioned) {
                rowValues = rowValues.map(x => "?" + x);
                rowValues.push(totals.unapportioned);
            } else {
                rowValues.push(''); //just a placeholder for nothing
            }
        }

        var rowText = Papa.unparse([rowValues], { header: false });
        outputStream.write(rowText + "\n");
    })

    //do something with skipped rows.
    console.log(skipped); //something better than this

    outputStream.end();
}

function prepareCache(dataCache, toUri, row, jobData) {
    if (!dataCache[toUri]) {
        var zeros = [];
        row.forEach((val, colIndex) => {
            if (colIndex != jobData.from.columnIndex) {
                zeros[colIndex] = { total: 0, count: 0 };
            }
        });
        dataCache[toUri] = zeros;
    }
}

function addToCache(dataCache, toUri, row, jobData, valFunc) {
    row.forEach((colVal, colIndex) => {
        if (colIndex != jobData.from.columnIndex) {
            if (isNaN(colVal))
                throw new Meteor.Error(`Value "${colVal}" found in row ${i}, col ${colIndex} is not a number.`);

            var val = valFunc(+colVal)
            switch (jobData.to.aggregationFunc) {
                case Helpers.aggregationMethods.SUM:
                case Helpers.aggregationMethods.COUNT:
                case Helpers.aggregationMethods.AVG:
                    dataCache[toUri][colIndex].total += +val;
                    dataCache[toUri][colIndex].count++;
                    break;
                default:
                    throw new Meteor.Error(`Aggregation method '${jobData.to.aggregationFunc}' not yet implemented`);
            }
        }
    });
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
    OPTIONAL {
        ${subjectText} dbp:area [ nv: ?subArea ;
                        qu: ?subUnit ] .
    }
    OPTIONAL {
        ${objectText} dbp:area [ nv: ?objArea ;
                        qu: ?objUnit ] .    
    }
}`;

    try {
        var result = getQueryResults(query);
        var json = JSON.parse(result.content);
        var bindings = json.results.bindings;
        var matches = bindings.map(b => {
            var matchObj = {
                uri: b.to.value,
                type: b.t.value
            };
            if (isReverse) {
                if (b.objArea)
                    matchObj.fromArea = b.objArea.value;
                if (b.subArea)
                    matchObj.area = b.subArea.value;
            } else {
                if (b.subArea)
                    matchObj.fromArea = b.subArea.value;
                if (b.objArea)
                    matchObj.area = b.objArea.value;
            }
            return matchObj;
        })
        return matches;
    } catch (e) {
        console.log(e)
        throw e;
    }
}

function getOverlapStatements(fromUri, isReverse, predUri, linksetUri) {
    var filterExp = `${isReverse ? '?obj' : '?sub'} = <${fromUri}>`
    var query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX dct: <http://purl.org/dc/terms/>
prefix dbp: <http://dbpedia.org/property/>
PREFIX nv: <http://qudt.org/schema/qudt#numericValue>
PREFIX qu: <http://qudt.org/schema/qudt#unit>
PREFIX m2: <http://qudt.org/schema/qudt#SquareMeter>
PREFIX c: <http://www.opengis.net/ont/geosparql#sfContains>
PREFIX f: <http://www.opengis.net/ont/geosparql#Feature>
PREFIX l: <${linksetUri}>

SELECT ?sub ?subArea ?subUnit ?obj ?objArea ?objUnit ?intersectArea ?intersectUnit
WHERE {
    ?s dct:isPartOf l: ;
        rdf:subject ?sub;
        rdf:predicate <${predUri}> ;
        rdf:object ?obj .
    ?sub dbp:area [ nv: ?subArea ;
            qu: ?subUnit ] .
    ?obj dbp:area [ nv: ?objArea ;
            qu: ?objUnit ] .    
    ?intersect a f: ;
        dbp:area [ nv: ?intersectArea ;
            qu: ?intersectUnit ] .     
    ?overlap1 dct:isPartOf l: ;
        rdf:subject ?sub ;
        rdf:predicate c: ;
            rdf:object ?intersect .    
    ?overlap2 dct:isPartOf l: ;
        rdf:subject ?obj  ;
        rdf:predicate c: ;
            rdf:object ?intersect .
    FILTER(${filterExp})
}`;

    try {
        var result = getQueryResults(query);
        var json = JSON.parse(result.content);
        var bindings = json.results.bindings;
        var matches = bindings.map(b => ({
            from: {
                uri: isReverse ? b.obj.value : b.sub.value,
                unit: isReverse ? b.objUnit.value : b.subUnit.value,
                area: isReverse ? b.objArea.value : b.subArea.value,
            },
            to: {
                uri: isReverse ? b.sub.value : b.obj.value,
                unit: isReverse ? b.subUnit.value : b.objUnit.value,
                area: isReverse ? b.subArea.value : b.objArea.value,
            },
            overlap: {
                unit: b.intersectUnit.value,
                area: b.intersectArea.value,
            },
        }))
        return matches;
    } catch (e) {
        console.log(e)
        throw e;
    }
}