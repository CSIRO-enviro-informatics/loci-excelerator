// Methods related to links

import { Meteor } from 'meteor/meteor';
import { getQueryResults, PROPS } from '../linksetApi'
import Helpers from '../helpers'
import Linkset from './linksets/linksets'
import Dataset from './datasets/datasets'

Meteor.methods({
    updateLinksets: function () {
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

                    var exists = Linkset.findOne({uri: linksetObj.uri})
                    if(exists) {
                        Linkset.update(exists._id, {$set: linksetObj})
                    } else {
                        Linkset.insert(linksetObj);
                    }
                })

                datsetUris.forEach(uri => {
                    var title = uri.split('/').pop();
                    var exists = Dataset.findOne({uri: uri});
                    if(exists) {
                        Dataset.update(exists.uri, {$set: {
                            title
                        }})
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
    }
});
