// Methods related to links

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Uploads } from './uploads.js';
import { getQueryResults } from '../../linksetApi'
import { HTTP } from 'meteor/http'

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
    ?linkset ?prop ?obj
}`;

            try {
                var result = getQueryResults(linksetQuery);
                var json = JSON.parse(result.content);
                var bindings = json.results.bindings;
                var linksets = groupBy(bindings, row => row['linkset'].value);
                linksets.forEach(ls => {
                    console.log(ls[0].linkset.value);
                })
                return true;
            } catch (e) {
                console.log(e)
                return false;
            }
        }
    }
});

function groupBy(list, keyGetter) {
    const map = new Map();
    list.forEach((item) => {
         const key = keyGetter(item);
         const collection = map.get(key);
         if (!collection) {
             map.set(key, [item]);
         } else {
             collection.push(item);
         }
    });
    return map;
}
