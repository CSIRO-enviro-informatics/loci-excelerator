import Jobs from '../../api/jobs/jobs'

Jobs.allow({
    admin: function (userId, method, params) {
        return true;
    }
});
