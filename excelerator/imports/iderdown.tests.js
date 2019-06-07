if (Meteor.isServer) {
    import chai from 'chai'
    import { MochJob } from './convert.tests'
    import { processIdJob } from './iderdown.js'
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
            console.log(DatasetTypes.find().fetch());
        });

        describe('expected errors', function () {
        })

        describe('ASGS16:MB filtered by ASGS16:SA1', function () {
            it('can extract approriate ids', async function () {
                var params = {
                    "outputUri": DATASETS.asgs2016,
                    "outputTypeUri": "http://linked.data.gov.au/def/asgs#MeshBlock",
                    "filterUri": DATASETS.asgs2016,
                    "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                    "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/80108109107"
                };
                var results = await testGetIds(params);

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