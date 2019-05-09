import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

const Linksets = new Mongo.Collection('linksets');
export default Linksets;