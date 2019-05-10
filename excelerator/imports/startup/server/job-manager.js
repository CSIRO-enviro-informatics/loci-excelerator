import { Meteor } from 'meteor/meteor';
import Jobs from '../../api/jobs/jobs'
import {convert} from '../../convert'

Meteor.startup(function () {

    var workers = Jobs.processJobs('convert',
        function (job, workerDone) {
            convert(job, (err, result) => {
                if(err) {
                    console.log(err);
                }
                workerDone();
            });            
        }
    );

    Jobs.startJobServer();
});