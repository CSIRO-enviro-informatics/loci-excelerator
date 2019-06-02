import chai from 'chai'
import { convert, processData } from './convert'
import Papa from 'papaparse';
import Helpers from './helpers'
import fs from 'fs';
import './startup/server/register-api';
const streams = require('memory-streams');

const DATASETS = {
    asgs2011: "http://linked.data.gov.au/dataset/asgs2011",
    asgs2016: "http://linked.data.gov.au/dataset/asgs2016",
    geofabric: "http://linked.data.gov.au/dataset/geofabric",
    gnaf: "http://linked.data.gov.au/dataset/gnaf",
    gnaf16: "http://linked.data.gov.au/dataset/gnaf-2016-05",
}

class MochJob {
    constructor(_id, jobData) {
        this._id = _id;
        this.data = jobData;
        this.progressVal = 0;
    }
    progress(progress, total) { this.progressVal = progress / total * 100; }
    fail(err) { this.failure = err; }
    done(result) { this.result = result; }
}

function getCSVRows(file) {
    return new Promise((resolve, reject) => {
        const inputStream = fs.createReadStream(file);
        const csvStream = inputStream.pipe(Papa.parse(Papa.NODE_STREAM_INPUT));
        var data = [];
        csvStream.on('data', function (item) {
            data.push(item);
        });
        csvStream.on('error', (err) => {
            reject(err);
        })
        csvStream.on('end', () => {
            resolve(data);
        })
    })
}

describe('Conversions', function () {
    this.timeout(30000);
    before(function () {
        Meteor.call('updateLinksets');
    });

    after(function () {
        // runs after all tests in this block
    });

    describe('GNAF to ASGS16 (sfWithin)', function () {
        it('can convert addresses to MB (sfWithin)', async function () {
            var data = await getCSVRows(Assets.absoluteFilePath('testData/mini-gnaf-mb16.csv'));
            const outputStream = new streams.WritableStream();
            // outputStream.on('finish', () => {
            // })
            var mochjob = new MochJob('testid', {
                userId: 'testUser',
                hasHeaders: true,
                from: {
                    fileId: '',
                    datasetUri: DATASETS.gnaf,
                    columnIndex: 0
                },
                to: {
                    datasetUri: DATASETS.asgs2016,
                    aggregationFunc: Helpers.aggregationMethods.SUM
                }
            });

            try {
                processData(data, mochjob, outputStream);
                var output = outputStream.toString();
                var expected = "asgs2016,Ones,Floats\nhttp://linked.data.gov.au/dataset/asgs2016/meshblock/80001940000,2,0.2\nhttp://linked.data.gov.au/dataset/asgs2016/meshblock/80001970000,1,0.1\nhttp://linked.data.gov.au/dataset/asgs2016/meshblock/80002010000,7,0.7\n";
                
                chai.assert.equal(output, expected, "Output is not as expected");
            } catch (e) {
                chai.assert.fail(e.message);
            }

        })
    })
})

describe('Graph Cache', function () {
    it('should have `isPartOf` relationships for all statement')
    it('should have linksets')
    it('should have all dataset for the linksets')
})