import { Meteor } from 'meteor/meteor';
import Jobs from '../../api/jobs/jobs'
import { convert } from '../../convert'

Meteor.startup(function () {

    var workers = Jobs.processJobs('convert',
        function (job, workerDone) {
            convert(job, (err, result) => {
                if (err) {
                    console.log(err);
                }
                workerDone();
            });
        }
    );

    Jobs.find({
        status: 'ready',
        runId: null
    }, {
            sort: {
                priority: 1,
                retryUntil: 1,
                after: 1
            },
            fields: {
                _id: 1,
            }
        }).observe({
            addedAt(document, atIndex, before) {                
                Jobs.update(document._id, {$set: {queuePos: atIndex}});
                console.log(`Job Added at ${atIndex} (${document._id})`)
            },
            changedAt(newDocument, oldDocument, atIndex) {
                Jobs.update(newDocument._id, {$set: {queuePos: atIndex}})
                console.log(`Job Changed at ${atIndex} (${newDocument._id})`)
            },
            removedAt(oldDocument, atIndex) {
                Jobs.update(oldDocument._id, {$unset: {queuePos: true}})
                console.log(`Job Removed at ${atIndex} (${oldDocument._id})`)
            }
        })

    Jobs.startJobServer();
});