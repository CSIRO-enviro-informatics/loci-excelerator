import { Meteor } from 'meteor/meteor';
import Jobs from '../../api/jobs/jobs';
import { convert } from '../../convert';
import { getIds } from '../../iderdown';

Meteor.startup(function () {

    var workers = Jobs.processJobs(['convert', 'iderdown'],
        function (job, workerDone) {
            if (job.type == 'convert') {
                convert(job, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                    workerDone();
                });
            }
            if(job.type == 'iderdown') {
                getIds(job, (err, result) => {
                    if (err) {
                        console.log(err);
                    }
                    workerDone();
                });
            }
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
                queuePos: 1
            }
        }).observe({
            addedAt(document, atIndex, before) {
                Jobs.update({ queuePos: { $gte: atIndex } }, { $inc: { queuePos: 1 } }, { multi: true });
                Jobs.update(document._id, { $set: { queuePos: atIndex } });
                console.log(`Job Added at ${atIndex} (${document._id})`)
            },
            removedAt(oldDocument, atIndex) {
                Jobs.update(oldDocument._id, { $unset: { queuePos: true } })
                console.log(`Job Removed at ${atIndex} (${oldDocument._id})`)
                Jobs.update({ queuePos: { $gt: atIndex } }, { $inc: { queuePos: -1 } }, { multi: true });
                // Jobs.find({ queuePos: { $exists: true } }, {
                //     fields: {
                //         _id: 1,
                //         queuePos: 1
                //     }
                // }).forEach(x => console.log(x));
            }
        })

    Jobs.startJobServer();
});