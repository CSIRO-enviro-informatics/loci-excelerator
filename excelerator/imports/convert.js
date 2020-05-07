import Uploads from './api/uploads/uploads'
import { Meteor } from 'meteor/meteor'
import fs from 'fs';
import Papa from 'papaparse';
import Linksets from './api/linksets/linksets';
import Datasets from './api/datasets/datasets';
import { getQueryResults, KNOWN_PREDS } from './linksetApi';
import Helpers from './helpers';
import { isNumber } from 'util';
import DatasetTypes from './api/datasetTypes/datasetTypes';

const MASS_BALANCE_TOLLERANCE_PERC = 0.5;

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
                message: Helpers.trimChar(Helpers.trimChar(err.message, '['), ']'),
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

    var outputType = DatasetTypes.findOne({uri: jobData.to.classTypeUri, datasetUri: jobData.to.datasetUri});
    if(!outputType)
        throw new Meteor.Error(`There is no classtype defined by ${jobData.to.classTypeUri}`);

    var inputType = DatasetTypes.findOne({uri: jobData.from.classTypeUri, datasetUri: jobData.from.datasetUri});
    if(!inputType)
        throw new Meteor.Error(`There is no classtype defined by ${jobData.from.classTypeUri}`);
    
    var linkset = Linksets.findOne({ subjectsTarget: inputType.datasetUri, objectsTarget: outputType.datasetUri });
    var isReverse = false; //is the dataset going from subject to object
    if (!linkset) {
        isReverse = true;
        linkset = Linksets.findOne({ subjectsTarget: outputType.datasetUri, objectsTarget: inputType.datasetUri });
    }

    if (outputType.datasetUri != inputType.datasetUri && !linkset) {
        throw new Meteor.Error(`No linkset exists to map these datasets ${inputType.datasetUri} --> ${outputType.datasetUri}`);
    }

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
            if (runTime > Meteor.settings.public.jobTimeoutMins) {
                throw new Meteor.Error(`Prototype Constrained Timeout: Runtime exceeded (${Meteor.settings.public.jobTimeoutMins} mins)`);
            }
        }
        predicateSuccess = false;
        if (!(jobData.hasHeaders && i == 0)) {
            var fromUri = row[jobData.from.columnIndex];
            // Helpers.devlog(`Row: ${i} of ${data.length}, ${fromUri}`)
            if (!fromUri)
                throw new Meteor.Error(`Undefined uri in row ${i}`);

            //check if fromUri is a URI, else, turn it into a URI based on inputUriType
            if (!fromUri.startsWith("http")) {
               //get prefix from DataType and append fromUri value
               fromUri = inputType.prefix + fromUri;               
            }

            // The next "if" is totally a hack, URI should not be dependant on their parent URI
            // Ideally check if the statement belongs to the dataset using the graph relationships. It means another query
            // which may or may not be worth it?
            if (fromUri.indexOf(inputType.datasetUri) == -1)
                throw new Meteor.Error(`Input data in row ${i} ${fromUri} doesn't appear to be part of the designated FROM dataset ${inputType.datasetUri}`);

            var toObjects = getProportionStatements(fromUri, outputType);

            if (toObjects.length != 0) {
                predicateSuccess = true;
                var hasToAreas = toObjects.every(toObj => !!toObj.area);
                var hasFromAreas = toObjects.every(toObj => !!toObj.fromArea);

                toObjects.forEach(toObj => {
                    prepareCache(dataCache, toObj.uri, row, jobData);
                    if (hasToAreas) {
                        var proportionToGive = hasFromAreas ? toObj.area / toObj.fromArea : 1;
                        //Never distribute more than the amount that the from object has to give
                        //The area of the two objects is only ever greater in the circumstance of a within, so really
                        //this test is for the presence of a within statement, in which case we want to fully allocate the
                        //value to the target.
                        if (proportionToGive > 1)
                            proportionToGive = 1;
                        addToCache(dataCache, toObj.uri, row, i, jobData, val => val * proportionToGive);
                    } else {
                        addToCache(dataCache, toObj.uri, row, i, jobData, val => val);
                        dataCache[toObj.uri].unapportioned = fromUri; //flags as dont know what to do
                    }
                });
            }
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
        headerRow[jobData.from.columnIndex] = outputType.title;
        if (hasUnknowns) {
            headerRow.push("Originating URI");
        }
        var rowText = Papa.unparse([headerRow], { header: false, newline: '\n' });
        outputStream.write(rowText + "\n");
    }

    //Check for mass balance and write out approriate messages if out.
    var originalTotals = data.reduce((mem, row, i) => {
        if (i != 0) { //skip headers
            row.forEach((colVal, colIndex) => {
                if (colIndex != jobData.from.columnIndex) {
                    if (isNaN(colVal))
                        throw new Meteor.Error(`Value "${colVal}" found in row ${i}, col ${colIndex} is not a number.`);
                    mem[colIndex++] += +colVal;
                }
            });
        }
        return mem;
    }, new Array(data[0].length).fill(0));
    // Helpers.devlog(`Old Totals: ${JSON.stringify(originalTotals)}`);

    var apportionedTotals = Object.values(dataCache).reduce((mem, rowData) => {
        if (!rowData.unapportioned) {
            rowData.forEach((tots, dataIndex) => {
                if (dataIndex != jobData.from.columnIndex)
                    mem[dataIndex] += tots.total;
            });
        }
        return mem;
    }, new Array(data[0].length).fill(0));
    // Helpers.devlog(`New Totals: ${JSON.stringify(apportionedTotals)}`);

    var percDiffs = originalTotals.map((orgTotal, colIndex) => {
        var newTotal = apportionedTotals[colIndex];
        if (orgTotal == 0) {
            if (newTotal == 0)
                return 0;
            else
                return Math.abs((newTotal - orgTotal) / newTotal) * 100.0;
        }
        return Math.abs((orgTotal - newTotal) / orgTotal) * 100.0;
    })
    // Helpers.devlog(`Mass Balance Diffs: ${JSON.stringify(percDiffs)}`);

    var percDiff = percDiffs.find(diff => diff > MASS_BALANCE_TOLLERANCE_PERC);
    if (percDiff) {
        var row = new Array(data[0].length).fill("");
        row[0] = `Warning: The input source values were not completely apportioned to outputs. This happens when the output dataset does not completely cover the input dataset spatially. ${percDiff.toFixed(3)}% of the data was left unassigned.`;
        var rowText = Papa.unparse([row], { header: false, newline: '\n' });
        outputStream.write(rowText + "\n");
    }

    if (hasUnknowns) {
        var row = new Array(data[0].length).fill("");
        row[0] = `Warning: Some (or all) of the data was unable to be apportioned. These fields are marked with a question mark and the original value.`;
        var rowText = Papa.unparse([row], { header: false, newline: '\n' });
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

    return { skipped };
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

export function getProportionStatements(fromUri, outputType, isCrosswalk = true, isContains = false, isWithin = false) {
    try {
        var options = {
            params: {
                uri: fromUri,
                areas: true,
                proportion: true,
                contains: isContains,
                within: isWithin,
                crosswalk: isCrosswalk,
                output_type: outputType.uri,
                output_dataset: outputType.datasetUri,
                // count: 1000,
                // offset: 0
            }
        }
        // console.log(options);

        var result = HTTP.get(Meteor.settings.integrationApi.endpoint + "/location/overlaps", options);
        // console.log(result);
        var json = JSON.parse(result.content);
        var objectArea = +json.meta.featureArea;
        var outputObjects = json.overlaps;

        var matches = outputObjects.map(outObj => ({
            uri: outObj.uri,
            fromArea: +objectArea,
            area: outObj.intersectionArea != null ? +outObj.intersectionArea : +outObj.featureArea,
        }))
        return matches;
    } catch (e) {
        console.log(e)
        throw new Error(`Call to API endpoint failed with: ${e.message}`);
    }
}
