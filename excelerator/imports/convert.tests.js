import chai from 'chai'
import { convert, processData } from './convert'
import Papa from 'papaparse';
import { rejects } from 'assert';
import { App } from './core'
const streams = require('memory-streams');

class MochJob {
    constructor(_id, jobData) {
        this._id = _id;
        this.data = jobData;
        this.progress = 0;
    }
    progress(progress, total) { this.progress = progress / total * 100; }
    fail(err) { this.failure = err; }
    done(result) { this.result = result; }
}

function getCSVRows(file) {
    return new Promise((resolve, reject) => {
        const inputStream = fs.createReadStream(inputFile);
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
    describe('GNAF to ASGS16 (sfWithin)', function () {
        it('can convert addresses to MB (sfWithin)', async function () {
            var data = await getCSVRows(Assets.absoluteFilePath('testData/mini-gnaf-mb16.csv'));
            const outputStream = new streams.WritableStream();
            outputStream.on('finish', () => {

                chai.assert.equal(1, 0);
            })
            var job = new MochJob('testid', {
                userId: 'testUser',
                hasHeaders: true,
                from: {
                    fileId: '',
                    datasetUri: '',
                    columnIndex: 0
                },
                to: {
                    datasetUri: '',
                    aggregationFunc: App.Helpers.aggregationMethods.SUM
                }
            })
            convert(data, job, outputStream);
        })
    })
})

describe('Graph Cache', function () {
    it('should have `isPartOf` relationships for all statement', function (done) {
        chai.assert.fail("No checking yet");
        done();
    })
})