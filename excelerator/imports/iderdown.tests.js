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
            // it('can parse ID and URIS', function () {
            //     var filterTypeUri = "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1";
            //     var idText = `11202124804, 11202124803, http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805`
            //     var results = parseFilterIds(filterTypeUri, idText);
            //     var expects = ["http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124805", "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124803"];
            //     chai.assert.sameMembers(results, expects, "Different results");
            // })
            // it('will fail with wrong class uri', function () {
            //     var filterTypeUri = "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1";
            //     var idText = `http://linked.data.gov.au/dataset/asgs2016/wrongclass/11202124804`

            //     try {
            //         var results = parseFilterIds(filterTypeUri, idText);
            //         chai.assert.fail("Should have failed");
            //     } catch (e) {
            //     }
            // })
        })

        describe("FULL CACHE TESTS", function() {
            describe('ASGS16', function () {
                it('can extract approriate ids from a single SA1', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#MeshBlock",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/80109110406"
                    };
                    var results = await testGetIds(params);
                    // var expects = [
                    //     { "MeshBlock": "http://linked.data.gov.au/dataset/asgs2016/meshblock/11204384900", "SA1": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804" },
                    //     { "MeshBlock": "http://linked.data.gov.au/dataset/asgs2016/meshblock/11205876800", "SA1": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/11202124804" },
                    // ];
                    // chai.assert.sameDeepMembers(results.data, expects, "Expected the same")
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    chai.assert.lengthOf(results.data, 3, "Expected 3");
                })

                it('can extract approriate ids from multiple SA1s', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#MeshBlock",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/80106106908, http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel1/80109110406"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    chai.assert.lengthOf(results.data, 3 + 4, "Expected 7");
                })

                it('can extract approriate SA1 ids from a single SA2', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel2/801031031"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    chai.assert.lengthOf(results.data, 2, "Expected 2");
                })

                it('can extract approriate SA2 ids from a single SA3', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel3/80103"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    chai.assert.lengthOf(results.data, 5, "Expected 5");
                })

                it('can extract approriate SA3 ids from a single SA4', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel4/801"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    chai.assert.lengthOf(results.data, 10, "Expected 10");
                })

                it('can extract approriate SA4 ids from a single STATE', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#StateOrTerritory",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/stateorterritory/ACT"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    chai.assert.lengthOf(results.data, 1, "Expected 1");
                })
                
                it('can extract approriate MB ids from SA2 (transitive within)', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#MeshBlock",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/statisticalarealevel2/801031031"
                    };
                    var results = await testGetIds(params);
                    chai.assert.lengthOf(results.data, 13, "Expected 13")
                })

                it('can extract approriate STATE ids from AUSTRALIA', async function () {
                    var params = {
                        "outputUri": DATASETS.asgs2016,
                        "outputTypeUri": "http://linked.data.gov.au/def/asgs#StateOrTerritory",
                        "filterUri": DATASETS.asgs2016,
                        "filterTypeUri": "http://linked.data.gov.au/def/asgs#Australia",
                        "idText": "http://linked.data.gov.au/dataset/asgs2016/australia/036"
                    };
                    var results = await testGetIds(params);
                    chai.assert.lengthOf(results.data, 9, "Expected 9 States")
                })
            })

            describe('Geofabric', function () {
                it('can extract approriate CC ids from RR', async function () {
                    var params = {
                        "outputUri": DATASETS.geofabric,
                        "outputTypeUri": "http://linked.data.gov.au/def/geofabric#ContractedCatchment",
                        "filterUri": DATASETS.geofabric,
                        "filterTypeUri": "http://linked.data.gov.au/def/geofabric#RiverRegion",
                        "idText": "http://linked.data.gov.au/dataset/geofabric/riverregion/9400390"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    //Need actual value here once results are available in cache
                    // chai.assert.notEqual(results.data.length, 2, "Expecting 2");
                })

                it('can extract approriate RR ids from DD', async function () {
                    var params = {
                        "outputUri": DATASETS.geofabric,
                        "outputTypeUri": "http://linked.data.gov.au/def/geofabric#RiverRegion",
                        "filterUri": DATASETS.geofabric,
                        "filterTypeUri": "http://linked.data.gov.au/def/geofabric#DrainageDivision",
                        "idText": "http://linked.data.gov.au/dataset/geofabric/drainagedivision/9400207"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    // chai.assert.lengthOf(results.data, 12, "Expected 12 RRs given DD");
                })

                it('can extract approriate CC ids from DD (transitive within)', async function () {
                    var params = {
                        "outputUri": DATASETS.geofabric,
                        "outputTypeUri": "http://linked.data.gov.au/def/geofabric#ContractedCatchment",
                        "filterUri": DATASETS.geofabric,
                        "filterTypeUri": "http://linked.data.gov.au/def/geofabric#DrainageDivision",
                        "idText": "http://linked.data.gov.au/dataset/geofabric/drainagedivision/9400207"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    //Need actual value here once results are available in cache
                    //chai.assert.notEqual(results.data.length, 0, "Should have some results");
                })
            })

            describe('GNAF Current', function () {
                it('can extract approriate Address from locality', async function () {
                    var params = {
                        "outputUri": DATASETS.gnaf,
                        "outputTypeUri": "http://linked.data.gov.au/def/gnaf#Address",
                        "filterUri": DATASETS.gnaf,
                        "filterTypeUri": "http://linked.data.gov.au/def/gnaf#Locality",
                        "idText": "http://linked.data.gov.au/dataset/gnaf/locality/ACT328"
                    };
                    var results = await testGetIds(params);
                    chai.assert.notEqual(results.data.length, 0, "Should have some results");
                    // chai.assert.lengthOf(results.data, 83, "Expected 83 RRs given DD");
                })

                // it('can extract approriate Address from locality', async function () {
                //     var params = {
                //         "outputUri": DATASETS.gnaf16,
                //         "outputTypeUri": "http://linked.data.gov.au/def/gnaf#Address",
                //         "filterUri": DATASETS.gnaf16,
                //         "filterTypeUri": "http://linked.data.gov.au/def/gnaf#Locality",
                //         "idText": "http://linked.data.gov.au/dataset/gnaf-2016-05/locality/ACT570"
                //     };
                //     var results = await testGetIds(params);
                //     chai.assert.notEqual(results.data.length, 0, "Should have some results");
                //     // chai.assert.lengthOf(results.data, 83, "Expected 83 RRs given DD");
                // })

            })
            
        })
    })

    async function testGetIds(params) {
        const outputStream = new streams.WritableStream();
        var mochjob = new MochJob('testid', {
            "userId": "sometestuserid",
            "params": params
        });

        processIdJob(mochjob, outputStream);

        var output = outputStream.toString();
        // console.log(JSON.stringify({fileout:output}));

        var parseResult = Papa.parse(output, {
            header: true,
            skipEmptyLines: true
        });

        // if (parseResult.errors.length > 0) {
        //     chai.assert.fail(parseResult.errors[0].message);
        // }        

        return {
            data: parseResult.data,
        };
    }

}