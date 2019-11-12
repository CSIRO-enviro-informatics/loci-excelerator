// Methods related to links

import { Meteor } from 'meteor/meteor';
import { getQueryResults, PROPS } from '../linksetApi'
import Helpers from '../helpers'
import Linkset from './linksets/linksets'
import Dataset from './datasets/datasets'
import DatasetTypes from './datasetTypes/datasetTypes'

Meteor.methods({
    updateLinksets() {
        if (!this.isSimulation) {
            this.unblock();
            // DatasetTypes.remove({});

            var linksetQuery =
                `PREFIX void: <http://rdfs.org/ns/void#>
PREFIX loci: <http://linked.data.gov.au/def/loci#>
SELECT * 
WHERE {
    ?linkset a loci:Linkset .
    ?linkset ?pred ?obj
}`;

            var datasetQuery =
                `PREFIX void: <http://rdfs.org/ns/void#>
PREFIX loci: <http://linked.data.gov.au/def/loci#>
SELECT * 
WHERE {
    ?dataset a loci:Dataset .
    ?dataset ?pred ?obj
}`;


            try {
                var result = getQueryResults(linksetQuery);
                var json = JSON.parse(result.content);
                var bindings = json.results.bindings;
                var linksets = Helpers.groupBy(bindings, row => row['linkset'].value);
                // var datsetUris = new Set();

                linksets.forEach(lsprops => {
                    try {
                        var linksetObj = {
                            uri: lsprops[0].linkset.value,
                            title: lsprops.find(x => x.pred.value == PROPS.title).obj.value,
                            description: lsprops.find(x => x.pred.value == PROPS.description).obj.value,
                            subjectsTarget: lsprops.find(x => x.pred.value == PROPS.subjectsTarget).obj.value,
                            objectsTarget: lsprops.find(x => x.pred.value == PROPS.objectsTarget).obj.value,
                            modified: lsprops.find(x => x.pred.value == PROPS.modified).obj.value,
                            issued: lsprops.find(x => x.pred.value == PROPS.issued).obj.value,
                            linkPredicates: lsprops.filter(x => x.pred.value == PROPS.linkPredicate).map(x => x.obj.value)
                        }

                        // datsetUris.add(linksetObj.subjectsTarget);
                        // datsetUris.add(linksetObj.objectsTarget);

                        var exists = Linkset.findOne({ uri: linksetObj.uri })
                        if (exists) {
                            Linkset.update(exists._id, { $set: linksetObj })
                        } else {
                            Linkset.insert(linksetObj);
                        }
                    } catch (e) {
                        console.log("Error reading the linksets from the DB. Probably missing data in DB");
                        console.log(lsprops[0].linkset.value);
                    }
                })
                

                var result = getQueryResults(datasetQuery);
                var json = JSON.parse(result.content);
                var bindings = json.results.bindings;
                var datasets = Helpers.groupBy(bindings, row => row['dataset'].value);
                
                Dataset.remove({});
                datasets.forEach(dsprops => {
                    try {
                        var datasetObj = {
                            uri: dsprops[0].dataset.value,
                            // title: dsprops.find(x => x.pred.value == PROPS.label).obj.value, //sometime more than one
                        }

                        if(!datasetObj.title) {
                            datasetObj.title = datasetObj.uri.split('/').pop();
                        }

                        var exists = Dataset.findOne({ uri: datasetObj.uri })
                        if (exists) {
                            Dataset.update(exists._id, { $set: datasetObj })
                        } else {
                            Dataset.insert(datasetObj);
                        }
                    } catch (e) {
                        console.log("Error reading the datasets from the DB. Probably missing data in DB");
                        console.log(dsprops[0].dataset.value);
                    }
                })
            } catch (e) {
                console.log("Error reading the linksets/datasets from the DB. Probably missing data in DB");
                console.log(e);
            }
        }
    },
    updateDatasetTypes() {
        if (!this.isSimulation) {
            this.unblock();
            DatasetTypes.remove({});
            if (!DatasetTypes.findOne()) {
                //predcate are assumed uri isWithin parentUri, unless revesePredicate is true.
                //                 var typesQuery =
                //                     `PREFIX reg: <http://purl.org/linked-data/registry#>
                // SELECT *
                // WHERE {
                //     ?reg a reg:Register ;
                //             reg:register ?rofr ;
                //             reg:containedItemClass ?cic
                // }`;
                //                 try {
                //                     var result = getQueryResults(typesQuery);
                //                     var json = JSON.parse(result.content);
                //                     var bindings = json.results.bindings;
                //                     var types = bingings.map(b => {
                //                         var uri = b['cic'].value;
                //                         return {
                //                             uri,
                //                             title: uri.split(/[#/]+/).pop(),
                //                             datasetUri: b['rofr'].value
                //                         }
                //                     })
                //                 } catch (e) {
                //                     console.log(e)
                //                     return false;
                //                 }

                console.log("Refreshing Datatypes List")


                var asgs16 = [{
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "MeshBlock",
                    uri: "http://linked.data.gov.au/def/asgs#MeshBlock",
                    withinTypes: [
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2",
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3",
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                        "http://linked.data.gov.au/def/asgs#StateOrTerritory"
                    ],
                    baseType: true
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA1",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                    withinTypes: [
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2",
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3",
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                        "http://linked.data.gov.au/def/asgs#StateOrTerritory"
                    ],
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA2",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2",
                    withinTypes: [
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3",
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                        "http://linked.data.gov.au/def/asgs#StateOrTerritory"
                    ],
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA3",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3",
                    withinTypes: [
                        "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                        "http://linked.data.gov.au/def/asgs#StateOrTerritory"
                    ],
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA4",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                    withinTypes: [
                        "http://linked.data.gov.au/def/asgs#StateOrTerritory"
                    ],
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "StateOrTerritory",
                    uri: "http://linked.data.gov.au/def/asgs#StateOrTerritory",
                }];

                var asgs11 = asgs16.map(x => Object.assign({}, x, { datasetUri: "http://linked.data.gov.au/dataset/asgs2011" }));

                var geofabric = [{
                    datasetUri: "http://linked.data.gov.au/dataset/geofabric",
                    title: "Contracted Catchment",
                    uri: "http://linked.data.gov.au/def/geofabric#ContractedCatchment",
                    withinTypes: [
                        "http://linked.data.gov.au/def/geofabric#RiverRegion",
                        "http://linked.data.gov.au/def/geofabric#DrainageDivision"
                    ],
                    baseType: true
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/geofabric",
                    title: "River Region",
                    uri: "http://linked.data.gov.au/def/geofabric#RiverRegion",
                    withinTypes: [
                        "http://linked.data.gov.au/def/geofabric#DrainageDivision"
                    ],
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/geofabric",
                    title: "Drainage Division",
                    uri: "http://linked.data.gov.au/def/geofabric#DrainageDivision",
                }];

                var gnafCurrent = [{
                    datasetUri: "http://linked.data.gov.au/dataset/gnaf",
                    title: "Address",
                    uri: "http://linked.data.gov.au/def/gnaf#Address",
                    withinTypes: [
                        "http://linked.data.gov.au/def/gnaf#StreetLocality",
                        "http://linked.data.gov.au/def/gnaf#Locality"
                    ],
                    baseType: true,
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/gnaf",
                    title: "Street Locality",
                    uri: "http://linked.data.gov.au/def/gnaf#StreetLocality",
                    withinTypes: [
                        "http://linked.data.gov.au/def/gnaf#Locality"
                    ],
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/gnaf",
                    title: "Locality",
                    uri: "http://linked.data.gov.au/def/gnaf#Locality",
                }]

                var gnaf16 = gnafCurrent.map(x => Object.assign({}, x, { datasetUri: "http://linked.data.gov.au/dataset/gnaf-2016-05" }));

                var all = [].concat.apply([], [asgs16, asgs11, geofabric, gnafCurrent, gnaf16]);

                all.forEach(x => {
                    DatasetTypes.insert(x);
                })
            }
        }
    }
});
