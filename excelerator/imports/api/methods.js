// Methods related to links

import { Meteor } from 'meteor/meteor';
import { getQueryResults, PROPS } from '../linksetApi'
import Helpers from '../helpers'
import Linkset from './linksets/linksets'
import Dataset from './datasets/datasets'
import DatasetTypes from './datasetTypes/datasetTypes'

Meteor.methods({
    getObjectDatasetType(objectUri) {
        if (!this.isSimulation) {
            this.unblock();

            var linksetQuery =
                `select * where { 
                    <${objectUri}> a ?t .
                }`;

            try {
                var result = getQueryResults(linksetQuery);
                var json = JSON.parse(result.content);
                var bindings = json.results.bindings;

                bindings.forEach(b => {
                    result = DatasetTypes.findOne({uri: b.t.value});
                    if(result)
                        return result;
                })
            } catch (e) {
                console.log("Error assessing object type");
                console.log(e);
            }
            return null;
        } 
    }
});
