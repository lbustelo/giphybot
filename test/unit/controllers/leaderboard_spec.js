var sinon = require('sinon');
var chai = require('chai').use(require('sinon-chai'));
var expect = chai.expect;
var proxyquire = require('proxyquire');

//mocks & spies
var LeaderBoardController;
var LeaderBoardReplyMock;
var storeMock;

beforeEach(function(){
  LeaderBoardReplyMock = {
    build: sinon.mock().returns({
      reply: sinon.mock()
    })
  };

  storeMock = {
    Game: {
        forChannel: sinon.mock()
    }
  }

  LeaderBoardController = proxyquire('../../../lib/controllers/leaderboard', { '../models': storeMock, '../replies/leaderboard': LeaderBoardReplyMock });
});

describe('LeaderBoardController', function() {
  it('should reply with no game message when there is no game', function() {
    storeMock.Game.forChannel.returns(Promise.resolve(undefined));

    var mockGame = {
      leaderboard: sinon.stub().returns(Promise.resolve([]))
    }
    var botSpy = {
      reply: sinon.spy()
    }

    return LeaderBoardController(botSpy, {}).then(
      function(){
        sinon.assert.called(botSpy.reply);
        var message = botSpy.reply.args[0][1];
        expect(message).to.be.equal('No active game.');
      }
    );
  });

  it('should reply with LeaderBoardReply when a game is available', function() {
    storeMock.Game.forChannel.returns(Promise.resolve({id:"some id"}));

    var mockGame = {
      leaderboard: sinon.stub().returns(Promise.resolve([{id:'some id', points: 5}]))
    }

    return LeaderBoardController(sinon.mock(), {}).then(
      function(){
        sinon.assert.called(LeaderBoardReplyMock.build);
        var argsToBuild = LeaderBoardReplyMock.build.args[0];
        expect(argsToBuild[0]).to.deep.equal({id:"some id"});
      }
    );
  });
});
