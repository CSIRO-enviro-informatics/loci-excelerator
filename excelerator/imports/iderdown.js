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
import { getProportionStatements } from './convert'

const DEFAULT_PAGE_SIZE = 1000;

export function getIds(job, cb) {

    // var count = 1;
    // var timerId = Meteor.setInterval(() => {
    //     count++;
    //     job.progress(count * 10, 100);
    //     if (count == 10) {
    //         Meteor.clearInterval(timerId);
    //         job.done();
    //         cb()
    //     }
    // }, 2000);

    realWork(); //This was a function for the progress stuff above. Take it out 

    function realWork() {
        var jobData = job.data;

        var outputType = DatasetTypes.findOne({ uri: jobData.params.outputTypeUri });
        if (!outputType)
            failAndCleanUp(new Meteor.Error(`Unknown output type: <${jobData.params.outputTypeUri}>`));
        var filterType = DatasetTypes.findOne({ uri: jobData.params.filterTypeUri });
        if (!filterType)
            failAndCleanUp(new Meteor.Error(`Unknown filter type: <${jobData.params.filterTypeUri}>`));

        var filename = `${outputType.title} by ${filterType.title} (${job._doc._id}).csv`;
        console.log(filename);
        console.log(JSON.stringify(jobData.params, null, 4));
        var outputFile = `${Meteor.settings.public.uploads.path}/${filename}`;
        const outputStream = fs.createWriteStream(outputFile);

        function failAndCleanUp(err) {
            console.log(err);
            outputStream.destroy();
            job.fail({
                message: Helpers.trimChar(Helpers.trimChar(err.message, '['), ']'),
                code: err.code
            });
            cb();
        }

        outputStream.on('error', (err) => {
            failAndCleanUp(err);
        })

        outputStream.on('finish', () => {
            Uploads.addFile(outputFile, {
                fileName: filename,
                type: "text/csv",
                meta: {
                    userId: jobData.userId,
                    jobId: job._doc._id
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

        //read all in memeory implementation
        try {
            processIdJob(job, outputStream);
        } catch (err) {
            failAndCleanUp(err);
        }
    }
}

export function parseFilterIds(filterType, idText) {
    var text = idText.replace(/,*\s+/g, ","); //make one long string, allow spaces,
    // console.log(text);
    var result = Papa.parse(text, { header: false });
    // var baseUri = "https://noideayet/";
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

    var outputType = DatasetTypes.findOne({ uri: params.outputTypeUri });
    if (!outputType) {
        throw new Meteor.Error(`OutputType does not exist in database <${params.outputTypeUri}>.`)
    }

    var filterUris = parseFilterIds(params.filterUri, params.idText);
    //Check all Ids are part of the specified Filter Dataset
    filterUris.forEach(uri => {
        if (!hasType(uri, params.filterTypeUri)) {
            throw new Meteor.Error(`The filter uri <${uri}> is not an instance of filter type <${params.filterTypeUri}>`)
        }
        // if(!partOfDataset(uri, params.filterUri)) {
        //     throw new Meteor.Error(`The filter uri <${uri}> is not part of the filter dataset <${params.filterUri}>`)
        // }
    })

    var startTime = new Date(); //not actually the start, but close enough for the timeout purposes

    var inHierarchy = outputType.withinTypes.indexOf(params.filterTypeUri) !== -1;
    if (!inHierarchy)
        throw new Meteor.Error(`<${params.outputTypeUri}> are never within objects of <${params.filterTypeUri}>, so we don't filter it.`)

    //write headers
    var headers = [params.outputTypeUri, params.filterTypeUri].map(typeUri => DatasetTypes.findOne({ uri: typeUri }).title);
    headers.splice(1, 0, "Proportion within");
    outputStream.write(Papa.unparse([headers], { header: false, newline: '\n' }) + "\n");

    var lastUpdate = new Date();
    filterUris.forEach((fUri, i) => {
        var sinceUpdate = new Date() - lastUpdate;
        if (sinceUpdate > 1000) {
            lastUpdate = new Date();
            job.progress(i, filterUris.length);

            //Time out only applies to this long running loop, reading and saving the files should be relatively quick compared to querying the DB in a loop
            var runTime = (lastUpdate - startTime) / (60000); //convert to mins
            if (runTime > Meteor.settings.public.jobTimeoutMins) {
                throw new Meteor.Error(`Prototype Constrained Timeout: Runtime exceeded (${Meteor.settings.public.jobTimeoutMins} mins)`);
            }
        }

        var proportions = getProportionStatements(fUri, outputType);

        var rows = proportions.map(p => {
            if(!p.fromArea && p.area) {
                throw new Meteor.Error(`Unable to calculate proportion..Failing`);
            }
            if(p.fromArea && p.area)
                var proportion =  p.area / p.fromArea;
            else  
                var proportion = 1;

            return [p.uri, proportion, fUri]
        });

        var rowText = Papa.unparse(rows, { header: false, newline: '\n' });
        outputStream.write(rowText + "\n");
    })

    job.progress(100, 100);

    outputStream.end();
}

function hasType(objectUri, type) {
    var query = `PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT *
where {
    <${objectUri}> a ?type .            
}`; //get more than 1 in case there are many, which woudl be odd

    try {
        var result = getQueryResults(query);
        var json = JSON.parse(result.content);
        var bindings = json.results.bindings;
        var types = bindings.map(b => b.type.value);
        return types.includes(type);
    } catch (e) {
        throw e;
    }
}
