# AWS Lambda Deployer

The purpose of this lambda function (prepare yourselves) is specifically to deploy lambda functions. Those lambda functions must utilize the
[Serverless Framework](https://serverless.com/framework/docs/ "Serverless Docs") in addition to AWS [CodeBuild](https://aws.amazon.com/documentation/codebuild/) / [CodePipeline](https://aws.amazon.com/documentation/codepipeline/). This is dependent upon the output artifacts produced during the CodeBuild step to include the lambda deployment artifacts (jar or zip files) and the serverless.yml + any file dependencies the serverless.yml may reference.

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
