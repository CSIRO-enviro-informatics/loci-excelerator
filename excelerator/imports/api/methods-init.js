// Methods related to links

import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http'
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

            var datasetQuery =
                `
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX loci: <http://linked.data.gov.au/def/loci#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?dataset ?pred ?obj
WHERE {
    {
        ?dataset a dcat:Dataset .
        ?dataset ?pred ?obj
    }
    UNION
    {
        ?dataset a loci:Dataset .
        ?dataset ?pred ?obj
    }
}
`;


            try {
                var result = getQueryResults(linksetQuery);
                var json = JSON.parse(result.content);
                var bindings = json.results.bindings;
                var linksets = Helpers.groupBy(bindings, row => row['linkset'].value);
                // var datsetUris = new Set();

                Linkset.remove({});
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

                        if (!datasetObj.title) {
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
            DatasetTypes.remove({}); // clear list
            if (!DatasetTypes.findOne()) {
                console.log("Refreshing Datatypes List")
                try {
                    var result = HTTP.get(Meteor.settings.integrationApi.endpoint + "/dataset/type", {
                        params: {
                            // datasetUri: "",
                            // type: "",
                            basetype: false,
                            // count: 1000,
                            // offset: 0
                        }
                    });

                    var json = JSON.parse(result.content);

                    json.datasets.forEach(x => {
                        DatasetTypes.insert(x);
                    })
                } catch (e) {
                    console.error("Failed to get dataset types from API endpoint")
                    console.log(e);
                }
            }
        }
    }
});
