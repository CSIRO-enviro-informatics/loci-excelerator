import { App } from '../../core.js'
import { Random } from 'meteor/random'

const ID_TAG = "excelerator.browserId";
if (localStorage) {
    var id = localStorage.getItem(ID_TAG);
    if(!id) {
        id = Random.id();
        localStorage.setItem(ID_TAG, id);
    }
    App.dataId.set(id);
} else {
    App.dataId.set('unavailable');
}