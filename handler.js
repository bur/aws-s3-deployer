'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const fs = require('fs');
const extract = require('extract-zip');
const Q = require('q');
const cp = require('child_process');
const tmpDirectory = '/tmp/'

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT']

module.exports.deployer = (event, context, callback) => {
    if (event["CodePipeline.job"].data.artifactCredentials) {

        AWS.config.update(event["CodePipeline.job"].data.artifactCredentials);
    }

    var s3 = new AWS.S3({
        "signatureVersion": "v4"
    });
    var stage = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters;
    for (var i = 0; i < event["CodePipeline.job"].data.inputArtifacts.length; i++) {
        var inputArtifact = event["CodePipeline.job"].data.inputArtifacts[i];

        getFileFromS3(s3, inputArtifact.location.s3Location.objectKey, inputArtifact.location.s3Location.bucketName).then(
                function(zipLocation) {
                    return extractZip(zipLocation);
                },
                function(error) {
                    return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
                }
            ).then(
                function(extractLocation) {
                    return createServerlessSymlink(extractLocation);
                },
                function(error) {
                    return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
                }).then(
                function(extractLocation) {
                    return executeServerless(extractLocation, stage, event.isTest);
                },
                function(error) {
                    return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
                }
            ).then(
                function() {
                    return context.succeed("Completed Successfully");
                },
                function(error) {
                    return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
                }
            ).catch(function(error) {
                return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
            })
            .done()
    }

};

var getFileFromS3 = function(s3, key, bucket) {
    console.log('Getting file from S3...');
    var filename = key.split('/')[key.split('/').length - 1];
    var deferred = Q.defer();

    var fileStream = s3.getObject({
        Key: key,
        Bucket: bucket
    }).createReadStream();

    var target = tmpDirectory + filename;
    if (filename.indexOf('.zip') === -1) {
        target += '.zip';
    }

    var wstream = fs.createWriteStream(target);
    wstream.on('finish', function() {
        // do stuff
        console.log("Downloads done.");
        deferred.resolve(target);
    });
    fileStream.pipe(wstream);
    return deferred.promise;
}

var extractZip = function(zipLocation) {
    var deferred = Q.defer();
    var extractLocation = null;
    if (zipLocation.indexOf('.zip') !== -1) {
        extractLocation = zipLocation.replace('.zip', '');
    } else {
        extractLocation = zipLocation;
    }
    var source = zipLocation;

    extract(source, {
        dir: extractLocation
    }, function(err) {
        console.log('unzips done.');

        deferred.resolve(extractLocation);
    });
    return deferred.promise;
};

var createServerlessSymlink = function(extractLocation) {
    var deferred = Q.defer();
    fs.symlink(__dirname + '/node_modules/serverless/bin/serverless', extractLocation + '/serverless', function(err) {
        console.log('symlink done.');
        deferred.resolve(extractLocation);
    });
    return deferred.promise;
}

var executeServerless = function(extractLocation, stage, isTest) {
    var deferred = Q.defer();
    var serverlessCmd = 'deploy --stage ' + stage;

    if (isTest && isTest === true) {
      serverlessCmd += ' -n'
    };


    cp.exec('./serverless ' + serverlessCmd, {
        cwd: extractLocation
    }, function(error, stdout, stderr) {
        if (error) {
            console.error(`exec error: ${error}`);
            deferred.reject(new Error(err));
        }
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);
        deferred.resolve(null);
    });

    return deferred.promise;
}

var generateError = function(statusParam, errorCodeParam, developerMessageParam, userMessageParam) {
    var errorModel = {
        status: statusParam,
        errorCode: errorCodeParam,
        developerMessage: developerMessageParam,
        userMessage: userMessageParam
    }
    console.log('error: ' + JSON.stringify(errorModel))
    return JSON.stringify(errorModel);
};
