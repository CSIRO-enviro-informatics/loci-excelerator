# loci-excelerator
A reapportionment tool for the Loc-I project

# IderDown
A tool for downloading subsets of ID's based on within relationship in a given dataset. This feature can be found at the `/iderdown` url. ie Get me all meshblocks within a given SA2

# Development
## Repository Structure
**/excelerator** - Contains a meteor JS (http://meteor.com) application
**/.deploy** - Contains deployment files using meteor up and docker as the main deployment platform

## Excelerator Meteor Application
This is standard meteor app using Blaze.js as the rendering engine. 

The basics of the app are to:
- have a user upload a CSV file, 
- pick some run parameters, 
- submit a job to the job queue
- show progress of the jobs
- send a notification to the user when complete
- allow the output to be downloaded

### File Upload
Files are uploaded to the directory specified in the `settings.json` file

### Job Manager
We have a simple job managed with a single worker integrated into the meteor server. It is possible to have multipl workers that take and run jobs if required. See https://github.com/vsivsi/meteor-job-collection

### REST API
** Incomplete ** 
It would be nice to have this service accessible via a restful API to integrate into other applications.

# Deployment
Deployment is managed via Meteor Up. An application to bundle and configure meteor application on remote servers.

The deployment are triggered from push to certain branches in the repository. Simply merge in master to the deployment branch of your choice and within 15 minutes the jenkins server (https://bigbrother.it.csiro.au:9443) should have worked out there are changes and started deployment.

## Dev / Staging
At this stage we only have prod deployement stage.

## Production
Deployment is initiated via a commit to the prod_deploy branch. 

The `./deploy.sh` script is run to call meteor up.
The keys to the EC2 instance are added as a secretFile in the jenkins instance and retrieved via the script as an env variable.
The deployment is managed via docker with the following volumes on the host:
- `/opt/mongo` The storage for the database data
- `/opt/data/uploads` The location for the uploaded files from the meteor application

# Testing 
The methods for writting test are described at https://guide.meteor.com/testing.html#unit-testing
Also see https://atmospherejs.com/meteortesting/mocha for more information on variable used to teh run the scripts

The basic commands for running the tests that I have setup so far are: 

TEST_WATCH=1 MOCHA_GREP=IDerDown meteor test --settings=settings.json --driver-package meteortesting:mocha
