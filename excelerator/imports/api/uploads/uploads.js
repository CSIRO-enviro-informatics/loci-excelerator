import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

const config = {
    collectionName: 'Uploads',
    allowClientCode: false, // Disallow remove files from Client
    onBeforeUpload(file) {
        return true;
        // Allow upload files under 10MB, and only in csv formats
        if (file.size <= Meteor.settings.public.uploads.maxSize && /csv/i.test(file.extension)) {
            return true;
        }
        return `Please upload csv file, with size equal or less than ${Meteor.settings.public.uploads.maxSizeText}`;
    }
}

if(Meteor.isServer) {
    config.storagePath = Meteor.settings.public.uploads.path;
}

const Uploads = new FilesCollection(config);
export default Uploads;