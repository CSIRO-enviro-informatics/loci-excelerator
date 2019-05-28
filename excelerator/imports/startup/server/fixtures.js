// Fill the DB with example data on startup

import { Meteor } from 'meteor/meteor';
import Datasets from '../../api/datasets/datasets'
import Linksets from '../../api/linksets/linksets'

Meteor.startup(() => {

    Meteor.call('updateLinksets');

    if (!Datasets.findOne()) {
        console.log("Adding Initial Datasets");
        Datasets.insert({
            uri: "http://linked.data.gov.au/dataset/asgs2016",
            title: "ASGS 2016"
        });
        Datasets.insert({
            uri: "http://linked.data.gov.au/dataset/geofabric",
            title: "Geofabric"
        });
        Datasets.insert({
            uri: "http://linked.data.gov.au/dataset/asgs2011",
            title: "ASGS 2011"
        });
        Datasets.insert({
            uri: "http://linked.data.gov.au/dataset/gnaf-2016-05",
            title: "G-NAF (May 2016)"
        });
        Datasets.insert({
            uri: "http://linked.data.gov.au/dataset/gnaf",
            title: "G-NAF"
        });
    }

});
