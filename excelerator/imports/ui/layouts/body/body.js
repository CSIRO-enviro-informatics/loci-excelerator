import './body.html';
import '../../components/help/help'

import { App } from '../../../core.js';
import { Template }    from 'meteor/templating';

Template.App_body.helpers({
    dataId: function() {
        return App.dataId.get();
    }
})