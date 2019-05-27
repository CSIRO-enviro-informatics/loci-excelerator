// Fill the DB with example data on startup

import { Meteor } from 'meteor/meteor';
import Datasets from '../../api/datasets/datasets'
import Linksets from '../../api/linksets/linksets'

Meteor.startup(() => {

    Meteor.call('updateLinksets');

    // if (!Datasets.findOne()) {
    //     console.log("Adding Initial Datasets");
    //     Datasets.insert({
    //         uri: "http://linked.data.gov.au/dataset/asgs2016",
    //         title: "ASGS 2016"
    //     });
    //     Datasets.insert({
    //         uri: "http://linked.data.gov.au/dataset/geofabric",
    //         title: "Geofabric"
    //     });
    //     Datasets.insert({
    //         uri: "http://linked.data.gov.au/dataset/asgs2011",
    //         title: "ASGS 2011"
    //     });
    //     Datasets.insert({
    //         uri: "http://linked.data.gov.au/dataset/gnaf-2016-05",
    //         title: "G-NAF (May 2016)"
    //     });
    //     Datasets.insert({
    //         uri: "http://linked.data.gov.au/dataset/gnaf",
    //         title: "G-NAF"
    //     });
    // }

    // if (!Linksets.findOne()) {
    //     console.log("Adding Initial Linksets");
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/ajkdsx",
    //         title: "Meshblocks Contracted Catchments Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/asgs2016",
    //         objectsTarget: "http://linked.data.gov.au/dataset/geofabric"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/pwklff",
    //         title: "Addresses (Nov 2018) Mesh Block (2011) Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/gnaf",
    //         objectsTarget: "http://linked.data.gov.au/dataset/asgs2011"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/iwdhmf",
    //         title: "Addresses (Nov 2018) Mesh Block (2016) Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/gnaf",
    //         objectsTarget: "http://linked.data.gov.au/dataset/asgs2016"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/0854185c-a5d9-463b-b833-585dc82588f2",
    //         title: "Meshblocks 2011/2016 Correspondences by area",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/asgs2011",
    //         objectsTarget: "http://linked.data.gov.au/dataset/asgs2016"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/bhafvq",
    //         title: "Addresses Catchments Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/geofabric",
    //         objectsTarget: "http://linked.data.gov.au/dataset/gnaf"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/ajkdsx",
    //         title: "Meshblocks Contracted Catchments Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/asgs2016",
    //         objectsTarget: "http://linked.data.gov.au/dataset/geofabric"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/eawlyn",
    //         title: "Addresses (May 2016) to Mesh Block (2016) Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/gnaf-2016-05",
    //         objectsTarget: "http://linked.data.gov.au/dataset/asgs2016"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/eawlyn",
    //         title: "Addresses (May 2016) to Mesh Block (2016) Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/gnaf-2016-05",
    //         objectsTarget: "http://linked.data.gov.au/dataset/asgs2016"
    //     });
    //     Linksets.insert({
    //         uri: "http://linked.data.gov.au/linkset/kfjdhg",
    //         title: "Addresses (May 2016) Mesh Block (2011) Linkset",
    //         subjectsTarget: "http://linked.data.gov.au/dataset/gnaf-2016-05",
    //         objectsTarget: "http://linked.data.gov.au/dataset/asgs2011"
    //     });
    // }
});
