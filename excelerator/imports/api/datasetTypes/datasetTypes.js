import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

const DatasetTypes = new Mongo.Collection('datasetTypes');
export default DatasetTypes;