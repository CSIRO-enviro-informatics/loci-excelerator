import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

const Datasets = new Mongo.Collection('datasets');
export default Datasets;