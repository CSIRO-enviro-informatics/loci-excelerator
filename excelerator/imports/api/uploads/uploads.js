import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

const Uploads = new FilesCollection({
    collectionName: 'Uploads',
    allowClientCode: false, // Disallow remove files from Client
    onBeforeUpload(file) {
        // Allow upload files under 10MB, and only in csv formats
        if (file.size <= Meteor.settings.uploads.maxSize && /csv/i.test(file.extension)) {
            return true;
        }
        return `Please upload csv file, with size equal or less than ${Meteor.settings.uploads.maxSizeText}`;
    }
});
export default Uploads;