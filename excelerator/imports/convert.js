import Uploads from './api/uploads/uploads'
import { Meteor } from 'meteor/meteor'
import fs from 'fs';
import Papa from 'papaparse';

export function convert(job, cb) {
    var jobData = job.data;

    var file = Uploads.findOne({ _id: jobData.from.fileId });
    var inputFile = file.get('path');
    var outputFile = `${Meteor.settings.public.uploads.path}/converted_${file.get("_id")}`;

    const inputStream = fs.createReadStream(inputFile);
    const outputStream = fs.createWriteStream(outputFile);
    const csvStream = inputStream.pipe(Papa.parse(Papa.NODE_STREAM_INPUT));

    function failAndCleanUp(err) {
        console.log(err);
        inputStream.destroy();
        outputStream.destroy();
        csvStream.destroy();
        job.fail();
        cb();
    }

    //read all in memeory implementation
    var data = [];

    csvStream.on('data', function (item) {
        data.push(item);
    });

    csvStream.on('error', (err) => {
        failAndCleanUp(err);
    })

    csvStream.on('end', () => {
        data.forEach((row, i) => {
            if (jobData.from.header && i == 0)
                row.push('Test Header');
            else
                row.push("Shane Test");
            // var rowText = row.join(', '); need to factor in delimiters
            var rowText = Papa.unparse([row], {header: false});
            outputStream.write(rowText + "\n");
        })
        outputStream.end();
    })

    outputStream.on('error', (err) => {
        failAndCleanUp(err);
    })

    outputStream.on('finish', () => {
        var metadata = file.get('meta');

        Uploads.addFile(outputFile, {
            fileName: `converted - ${file.get('name')}`,
            type: "text/csv",
            meta: {
                userId: metadata.userId,
                inputFileId: jobData.from.fileId,
                jobId: job._id
            },
        }, (err, fileObj) => {
            if (err) {
                job.fail();
            } else {
                var fileId = fileObj._id;
                job.done({ fileId });
            }
            cb();
        });
    })



    // var count = 1;
    // var timerId = Meteor.setInterval(() => {
    //     count++;
    //     job.progress(count * 10, 100);
    //     if(count == 10) {
    //         job.done();
    //         Meteor.clearInterval(timerId);
    //         cb()
    //     }
    // }, 1000);

}