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

            var linksetQuery =
                `PREFIX void: <http://rdfs.org/ns/void#>
PREFIX loci: <http://linked.data.gov.au/def/loci#>
SELECT * 
WHERE {
    ?linkset a loci:Linkset .
    ?linkset ?pred ?obj
}`;

            try {
                var result = getQueryResults(linksetQuery);
                var json = JSON.parse(result.content);
                var bindings = json.results.bindings;
                var linksets = Helpers.groupBy(bindings, row => row['linkset'].value);
                var datsetUris = new Set();

                linksets.forEach(lsprops => {
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

                    datsetUris.add(linksetObj.subjectsTarget);
                    datsetUris.add(linksetObj.objectsTarget);

                    var exists = Linkset.findOne({ uri: linksetObj.uri })
                    if (exists) {
                        Linkset.update(exists._id, { $set: linksetObj })
                    } else {
                        Linkset.insert(linksetObj);
                    }
                })

                datsetUris.forEach(uri => {
                    var title = uri.split('/').pop();
                    var exists = Dataset.findOne({ uri: uri });
                    if (exists) {
                        Dataset.update(exists.uri, {
                            $set: {
                                title
                            }
                        })
                    } else {
                        Dataset.insert({
                            uri,
                            title
                        });
                    }
                })

                return true;
            } catch (e) {
                console.log(e)
                return false;
            }
        }
    },
    updateDatasetTypes() {
        if (!this.isSimulation) {
            this.unblock();
            // DatasetTypes.remove({});
            if (!DatasetTypes.findOne()) {
                console.log('Adding fake datatypes')

                var asgs16 = [{
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "MeshBlock",
                    uri: "http://linked.data.gov.au/def/asgs#MeshBlock",
                    withinType: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1"
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA1",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel1",
                    withinType: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2"
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA2",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel2",
                    withinType: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3"
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA3",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel3",
                    withinType: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4"
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/asgs2016",
                    title: "SA4",
                    uri: "http://linked.data.gov.au/def/asgs#StatisticalAreaLevel4",
                }];

                var asgs11 = asgs16.map(x => Object.assign({}, x, { datasetUri: "http://linked.data.gov.au/dataset/asgs2011" }));

                var geofabric = [{
                    datasetUri: "http://linked.data.gov.au/dataset/geofabric",
                    title: "Contracted Catchment",
                    uri: "http://linked.data.gov.au/def/geofabric#ContractedCatchment",
                    withinType: "http://linked.data.gov.au/def/geofabric#RiverRegion"
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/geofabric",
                    title: "River Region Catchment",
                    uri: "http://linked.data.gov.au/def/geofabric#RiverRegion",
                    withinType: "http://linked.data.gov.au/def/geofabric#DrainageDivision"
                }, {
                    datasetUri: "http://linked.data.gov.au/dataset/geofabric",
                    title: "Drainage Division",
                    uri: "http://linked.data.gov.au/def/geofabric#DrainageDivision",
                }];

                var gnafCurrent = [{
                    datasetUri: "http://linked.data.gov.au/dataset/gnaf",
                    title: "Address",
                    uri: "http://linked.data.gov.au/def/gnaf#Address",
                }]

                var gnaf16 = gnafCurrent.map(x => Object.assign({}, x, { datasetUri: "http://linked.data.gov.au/dataset/gnaf-2016-05" }));

                var all = [].concat.apply([],[asgs16, asgs11, geofabric, gnafCurrent, gnaf16]);

                all.forEach(x => {
                    DatasetTypes.insert(x);
                    console.log(x);
                })
            }
        }
    }
});
