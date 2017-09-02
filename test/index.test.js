var myLambda = require('../handler');
var expect = require('chai').expect;
var LambdaTester = require('lambda-tester');
var sample = require('../sample-event/sample.json');

describe('Deployer handler', function() {
  this.timeout(300000);
  it('should exist', function() {
    expect(myLambda).to.exist;
  });

  it('should have a deployer function', function() {
    expect(myLambda.deployer).to.be.a('function');
  });

  it('should return something', function(done) {
    sample.isTest = true;
    LambdaTester(myLambda.deployer)
      .event(sample)
      .timeout(300)
      .expectSucceed(function(result) {
        expect(result).to.not.be.a('null');
      })
      .verify(done);
  });
})
