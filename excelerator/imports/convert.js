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
            inputStream.destroy();
            outputStream.destroy();
            csvStream.destroy();
            console.log(err);
            job.fail({
                message:  Helpers.trimChar(Helpers.trimChar(err.message,'['), ']'),
                code: err.code
            });
            cb();
        }

        //read all in memeory implementation
        var data = [];
        var skipped = [];

        csvStream.on('data', function (item) {
            data.push(item);
        });

        csvStream.on('error', (err) => {
            failAndCleanUp(err);
        })

        csvStream.on('end', Meteor.bindEnvironment(() => {
            try {
                var result = processData(data, job, outputStream);
                skipped = result.skipped;
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
                    jobId: job._doc._id
                },
            }, (err, fileObj) => {
                if (err) {
                    job.fail();
                } else {
                    var fileId = fileObj._id;
                    job.done({ 
                        fileId, 
                        // skipped: skipped //not adding yet as could make job object too big
                    });
                }
                cb();
            });
        })
    }
}

export function processData(data, job, outputStream) {
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

    var startTime = new Date(); //not actually the start, but close enough for the timeout purposes
    var lastUpdate = new Date();

    data.forEach((row, i) => {
        var sinceUpdate = new Date() - lastUpdate;
        if (sinceUpdate > 1000) {
            lastUpdate = new Date();
            job.progress(i, data.length);

            //Time out only applies to this long running loop, reading and saving the files should be relatively quick compared to querying the DB in a loop
            var runTime = (lastUpdate - startTime) / (60000); //convert to mins
            if(runTime > Meteor.settings.public.jobTimeoutMins) {                
                throw new Meteor.Error(`Forced Termination: Runtime exceeded (${Meteor.settings.public.jobTimeoutMins} mins)`);
            }
        }

        if (!(jobData.hasHeaders && i == 0)) {
            var fromUri = row[jobData.from.columnIndex];
            Helpers.devlog(`Row: ${i} of ${data.length}, ${fromUri}`)
            if (!fromUri)
                throw new Meteor.Error(`Undefined uri in row ${i}`);
            if(fromUri.indexOf(jobData.from.datasetUri) == -1)
                throw new Meteor.Error(`Input data in row ${i} ${fromUri} doesn't appear to be part of the designated FROM dataset ${jobData.from.datasetUri}`);

            var predicateSuccess = false; //making assumption that only a single predicate should match a given row.
            predicates.forEach(pred => {
                if (!predicateSuccess) {
                    if (pred === KNOWN_PREDS.sfWithin || pred === KNOWN_PREDS.sfEquals) {
                        var toObjects = getStatements(fromUri, isReverse, linkset.uri);
                        Helpers.devlog(`within or equals, #${toObjects.length}`);

                        if (isReverse && pred === KNOWN_PREDS.sfWithin) { //the reverse is the same for sfequals
                            //contains many
                            console.log(toObjects[0])
                            if (toObjects.length != 0) {
                                predicateSuccess = true;
                                var hasAreas = toObjects.every(toObj => !!toObj.area && toObj.fromArea);
                                toObjects.forEach(toObj => {
                                    prepareCache(dataCache, toObj.uri, row, jobData);
                                    if (hasAreas) {
                                        var proportionToGive = toObj.area / toObj.fromArea;
                                        //Never distribute more than the amount that the from object has to give
                                        if (proportionToGive > 1)
                                            proportionToGive = 1;
                                        addToCache(dataCache, toObj.uri, row,  i,jobData, val => val * proportionToGive);
                                    } else {
                                        addToCache(dataCache, toObj.uri, row, i, jobData, val => val);
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
                                addToCache(dataCache, toUri, row, i, jobData, val => val);
                            }
                        }
                    } else if (pred === KNOWN_PREDS.transitiveSfOverlap) {
                        var statements = getOverlapStatements(fromUri, isReverse, pred, linkset.uri);
                        Helpers.devlog(`overlaps, #${statements.length}`);

                        if (statements.length != 0) {
                            predicateSuccess = true;
                            statements.forEach(statement => {
                                if (statement.to.unit != statement.from.unit || statement.to.unit != statement.overlap.unit)
                                    throw new Meteor.Error(`Mixed units found for conversion of row ${i}, col ${colIndex}. We dont handle that yet`);

                                var toUri = statement.to.uri;
                                prepareCache(dataCache, toUri, row, jobData);
                                var proportionToGive = statement.overlap.area / statement.from.area;
                                addToCache(dataCache, toUri, row, i, jobData, val => val * proportionToGive);
                            })
                        }
                    } else {
                        throw new Meteor.Error(`Unknown predicate in linkset ${pred}`);
                    }
                }
            })
            if (!predicateSuccess) {
                skipped.push(row); //this row had no matches
            }
        }
    })

    job.progress(data.length, data.length);

    var hasUnknowns = !!Object.keys(dataCache).find(uri => dataCache[uri].unapportioned);

    //write the headers
    if (jobData.hasHeaders) {
        var headerRow = data[0];
        headerRow[jobData.from.columnIndex] = toDataset.title;
        if (hasUnknowns) {
            headerRow.push("Originating URI");
        }
        var rowText = Papa.unparse([headerRow], { header: false, newline: '\n' });
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

        if (hasUnknowns) {
            if (totals.unapportioned) {
                rowValues = rowValues.map(x => "?" + x);
                rowValues.push(totals.unapportioned); //add the originatingUri
            } else {
                rowValues.push(''); //just a placeholder for nothing
            }
        }

        rowValues[jobData.from.columnIndex] = toUri;

        var rowText = Papa.unparse([rowValues], { header: false, newline: '\n' });
        outputStream.write(rowText + "\n");
    })

    outputStream.end();

    return {skipped};
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

function addToCache(dataCache, toUri, row, i, jobData, valFunc) {
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

function getStatements(fromUri, isReverse, linksetUri) {
    var toVar = "?to";
    var wrappedUri = `<${fromUri}>`;
    var subjectText = isReverse ? toVar : wrappedUri;
    var objectText = isReverse ? wrappedUri : toVar;
    var query = `PREFIX void: <http://rdfs.org/ns/void#>
PREFIX loci: <http://linked.data.gov.au/def/loci#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geox: <http://linked.data.gov.au/def/geox#>
PREFIX data: <http://linked.data.gov.au/def/datatype/> 
PREFIX dct: <http://purl.org/dc/terms/>
prefix dbp: <http://dbpedia.org/property/>
PREFIX nv: <http://qudt.org/schema/qudt#numericValue>
PREFIX qu: <http://qudt.org/schema/qudt#unit>
PREFIX qb4st: <http://www.w3.org/ns/qb4st/>
PREFIX epsg: <http://www.opengis.net/def/crs/EPSG/0/>

SELECT distinct ?s ?to ?toParent (min(?subjectArea) as ?subjectAreaUnique) (min(?objectArea) as ?objectAreaUnique)
WHERE {
    ?s dct:isPartOf <${linksetUri}> ;
       rdf:subject ${subjectText} ;
       rdf:predicate ?p;
       rdf:object ${objectText} .
    OPTIONAL {
        ${subjectText} geox:hasAreaM2 [ data:value ?subjectArea; qb4st:crs epsg:3577 ].  
    }
    OPTIONAL {
        ${objectText} geox:hasAreaM2 [ data:value ?objectArea; qb4st:crs epsg:3577 ].  
    }
    OPTIONAL { FILTER (?toParent != ${wrappedUri})
        ?s1 dct:isPartOf <${linksetUri}> ;
            rdf:subject ?toParent ;
            rdf:predicate geo:sfContains ;
            rdf:object ?to .
    }
    FILTER (?p = geo:sfContains || ?p = geo:sfWithin)
 } group by ?s ?to ?p ?toParent
`;

    try {
        console.log(query)
        var result = getQueryResults(query);
        var json = JSON.parse(result.content);
        var bindings = json.results.bindings;
        var matches = bindings.map(b => {
            if (b.toParent) {
                var matchObj = {
                    uri: b.toParent.value,
                }
            }
            else {
                var matchObj = {
                    uri: b.to.value
                }
            };
            if (isReverse) {
                if (b.objectAreaUnique)
                    matchObj.fromArea = b.objectAreaUnique.value;
                if (b.subjectAreaUnique)
                    matchObj.area = b.subjectAreaUnique.value;
            } else {
                if (b.subjectAreaUnique)
                    matchObj.fromArea = b.subjectAreaUnique.value;
                if (b.objectAreaUnique)
                    matchObj.area = b.objectAreaUnique.value;
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