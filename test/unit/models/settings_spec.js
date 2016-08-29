'use strict';

require('./with_clean_db.js');

var chai = require('chai')
, expect = chai.expect
, store = require('../../../lib/models')

describe('Settings', function() {
  var aGame;
  var aPlayer;

  before(function(){
      return Promise.all([
        store.Game.create(),
        store.Player.create()
      ]).then(
        function([game, player]){
          aGame = game;
          aPlayer = player;


          var setting1 = store.Settings.create({
            name: 'setting1',
            value: JSON.stringify('a'),
            game: game.id,
            player: player.id
          });

          var settingForGame = store.Settings.create({
            name: 'settingForGame',
            value: JSON.stringify('b'),
            game: game.id
          });

          var settingForPlayer = store.Settings.create({
            name: 'settingForPlayer',
            value: JSON.stringify([1,2,3]),
            player: player.id
          });

          return Promise.all([setting1, settingForGame, settingForPlayer])
        }
      );
  });

  describe('get()', function() {
    it('returns a promise with null if settings is not there', function() {
      return store.Settings.get(aGame, aPlayer, 'some_settings_does_not_exist').then(
        function(value){
          expect(value).to.be.null;
        }
      );
    });

    it('returns a promise with the value or an existing settings', function() {
      return store.Settings.get(aGame, aPlayer, 'setting1').then(
        function(value){
          expect(value).to.equal('a');
        }
      );
    });

    describe('with or()', function() {
      it('returns a promise with the default value for a settings that is not found', function() {
        return store.Settings.get(aGame, aPlayer, 'some_settings_does_not_exist').or(5).then(
          function(value){
            expect(value).to.equal(5);
          }
        );
      });

      it('returns a promise with the actual value for a settings that exist', function() {
        return store.Settings.get(aGame, aPlayer, 'setting1').or(5).then(
          function(value){
            expect(value).to.equal('a');
          }
        );
      });
    });

  });

  describe('put()', function() {
    it('returns a promise with null if settings is not there', function() {
      return store.Settings.get(aGame, aPlayer, 'some_settings_does_not_exist').then(
        function(value){
          expect(value).to.be.null;
        }
      );
    });
  });

  describe('inGame()', function() {
    it('returns a promise with value of setting for game', function() {
      return store.Settings.inGame(aGame).get('settingForGame').then(
        function(value){
          expect(value).to.equal('b');
        }
      );
    });

    describe('forPlayer()', function() {
      it('returns a promise with value', function() {
        return store.Settings.inGame(aGame).forPlayer(aPlayer).get('setting1').then(
          function(value){
            expect(value).to.equal('a');
          }
        );
      });
    });
  });

  describe('forPlayer()', function() {
    it('returns a promise with value of setting for player', function() {
      return store.Settings.forPlayer(aPlayer).get('settingForPlayer').then(
        function(value){
          expect(value).to.deep.equal([1,2,3]);
        }
      );
    });
  });
});
