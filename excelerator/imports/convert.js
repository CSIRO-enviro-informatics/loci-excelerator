import Uploads from './api/uploads/uploads'
import { Meteor } from 'meteor/meteor'

export function convert(job, cb) {
    console.log('Job processed');
    var jobData = job.data;
    var count = 1;
    var timerId = Meteor.setInterval(() => {
        count++;
        job.progress(count * 10, 100);
        if(count == 10) {
            job.done();
            Meteor.clearInterval(timerId);
            cb()
        }
    }, 1000);

    // Uploads.addFile(path, {
    //     fileName: "",
    //     type: "text/csv",
    //     meta: {},        
    // }, (err, fileRef) => {
    //     var fileId = fileRef.get("_id");
    //     console.log(`OUTPUT File: ${fileId}`)
    // });
}