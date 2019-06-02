if (Meteor.isServer) {
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

        describe('GNAF to ASGS16 (sfWithin)', function () {
            it('can convert addresses to MB (sfWithin)', async function () {
                var results = await testLinksetConversion('testData/mini-gnaf-mb16.csv', DATASETS.gnaf, DATASETS.asgs2016);
                var expected = [{
                    "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80001940000", "Ones": "2", "Floats": "0.2"
                }, {
                    "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80001970000", "Ones": "1", "Floats": "0.1"
                }, {
                    "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80002010000", "Ones": "7", "Floats": "0.7"
                }];
                chai.assert.sameDeepMembers(results, expected)
            })
        })
    })

    async function testLinksetConversion(assetPath, datasetFrom, datasetTo) {
        try {
            var data = await getCSVRows(Assets.absoluteFilePath(assetPath));
            const outputStream = new streams.WritableStream();
            var mochjob = new MochJob('testid', {
                userId: 'testUser',
                hasHeaders: true,
                from: {
                    fileId: '',
                    datasetUri: datasetFrom,
                    columnIndex: 0
                },
                to: {
                    datasetUri: datasetTo,
                    aggregationFunc: Helpers.aggregationMethods.SUM
                }
            });

            processData(data, mochjob, outputStream);
            //The next line is a little suspect. Might ideally wait for the 'finish' event, but I think this works most of the time
            var output = outputStream.toString();
        } catch (e) {
            chai.assert.fail(e.message);
        }

        var parseResult = Papa.parse(output, {
            header: true,
            skipEmptyLines: true
        });

        if (parseResult.errors.length > 0) {
            chai.assert.fail(parseResult.errors[0].message);
        }

        return parseResult.data;
    }

    describe('Graph Cache', function () {
        it('should have `isPartOf` relationships for all statement')
        it('should have linksets')
        it('should have all dataset for the linksets')
    })
}