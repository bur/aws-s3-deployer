'use strict';
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const fs = require('fs');
const extract = require('extract-zip');
const Q = require('q');
const cp = require('child_process');
const s3 = require('s3');
const async = require('async');

const tmpDirectory = '/tmp/'

process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT']

module.exports.deployer = (event, context, callback) => {
    if (event["CodePipeline.job"].data.artifactCredentials) {

        AWS.config.update(event["CodePipeline.job"].data.artifactCredentials);
    }
    var artifactZipName = process.env.ARTIFACT_ZIP_NAME; 

    var s3 = new AWS.S3({
        "signatureVersion": "v4"
    });
    var stage = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters;
    
    for (var i = 0; i < event["CodePipeline.job"].data.inputArtifacts.length; i++) {
        var inputArtifact = event["CodePipeline.job"].data.inputArtifacts[i];

        getFileFromS3(s3, inputArtifact.location.s3Location.objectKey, inputArtifact.location.s3Location.bucketName).then(
            function (zipLocation) {
                return extractZip(zipLocation);
            },
            function (error) {
                return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
            }
        ).then(
            function (extractLocationZip) {
                return extractZip(extractLocationZip + "/" + artifactZipName + ".zip");
            },
            function (error) {
                return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
            }
            ).then(
            function (extractLocationDist) {
                return putDirectoryToS3(extractLocationDist + "/"+artifactZipName+"/", s3, process.env[stage + '_BUCKET']);
            },
            function (error) {
                return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
            }
            ).then(
            function () {
                return context.succeed("Completed Successfully");
            },
            function (error) {
                return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
            }
            ).catch(function (error) {
                return context.fail(generateError(503, 503, 'Stacktrace: ' + error, 'We are currently experiencing a technical issue and will be back up as soon as possible.'));
            })
            .done()
    }

};

var getFileFromS3 = function (s3, key, bucket) {
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
    wstream.on('finish', function () {
        // do stuff
        console.log("Downloads done.");
        deferred.resolve(target);
    });
    fileStream.pipe(wstream);
    return deferred.promise;
}

var extractZip = function (zipLocation) {
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
    }, function (err) {
        console.log('unzips done.');

        deferred.resolve(extractLocation);
    });
    return deferred.promise;
};

var putDirectoryToS3 = function (extractionLocation, s3Client, bucket) {
    console.log('Pushing deployment directory to S3... from ' + extractionLocation);
    var deferred = Q.defer();

    var options = {
        s3Client: s3Client,
    };
    var client = s3.createClient(options);

    var params = {
        localDir: extractionLocation,
        deleteRemoved: true,

        s3Params: {
            Bucket: bucket,
            Prefix: ""

        },
    };

    var uploader = client.uploadDir(params);
    uploader.on('error', function (err) {
        console.error("unable to sync:", err.stack);
        throw err;
    });
    uploader.on('progress', function () {
        console.log("progress", uploader.progressAmount, uploader.progressTotal);
    });
    uploader.on('end', function () {
        console.log("done uploading");
        return deferred.resolve();
    });

    return deferred.promise;
}

var generateError = function (statusParam, errorCodeParam, developerMessageParam, userMessageParam) {
    var errorModel = {
        status: statusParam,
        errorCode: errorCodeParam,
        developerMessage: developerMessageParam,
        userMessage: userMessageParam
    }
    console.log('error: ' + JSON.stringify(errorModel))
    return JSON.stringify(errorModel);
};
