import Uploads from './api/uploads/uploads'
import { Meteor } from 'meteor/meteor'
import fs from 'fs';
import path from 'path'
import Papa from 'papaparse';
import Linksets from './api/linksets/linksets';
import Datasets from './api/datasets/datasets';
import { getQueryResults, KNOWN_PREDS } from './linksetApi';
import Helpers from './helpers';
import { isNumber } from 'util';
import DatasetTypes from './api/datasetTypes/datasetTypes';
import { stringify } from 'querystring';

export function getIds(job, cb) {

    var count = 1;
    var timerId = Meteor.setInterval(() => {
        count++;
        job.progress(count * 10, 100);
        if (count == 10) {
            Meteor.clearInterval(timerId);
            job.done();
            cb()
        }
    }, 2000);

    // realWork(); //This was a function for the progress stuff above. Take it out 

    function realWork() {
        var jobData = job.data;

        var outputFile = `${Meteor.settings.public.uploads.path}/converted_${file.get("_id")}`;
        const outputStream = fs.createWriteStream(outputFile);

        function failAndCleanUp(err) {
            outputStream.destroy();
            job.fail({
                message: Helpers.trimChar(Helpers.trimChar(err.message, '['), ']'),
                code: err.code
            });
            cb();
        }

        //read all in memeory implementation
        try {
            var result = processData(data, job, outputStream);
        } catch (err) {
            failAndCleanUp(err);
        }

        outputStream.on('error', (err) => {
            failAndCleanUp(err);
        })

        outputStream.on('finish', () => {
            Uploads.addFile(outputFile, {
                fileName: `${job._id}.csv`,
                type: "text/csv",
                meta: {
                    userId: jobData.userId,
                    inputFileId: jobData.from.fileId,
                    jobId: job._id
                },
            }, (err, fileObj) => {
                if (err) {
                    failAndCleanUp(err);
                } else {
                    var fileId = fileObj._id;
                    job.done({
                        fileId,
                    });
                    cb();
                }
            });
        })
    }
}

function getPathToBaseType(datasetUri, classTypeUri) {
    var currentType = DatasetTypes.findOne({ datasetUri, baseType: true });
    if (!currentType)
        throw new Meteor.Error(`No base type for dataset <${datasetUri}>`);
    var typeHierarchy = [currentType];
    while (currentType.uri != classTypeUri) {
        currentType = DatasetTypes.findOne({ datasetUri, uri: currentType.withinType });
        if (!currentType)
            throw new Meteor.Error(`No conversion hierarchy found for dataset class <${classTypeUri}>`);
        typeHierarchy.push(currentType);
    }
    return typeHierarchy;
}

export function parseFilterIds(filterType, idText) {
    var text = idText.replace(/,*\s+/g, ","); //make one long string
    console.log(text);
    var result = Papa.parse(text, { header: false });
    var baseUri = "https://noideayet/";
    return result.data[0].filter(x => !!x).map(x => {
        var uri = x.trim();
        // if (!uri.startsWith('http'))
        //     uri = path.join(baseUri, uri); //was just the id, not the uri
        // else if (uri.indexOf(baseUri) == -1)
        //     throw new Meteor.Error(`Invalid filter object <${uri}> for given filter id Type <${filterType}>. Check your ID list`);

        return uri;
    });
}

export function processIdJob(job, outputStream) {
    var jobData = job.data;
    var params = jobData.params;

    if (params.filterTypeUri == params.outputTypeUri) {
        throw new Meteor.Error("FilterType must not be equal to Output type.")
    }

    var filterTypeHierarchy = getPathToBaseType(params.filterUri, params.filterTypeUri);
    var outputTypeHierarchy = getPathToBaseType(params.outputUri, params.outputTypeUri);
    var filterUris = parseFilterIds(params.filterUri, params.idText);

    if (params.outputUri == params.filterUri) {
        var inHierarchy = filterTypeHierarchy.find(x => x.uri == params.outputTypeUri);
        if (!inHierarchy)
            throw new Meteor.Error(`<${params.outputTypeUri}> is not in a child object of <${params.filterTypeUri}>, so we don't filter it.`)

        //write headers
        outputStream.write(filterTypeHierarchy.find(x => x.uri == params.outputTypeUri).title + "\n");

        var lastUpdate = new Date();
        filterUris.forEach((filter, i) => {
            var sinceUpdate = new Date() - lastUpdate;
            if (sinceUpdate > 1000) {
                lastUpdate = new Date();
                job.progress(i, data.length);
            }

            var ids = getChildrenOf(filter, params.filterTypeUri, params.outputTypeUri, filterTypeHierarchy);
            outputStream.write(ids.join('\n') + "\n");
        })
    } else {
        throw new Meteor.Error("Cross walking downloads not yet implemented");

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

            if (hasUnknowns) {
                if (totals.unapportioned) {
                    rowValues = rowValues.map(x => "?" + x);
                    rowValues.push(totals.unapportioned); //add the originatingUri
                } else {
                    rowValues.push(''); //just a placeholder for nothing
                }
            }

            rowValues[jobData.from.columnIndex] = toUri;

            var rowText = Papa.unparse([rowValues], { header: false });
            outputStream.write(rowText + "\n");
        })
    }

    job.progress(100, 100);

    outputStream.end();
}

function getChildrenOf(filterTypeUri, datasetTypeParentUri, datasetTypeChildUri, hierarchy) {
    var done = false;
    var whereClauses = hierarchy.reduce((mem, level, i) => {
        if ((level.uri == datasetTypeChildUri || mem) && !done) {
            var pred = level.withinPredicate;
            var sub = !!mem ? `?tmp${i}` : "?child";
            var obj = level.withinType == datasetTypeParentUri ? `<${filterTypeUri}>` : `?tmp${i + 1}`;
            if (level.reversePredicate) {
                mem += `    ${obj} <${pred}> ${sub} .\n`;
            } else {
                mem += `    ${sub} <${pred}> ${obj} .\n`;
            }
            done = (level.withinType == datasetTypeParentUri);
        }
        return mem;
    }, "");

    var query = `SELECT ?child
WHERE {
${whereClauses}
}`;

    console.log(JSON.stringify(query));

    try {
        var result = getQueryResults(query);
        var json = JSON.parse(result.content);
        var bindings = json.results.bindings;
        var matches = bindings.map(b => b.child.value);
        return matches;
    } catch (e) {
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