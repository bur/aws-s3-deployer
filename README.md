# AWS S3 Code Deployer

The purpose of this lambda function is specifically to deploy s3 output artifacts from AWS Code Build. Those output artifacts utilize AWS [CodeBuild](https://aws.amazon.com/documentation/codebuild/) / [CodePipeline](https://aws.amazon.com/documentation/codepipeline/). This is dependent upon the output artifacts produced during the CodeBuild step to include the s3 distribution content deployment artifacts as a zip file which will be unziped and uploaded.

# Getting Started
Run `npm install` to load the dependencies.

# Usage

This lambda function is invoked upon during the custom deploy stage configured in the AWS CodePipeline.

# Gulp tasks

The following are the available functions that gulp can execute:

## Default

`gulp`

This executes `watch` and `mocha` to trigger.

## Mocha

Mocha is a Node test framework. This triggers all the test cases to execute.


## Watch

Watches for changes in either \*.js or test/\*.js files and executes `gulp mocha`.

# Serverless
