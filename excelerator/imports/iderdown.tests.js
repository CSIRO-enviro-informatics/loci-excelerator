if (Meteor.isServer) {
    import chai from 'chai'
    import { MochJob } from './convert.tests'
    import { processIdJob, parseFilterIds } from './iderdown.js'
    import Papa from 'papaparse';
    import Helpers from './helpers'
    import fs from 'fs';
    import './startup/server/register-api';
    const streams = require('memory-streams');
    import DatasetTypes from './api/datasetTypes/datasetTypes'

    const DATASETS = {
        asgs2011: "http://linked.data.gov.au/dataset/asgs2011",
        asgs2016: "http://linked.data.gov.au/dataset/asgs2016",
        geofabric: "http://linked.data.gov.au/dataset/geofabric",
        gnaf: "http://linked.data.gov.au/dataset/gnaf",
        gnaf16: "http://linked.data.gov.au/dataset/gnaf-2016-05",
    }

    describe('IDerDown', function () {
        this.timeout(30000);
        before(function () {
            Meteor.call('updateLinksets');
            Meteor.call('updateDatasetTypes');
        });

        describe('expected errors', function () {
        })

        describe('idText parsing', function () {
            it('can get single uri', function () {
                var filterTypeUri = "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1";
                var idText = "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804"
                var results = parseFilterIds(filterTypeUri, idText);
                var expects = ["http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804"];
                chai.assert.sameMembers(results, expects, "Different results");
            })
            it('can get single many uri', function () {
                var filterTypeUri = "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1";
                var idText = `http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804, http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124803, http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805`
                var results = parseFilterIds(filterTypeUri, idText);
                var expects = ["http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124803"];
                chai.assert.sameMembers(results, expects, "Different results");
            })
            it('can get single many uri using returns commas and spaces', function () {
                var filterTypeUri = "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1";
                var idText = `http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804 http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124803
                http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805
                  `;
                var results = parseFilterIds(filterTypeUri, idText);
                var expects = ["http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124803"];
                chai.assert.sameMembers(results, expects, "Different results");
            })
            it('can parse ID and URIS', function () {
                var filterTypeUri = "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1";
                var idText = `11202124804, 11202124803, http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805`
                var results = parseFilterIds(filterTypeUri, idText);
                var expects = ["http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124803"];
                chai.assert.sameMembers(results, expects, "Different results");
            })
            it('will fail with wrong class uri', function () {
                var filterTypeUri = "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1";
                var idText = `http://linked.data.gov.au/dataset/asgs2016/wrongclass/11202124804`

                try {
                    var results = parseFilterIds(filterTypeUri, idText);
                    chai.assert.fail("Should have failed");
                } catch (e) {
                }
            })
        })

        describe('ASGS16:MB filtered by ASGS16:SA1', function () {
            it('can extract approriate ids from a single SA1', async function () {
                var params = {
                    "outputUri": DATASETS.asgs2016,
                    "outputTypeUri": "http://linked.data.gov.au/def/asgs#MeshBlock",
                    "filterUri": DATASETS.asgs2016,
                    "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                    "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804"
                };
                var results = await testGetIds(params);
                var expects = ["http://linked.data.gov.au/dataset/asgs2016/meshblock/11204384900", "http://linked.data.gov.au/dataset/asgs2016/meshblock/11205876800"];
                chai.assert.sameMembers(results, expects, "")
            })

            it('can extract approriate ids from multiple SA1s', async function () {
                var params = {
                    "outputUri": DATASETS.asgs2016,
                    "outputTypeUri": "http://linked.data.gov.au/def/asgs#MeshBlock",
                    "filterUri": DATASETS.asgs2016,
                    "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                    "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804, http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/10402109004"
                };
                var results = await testGetIds(params);
                var expects = ["http://linked.data.gov.au/dataset/asgs2016/meshblock/11204384900", "http://linked.data.gov.au/dataset/asgs2016/meshblock/11205876800", "http://linked.data.gov.au/dataset/asgs2016/meshblock/11205876500"];
            })
        })


        describe('ASGS16 to GNAF (a reverse transformation)', function () {
            it('can convert reverse sfWithin statments')
        })
    })

    async function testGetIds(params) {
        const outputStream = new streams.WritableStream();
        var mochjob = new MochJob('testid', {
            "userId": "sometestuserid",
            "params": params
        });

        var result = processIdJob(mochjob, outputStream);

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

}