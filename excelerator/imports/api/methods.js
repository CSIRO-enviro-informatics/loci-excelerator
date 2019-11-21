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

            console.log(linksetQuery)
            var result = getQueryResults(linksetQuery);
            var json = JSON.parse(result.content);
            console.log(json)
            var bindings = json.results.bindings;

            var t = null;
            //find a type we know about ie not Feature or Class etc
            bindings.forEach(b => {
                if(!t)
                    t = DatasetTypes.findOne({uri: b.t.value});
            })

            //
            //Need somethign better that string lookup. This is a hack.
            var dataset = DatasetTypes.find({uri: t.uri}).fetch().find(type => {
                var datasetPrefix = type.datasetUri + "/"; //adding slash because of gnaf
                return objectUri.startsWith(datasetPrefix);
            })

            return t;
        } 
    }
});
