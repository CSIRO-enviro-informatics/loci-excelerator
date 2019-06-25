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

    describe('Conversions', function () {
        this.timeout(30000);
        before(function () {
            Meteor.call('updateLinksets');
        });

        describe('expected errors', function () {
            it('will skip on unknown URIs', async function () {
                var results = await testLinksetConversion('testData/mini-gnaf-mb16-bad-uri.csv', DATASETS.gnaf, DATASETS.asgs2016);
                var expected = { "data": [{ "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80001940000", "Ones": "1", "Floats": "0.1" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80002010000", "Ones": "1", "Floats": "0.1" }], "skipped": [["http://linked.data.gov.au/dataset/gnaf/address/badUri", "1", "0.1"]] }
                chai.assert.sameDeepMembers(results.skipped, expected.skipped);
                chai.assert.sameDeepMembers(results.data, expected.data);
            })
            it('will error on non-numeric attributes', async function () {
                try {
                    await testLinksetConversion('testData/mini-gnaf-mb16-bad-number.csv', DATASETS.gnaf, DATASETS.asgs2016)
                    chai.assert.fail('Should have thrown exception');
                } catch (e) {                    
                }
            })
        })

        describe('GNAF to ASGS16 ', function () {
            it('can convert sfWithin statements', async function () {
                var results = await testLinksetConversion('testData/mini-gnaf-mb16.csv', DATASETS.gnaf, DATASETS.asgs2016);
                var expected = [{
                    "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80001940000", "Ones": "2", "Floats": "0.2"
                }, {
                    "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80001970000", "Ones": "1", "Floats": "0.1"
                }, {
                    "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80002010000", "Ones": "7", "Floats": "0.7"
                }];
                chai.assert.sameDeepMembers(results.data, expected);
            })
        })

        describe('ASGS16 to GNAF (a reverse transformation)', function () {
            it('can convert reverse sfWithin statments')
        })

        describe('ASGS16 to Geofabric', function () {
            it('can convert transitiveOverlap statments', async function () {
                var results = await testLinksetConversion('testData/mini-mb16-cc-tso.csv', DATASETS.asgs2016, DATASETS.geofabric);
                var expected = [{ "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12102128", "Area": "15998199.999999998", "Count": "0.5491605479865852" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12300915", "Area": "12709900", "Count": "0.0002572656354369502" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12300966", "Area": "86472700", "Count": "0.0012611729256635645" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12301469", "Area": "483040000", "Count": "0.009767697683447651" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12302323", "Area": "98806700", "Count": "0.0064178114668381435" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12302930", "Area": "199996", "Count": "0.6171744571070603" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12500009", "Area": "333674000", "Count": "0.01666869817164552" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12501673", "Area": "1503422000", "Count": "0.009079622181154956" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12501961", "Area": "1106158000", "Count": "0.006680424200698144" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/9551734", "Area": "516128", "Count": "0.000820040896546355" }];
                chai.assert.sameDeepMembers(results.data, expected);
            })
            it('can convert sfWithin statments', async function () {
                var results = await testLinksetConversion('testData/mini-mb16-cc-within.csv', DATASETS.asgs2016, DATASETS.geofabric);
                var expected = [{ "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105134", "Count": "3" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105135", "Count": "3" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105138", "Count": "2" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105140", "Count": "2" }];
                chai.assert.sameDeepMembers(results.data, expected);
            })
            it('can convert mixed statments', async function () {
                var results = await testLinksetConversion('testData/mini-mb16-cc-tso-within.csv', DATASETS.asgs2016, DATASETS.geofabric);
                var expected = [{ "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12102128", "Area": "15998199.999999998", "Count": "0.5491605479865852" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105134", "Area": "164297.87181459667", "Count": "3" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105135", "Area": "123690.42415986011", "Count": "3" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105138", "Area": "33570.640133920795", "Count": "2" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12105140", "Area": "156312.40464762232", "Count": "1" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12300915", "Area": "12709900", "Count": "0.0002572656354369502" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12300966", "Area": "86472700", "Count": "0.0012611729256635645" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12301469", "Area": "483040000", "Count": "0.009767697683447651" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12302323", "Area": "98806700", "Count": "0.0064178114668381435" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12302930", "Area": "199996", "Count": "0.6171744571070603" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12500009", "Area": "333674000", "Count": "0.01666869817164552" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12501673", "Area": "1503422000", "Count": "0.009079622181154956" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/12501961", "Area": "1106158000", "Count": "0.006680424200698144" }, { "geofabric": "http://linked.data.gov.au/dataset/geofabric/catchment/9551734", "Area": "516128", "Count": "0.000820040896546355" }];
                chai.assert.sameDeepMembers(results.data, expected);
            })
            it('can convert 2016 ACT Mesblock to geofab catchments without losing data', async function () {
                this.timeout(300000);
                var inputFile = 'testData/2016-act-mbs-with-area.csv';
                var data = await getCSVRows(Assets.absoluteFilePath(inputFile));
                var totalArea = data.reduce((mem, x) => mem + x.area, 0);
                var results = await testLinksetConversionWithData(data, DATASETS.asgs2016, DATASETS.geofabric);
                var resultArea = results.reduce((mem, x) => mem + x.area, 0);
                chai.assert.equal(resultArea, totalArea, 'Area is not lost from conversion');
            })
        })

        describe('Geofabric to ASGS16 (a reverse transformation)', function () {
            it('can convert reverse transitiveOverlap statments', async function () {
                var results = await testLinksetConversion('testData/mini-cc-mb16-tso.csv', DATASETS.geofabric, DATASETS.asgs2016);
                var expected = [{ "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/30563930900", "Area": "15998200", "Count": "0.11648270037278657" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/40012500000", "Area": "483040000", "Count": "0.6467732303580658" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/40215198900", "Area": "98806700", "Count": "0.8190278434005587" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/40415740000", "Area": "199995.99999999997", "Count": "0.0010526105263157894" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/50107800000", "Area": "2609580000", "Count": "3.0573412528116934" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/50185410000", "Area": "86472700", "Count": "0.16842881295188233" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/50264330000", "Area": "516128", "Count": "0.9280590933528968" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/50311180000", "Area": "333674000", "Count": "0.05897895010349076" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/50391454500", "Area": "12709900", "Count": "0.05435669563432325" }];
                chai.assert.sameDeepMembers(results.data, expected);
            })
            it('can convert reverse sfWithin statments WITH area', async function () {
                chai.assert.fail("untested");
            })
            it('can convert reverse sfWithin statments WITHOUT area', async function () {
                var results = await testLinksetConversion('testData/mini-cc-mb16-within.csv', DATASETS.geofabric, DATASETS.asgs2016);
                // console.log(JSON.stringify(results));
                var expected = [{ "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80004660000", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105134" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80006050000", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105138" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80009501000", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105138" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80010760000", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105135" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80020528100", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105135" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80023720000", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105134" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80023970000", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105140" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80025550000", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105134" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80047982200", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105135" }, { "asgs2016": "http://linked.data.gov.au/dataset/asgs2016/meshblock/80056491300", "count": "?1", "Originating URI": "http://linked.data.gov.au/dataset/geofabric/catchment/12105140" }];
                chai.assert.sameDeepMembers(results.data, expected);
            })
            it('can convert mixed statments');
        })
    })


    export class MochJob {
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

    async function testLinksetConversion(assetPath, datasetFrom, datasetTo) {
        var data = await getCSVRows(Assets.absoluteFilePath(assetPath));
        return await testLinksetConversionWithData(data, datasetFrom, datasetTo);
    }

    async function testLinksetConversionWithData(data, datasetFrom, datasetTo) {
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

        var result = processData(data, mochjob, outputStream);

        //The next line is a little suspect. Might ideally wait for the 'finish' event, but I think this works most of the time
        var output = outputStream.toString();

        var parseResult = Papa.parse(output, {
            header: true,
            skipEmptyLines: true
        });

        if (parseResult.errors.length > 0) {
            chai.assert.fail(parseResult.errors[0].message);
        }

        return {
            data: parseResult.data,
            skipped: result.skipped
        };
    }

    describe('Graph Cache', function () {
        it('should have `isPartOf` relationships for all statement')
        it('should have linksets')
        it('should have all dataset for the linksets')
    })
}