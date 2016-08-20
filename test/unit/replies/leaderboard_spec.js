var sinon = require('sinon');
var chai = require('chai').use(require('sinon-chai'));
var expect = chai.expect;
var proxyquire = require('proxyquire');

//mocks & spies
var LeaderBoardReply;
var LeaderBoardMessageBuilderMock;
var slack_usersMock;
beforeEach(function(){
  LeaderBoardMessageBuilderMock = sinon.mock().returns({});
  slack_usersMock = {};
  var slack_users_require = sinon.mock().returns(slack_usersMock);
  LeaderBoardReply = proxyquire('../../../lib/replies/leaderboard', { '../messages/leaderboard': LeaderBoardMessageBuilderMock, '../slack/users': slack_users_require });
});

describe('LeaderBoardReply', function() {
  it('should reply with question if leaderboard is empty', function() {
    var mockGame = {
      leaderboard: sinon.stub().returns(Promise.resolve([]))
    }
    var botSpy = {
      reply: sinon.spy()
    }

    return LeaderBoardReply.build(mockGame).reply(botSpy, sinon.mock()).then(
      function(){
        sinon.assert.called(botSpy.reply);
        var message = botSpy.reply.args[0][1];
        expect(message).to.be.equal('Where\'s everybody?');
      }
    );
  });

  it('should reply with message from LeaderBoardMessageBuilder', function() {
    var mockGame = {
      leaderboard: sinon.stub().returns(Promise.resolve([{id:'some id', points: 5}]))
    }
    var botSpy = {
      reply: sinon.spy()
    }

    slack_usersMock.decorate = sinon.mock().returns(Promise.resolve([{id:'some id', points: 5, name: 'some name'}]));

    return LeaderBoardReply.build(mockGame).reply(botSpy, sinon.mock()).then(
      function(){
        sinon.assert.called(botSpy.reply);
        var message = botSpy.reply.args[0][1];
        expect(message).to.be.an('object');

        sinon.assert.called(LeaderBoardMessageBuilderMock);
        var argsToBuilder = LeaderBoardMessageBuilderMock.args[0];
        expect(argsToBuilder[0]).to.deep.equal([{id:'some id', points: 5, name: 'some name'}]);
        expect(argsToBuilder[1]).to.be.an('undefined');
      }
    );
  });

  it('should reply with message from LeaderBoardMessageBuilder with title', function() {
    var mockGame = {
      leaderboard: sinon.stub().returns(Promise.resolve([{id:'some id', points: 5}]))
    }
    var botSpy = {
      reply: sinon.spy()
    }

    slack_usersMock.decorate = sinon.mock().returns(Promise.resolve([{id:'some id', points: 5, name: 'some name'}]));

    return LeaderBoardReply.build(mockGame, 'some title').reply(botSpy, sinon.mock()).then(
      function(){
        sinon.assert.called(botSpy.reply);
        var message = botSpy.reply.args[0][1];
        expect(message).to.be.an('object');

        sinon.assert.called(LeaderBoardMessageBuilderMock);
        var argsToBuilder = LeaderBoardMessageBuilderMock.args[0];
        expect(argsToBuilder[0]).to.deep.equal([{id:'some id', points: 5, name: 'some name'}]);
        expect(argsToBuilder[1]).to.equal('some title');
      }
    );
  });
});
