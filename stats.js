var moment = require('moment');
const EventEmitter = require('events');

const LEVEL_UP_EVENT="level_up";

var Stats = function(config){
  var config = config || {};

  this.threshold = config.threshold || this.threshold;
  this.points = config.points || this.points;
  this.level = config.level || this.level;

  this.emitter = new EventEmitter();
}

Stats.prototype = {
  points: 0,
  threshold: 10,
  level: 1,
  start_time: moment()
}

Stats.prototype.onLevelUp = function(callback){
  this.emitter.on(LEVEL_UP_EVENT, callback);
}

Stats.prototype.rate = function(){
  var timeSinceStart = Math.ceil(moment.duration(moment().diff(this.start_time)).asMinutes());
  return this.points/timeSinceStart;
}

Stats.prototype.up = function(){
  this.points++;
  if(this.points == this.threshold*this.level){
    this.level++;
    this.emitter.emit(LEVEL_UP_EVENT);
  }
}

Stats.prototype.reset = function(){
  this.level = 1;
  this.points = 0;
  this.start_time = moment();
}

Stats.prototype.summary = function(){
  return {
    points: this.points,
    level: this.level
  }
}

module.exports = function(config){
  return new Stats(config);
}
